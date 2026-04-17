import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront'
import { DynamoDBClient, PutItemCommand, GetItemCommand, DeleteItemCommand, ScanCommand, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { createPublicKey, createVerify, createHmac, createHash, timingSafeEqual, randomUUID } from 'node:crypto'

const s3  = new S3Client({})
const cf  = new CloudFrontClient({ region: 'us-east-1' })
const ddb = new DynamoDBClient({})

const BUCKET                = process.env.BUCKET_NAME
const DISTRIBUTION_ID       = process.env.CLOUDFRONT_DISTRIBUTION_ID
const TENANT_ID             = process.env.ENTRA_TENANT_ID
const CLIENT_ID             = process.env.ENTRA_CLIENT_ID
const STRIPE_SECRET_KEY     = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const PRODUCTS_TABLE        = process.env.PRODUCTS_TABLE
const ORDERS_TABLE          = process.env.ORDERS_TABLE
const CARTS_TABLE           = process.env.CARTS_TABLE
const ANALYTICS_TABLE       = process.env.ANALYTICS_TABLE
const SITE_URL              = process.env.SITE_URL
const GOOGLE_CLIENT_ID      = process.env.GOOGLE_CLIENT_ID

// ── JWKS caches ───────────────────────────────────────────────────────
let entraJwksCache     = null, entraJwksCacheTime = 0
let googleJwksCache    = null, googleJwksCacheTime = 0
const JWKS_TTL = 3_600_000

async function getEntraJwks() {
  if (entraJwksCache && (Date.now() - entraJwksCacheTime) < JWKS_TTL) return entraJwksCache
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`)
  if (!res.ok) throw new Error('Failed to fetch Entra JWKS')
  const data = await res.json()
  entraJwksCache = data.keys; entraJwksCacheTime = Date.now()
  return entraJwksCache
}

async function getGoogleJwks() {
  if (googleJwksCache && (Date.now() - googleJwksCacheTime) < JWKS_TTL) return googleJwksCache
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs')
  if (!res.ok) throw new Error('Failed to fetch Google JWKS')
  const data = await res.json()
  googleJwksCache = data.keys; googleJwksCacheTime = Date.now()
  return googleJwksCache
}

// ── Generic RS256 JWT verifier ────────────────────────────────────────
async function verifyRS256(token, getJwks, { audience, issuer }) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed JWT')

  const header  = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))

  if (header.alg !== 'RS256') throw new Error('Unexpected algorithm')

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now)       throw new Error('Token expired')
  if (payload.nbf && payload.nbf > now + 60)  throw new Error('Token not yet valid')
  if (audience && payload.aud !== audience)   throw new Error('Invalid audience')
  if (issuer) {
    const issuers = Array.isArray(issuer) ? issuer : [issuer]
    if (!issuers.includes(payload.iss))       throw new Error('Invalid issuer')
  }

  const keys = await getJwks()
  const jwk  = keys.find(k => k.kid === header.kid && k.kty === 'RSA')
  if (!jwk) throw new Error('Signing key not found')

  const publicKey = createPublicKey({ key: jwk, format: 'jwk' })
  const verifier  = createVerify('RSA-SHA256')
  verifier.update(Buffer.from(`${parts[0]}.${parts[1]}`))
  if (!verifier.verify(publicKey, Buffer.from(parts[2], 'base64url'))) throw new Error('Invalid signature')

  return payload
}

async function verifyEntraToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing bearer token')
  return verifyRS256(authHeader.slice(7), getEntraJwks, {
    audience: CLIENT_ID,
    issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
  })
}

async function verifyGoogleToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing bearer token')
  return verifyRS256(authHeader.slice(7), getGoogleJwks, {
    audience: GOOGLE_CLIENT_ID,
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
  })
}

// ── CORS headers ─────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ── DynamoDB helpers ─────────────────────────────────────────────────
function marshal(obj) {
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    if (typeof v === 'string')        result[k] = { S: v }
    else if (typeof v === 'number')   result[k] = { N: String(v) }
    else if (typeof v === 'boolean')  result[k] = { BOOL: v }
    else if (typeof v === 'object')   result[k] = { S: JSON.stringify(v) }
  }
  return result
}

function unmarshal(item) {
  const result = {}
  for (const [k, v] of Object.entries(item)) {
    if (v.S    !== undefined) result[k] = v.S
    else if (v.N    !== undefined) result[k] = Number(v.N)
    else if (v.BOOL !== undefined) result[k] = v.BOOL
  }
  return result
}

// ── Stripe helpers ────────────────────────────────────────────────────
function stripeAuth() {
  return 'Basic ' + Buffer.from(`${STRIPE_SECRET_KEY}:`).toString('base64')
}

async function stripePost(path, params) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: { Authorization: stripeAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Stripe error')
  return data
}

function verifyStripeSignature(rawBody, header) {
  if (!header) throw new Error('Missing Stripe-Signature header')
  const t  = header.match(/t=(\d+)/)?.[1]
  const v1 = header.match(/v1=([a-f0-9]+)/)?.[1]
  if (!t || !v1) throw new Error('Invalid Stripe-Signature header')
  const expected = createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(`${t}.${rawBody}`).digest('hex')
  const bufA = Buffer.from(v1, 'hex'), bufB = Buffer.from(expected, 'hex')
  if (bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) throw new Error('Invalid webhook signature')
  if (Math.floor(Date.now() / 1000) - Number(t) > 300) throw new Error('Webhook replay: timestamp too old')
}

// ── Route: GET /content ───────────────────────────────────────────────
async function handleGetContent() {
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: 'content.json' }))
    const body   = await result.Body.transformToString()
    return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body }
  } catch (err) {
    if (err.name === 'NoSuchKey') {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'No content saved yet' }) }
    }
    throw err
  }
}

// ── Route: POST /content ──────────────────────────────────────────────
async function handlePostContent(event) {
  try { await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }

  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { content } = body
  if (!content || typeof content !== 'object') {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing content' }) }
  }

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: 'content.json',
    Body: JSON.stringify(content), ContentType: 'application/json', CacheControl: 'public, max-age=60',
  }))
  await cf.send(new CreateInvalidationCommand({
    DistributionId: DISTRIBUTION_ID,
    InvalidationBatch: { CallerReference: Date.now().toString(), Paths: { Quantity: 1, Items: ['/content.json'] } },
  }))
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
}

// ── Route: GET /shop/products ─────────────────────────────────────────
async function handleGetProducts() {
  const result = await ddb.send(new ScanCommand({
    TableName: PRODUCTS_TABLE,
    FilterExpression: 'active = :t',
    ExpressionAttributeValues: { ':t': { BOOL: true } },
  }))
  const products = (result.Items || []).map(unmarshal)
  return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ products }) }
}

// ── Route: GET /shop/products/all (admin) ─────────────────────────────
async function handleGetAllProducts(event) {
  try { await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }
  const result = await ddb.send(new ScanCommand({ TableName: PRODUCTS_TABLE }))
  return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ products: (result.Items || []).map(unmarshal) }) }
}

// ── Route: POST /shop/products (admin) ───────────────────────────────
async function handleUpsertProduct(event) {
  try { await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }

  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { productId, name, description, priceInCents, imageUrl, active } = body
  if (!productId || !name || !priceInCents) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'productId, name, and priceInCents are required' }) }
  }

  const safeId = String(productId).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64)
  await ddb.send(new PutItemCommand({
    TableName: PRODUCTS_TABLE,
    Item: marshal({
      productId: safeId, name: String(name).slice(0, 200),
      description: String(description || '').slice(0, 1000),
      priceInCents: Math.max(1, Math.round(Number(priceInCents))),
      imageUrl: String(imageUrl || '').slice(0, 500),
      active: active !== false, createdAt: new Date().toISOString(),
    }),
  }))
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, productId: safeId }) }
}

// ── Route: POST /shop/products/delete (admin) ─────────────────────────
async function handleDeleteProduct(event) {
  try { await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }

  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  if (!body.productId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'productId is required' }) }
  await ddb.send(new DeleteItemCommand({ TableName: PRODUCTS_TABLE, Key: { productId: { S: String(body.productId) } } }))
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
}

// ── Route: POST /shop/checkout ────────────────────────────────────────
async function handleCheckout(event) {
  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  // Accept a cart items array  OR  a legacy single productId+quantity
  let lineItemsInput
  if (Array.isArray(body.items) && body.items.length > 0) {
    lineItemsInput = body.items
      .map(i => ({
        productId: String(i.productId || '').slice(0, 64),
        quantity:  Math.max(1, Math.min(10, Math.round(Number(i.quantity || 1)))),
      }))
      .filter(i => i.productId)
  } else if (body.productId) {
    lineItemsInput = [{
      productId: String(body.productId).slice(0, 64),
      quantity:  Math.max(1, Math.min(10, Math.round(Number(body.quantity || 1)))),
    }]
  } else {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'items array or productId is required' }) }
  }

  if (lineItemsInput.length === 0) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'No valid items' }) }
  }

  // No Stripe key — fall back to Shopify
  if (!STRIPE_SECRET_KEY) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ url: `${SITE_URL}/shop` }) }
  }

  // Look up authoritative prices from DynamoDB (prevents client-side price tampering)
  const productResults = await Promise.all(
    lineItemsInput.map(i =>
      ddb.send(new GetItemCommand({ TableName: PRODUCTS_TABLE, Key: { productId: { S: i.productId } } }))
    )
  )

  const params = {
    'mode': 'payment',
    'success_url': `${SITE_URL}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
    'cancel_url':  `${SITE_URL}/shop/cancel`,
    'customer_creation': 'always',
    'billing_address_collection': 'auto',
    'shipping_address_collection[allowed_countries][0]': 'US',
  }

  for (let i = 0; i < lineItemsInput.length; i++) {
    const item    = lineItemsInput[i]
    const result  = productResults[i]
    if (!result.Item) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: `Product not found: ${item.productId}` }) }
    const product = unmarshal(result.Item)
    if (!product.active) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: `Product unavailable: ${product.name}` }) }

    params[`line_items[${i}][quantity]`]                              = String(item.quantity)
    params[`line_items[${i}][price_data][currency]`]                  = 'usd'
    params[`line_items[${i}][price_data][unit_amount]`]               = String(product.priceInCents)
    params[`line_items[${i}][price_data][product_data][name]`]        = product.name
    params[`line_items[${i}][price_data][product_data][description]`] = product.description || ''
    if (product.imageUrl) params[`line_items[${i}][price_data][product_data][images][0]`] = product.imageUrl
  }

  params['metadata[productIds]'] = lineItemsInput.map(i => i.productId).join(',').slice(0, 500)

  const session = await stripePost('/v1/checkout/sessions', params)
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ url: session.url }) }
}

// ── Route: POST /shop/webhook ─────────────────────────────────────────
async function handleWebhook(event) {
  const rawBody   = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : (event.body || '')
  const sigHeader = event.headers?.['stripe-signature'] || event.headers?.['Stripe-Signature']

  try { verifyStripeSignature(rawBody, sigHeader) }
  catch (err) { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: err.message }) } }

  let stripeEvent
  try { stripeEvent = JSON.parse(rawBody) } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object
    await ddb.send(new PutItemCommand({
      TableName: ORDERS_TABLE,
      Item: marshal({
        orderId: session.id, customerEmail: session.customer_details?.email || '',
        customerName: session.customer_details?.name || '',
        productId: session.metadata?.productIds || session.metadata?.productId || '',
        amountTotal: session.amount_total || 0, currency: session.currency || 'usd', status: 'paid',
        shippingAddress: JSON.stringify(session.shipping_details?.address || {}),
        createdAt: new Date().toISOString(),
      }),
    }))
  }

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ received: true }) }
}

// ── Route: GET /shop/orders (admin) ──────────────────────────────────
async function handleGetOrders(event) {
  try { await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }

  const result = await ddb.send(new ScanCommand({ TableName: ORDERS_TABLE }))
  const orders = (result.Items || []).map(unmarshal).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ orders }) }
}

// ── Route: GET /shop/cart ─────────────────────────────────────────────
async function handleGetCart(event) {
  let user
  try { user = await verifyGoogleToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }

  const result = await ddb.send(new GetItemCommand({ TableName: CARTS_TABLE, Key: { userId: { S: user.sub } } }))
  if (!result.Item) return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [] }) }

  const cart  = unmarshal(result.Item)
  const items = JSON.parse(cart.items || '[]')
  return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) }
}

// ── Route: POST /shop/cart ────────────────────────────────────────────
async function handleSaveCart(event) {
  let user
  try { user = await verifyGoogleToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }

  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { items } = body
  if (!Array.isArray(items)) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'items must be an array' }) }

  // Sanitize: only keep known scalar fields, clamp quantity
  const clean = items.map(i => ({
    productId:    String(i.productId    || '').slice(0, 64),
    name:         String(i.name         || '').slice(0, 200),
    priceInCents: Math.max(0, Math.round(Number(i.priceInCents || 0))),
    imageUrl:     String(i.imageUrl     || '').slice(0, 500),
    quantity:     Math.max(1, Math.min(99, Math.round(Number(i.quantity || 1)))),
  })).filter(i => i.productId)

  // TTL: 30 days
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30

  await ddb.send(new PutItemCommand({
    TableName: CARTS_TABLE,
    Item: marshal({ userId: user.sub, email: user.email || '', items: JSON.stringify(clean), updatedAt: new Date().toISOString(), expiresAt }),
  }))

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
}

// ── Image upload (presigned URL) ──────────────────────────────────────
async function handleUploadUrl(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization
  await verifyEntraToken(auth)

  const body = JSON.parse(event.body || '{}')
  const ext = (body.ext || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 10)
  const contentType = (body.contentType || 'image/jpeg').slice(0, 100)

  const key = `uploads/${randomUUID()}.${ext}`

  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  }), { expiresIn: 300 })

  // Public URL through CloudFront
  const publicUrl = `https://${process.env.CLOUDFRONT_DOMAIN || ''}/${key}`

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ uploadUrl, publicUrl }),
  }
}

// ── Route: POST /analytics/track ──────────────────────────────────────
async function handleTrack(event) {
  if (!ANALYTICS_TABLE) return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }

  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const page = String(body.page || '/').slice(0, 200)
  if (!page.startsWith('/')) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid page' }) }
  if (page.startsWith('/admin')) return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }

  const today = new Date().toISOString().slice(0, 10)
  const ttl = Math.floor(Date.now() / 1000) + 90 * 86400

  const ip = event.requestContext?.http?.sourceIp || 'unknown'
  const visitorHash = createHash('sha256').update(ip + today).digest('hex').slice(0, 16)

  // Increment page views
  await ddb.send(new UpdateItemCommand({
    TableName: ANALYTICS_TABLE,
    Key: { pk: { S: 'PAGE' }, sk: { S: `${today}#${page}` } },
    UpdateExpression: 'ADD #v :one SET #ttl = :ttl',
    ExpressionAttributeNames: { '#v': 'views', '#ttl': 'ttl' },
    ExpressionAttributeValues: { ':one': { N: '1' }, ':ttl': { N: String(ttl) } },
  }))

  // Increment daily total
  await ddb.send(new UpdateItemCommand({
    TableName: ANALYTICS_TABLE,
    Key: { pk: { S: 'DAILY' }, sk: { S: today } },
    UpdateExpression: 'ADD #v :one SET #ttl = :ttl',
    ExpressionAttributeNames: { '#v': 'views', '#ttl': 'ttl' },
    ExpressionAttributeValues: { ':one': { N: '1' }, ':ttl': { N: String(ttl) } },
  }))

  // Track unique visitor
  try {
    await ddb.send(new PutItemCommand({
      TableName: ANALYTICS_TABLE,
      Item: { pk: { S: `VIS#${today}` }, sk: { S: visitorHash }, ttl: { N: String(ttl) } },
      ConditionExpression: 'attribute_not_exists(pk)',
    }))
    await ddb.send(new UpdateItemCommand({
      TableName: ANALYTICS_TABLE,
      Key: { pk: { S: 'DAILY' }, sk: { S: today } },
      UpdateExpression: 'ADD #vis :one',
      ExpressionAttributeNames: { '#vis': 'visitors' },
      ExpressionAttributeValues: { ':one': { N: '1' } },
    }))
  } catch (err) {
    if (err.name !== 'ConditionalCheckFailedException') throw err
  }

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
}

// ── Route: GET /analytics ─────────────────────────────────────────────
async function handleGetAnalytics(event) {
  try { await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }

  if (!ANALYTICS_TABLE) {
    return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ daily: [], pages: [] }) }
  }

  const days = Math.min(90, Math.max(1, Number(event.queryStringParameters?.days) || 30))
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = now.toISOString().slice(0, 10)

  const dailyResult = await ddb.send(new QueryCommand({
    TableName: ANALYTICS_TABLE,
    KeyConditionExpression: 'pk = :pk AND sk BETWEEN :s AND :e',
    ExpressionAttributeValues: { ':pk': { S: 'DAILY' }, ':s': { S: startStr }, ':e': { S: endStr } },
  }))

  const daily = (dailyResult.Items || []).map(item => ({
    date: item.sk.S,
    views: Number(item.views?.N || 0),
    visitors: Number(item.visitors?.N || 0),
  })).sort((a, b) => a.date.localeCompare(b.date))

  const pageResult = await ddb.send(new QueryCommand({
    TableName: ANALYTICS_TABLE,
    KeyConditionExpression: 'pk = :pk AND sk BETWEEN :s AND :e',
    ExpressionAttributeValues: { ':pk': { S: 'PAGE' }, ':s': { S: startStr }, ':e': { S: `${endStr}~` } },
  }))

  const pageMap = {}
  for (const item of (pageResult.Items || [])) {
    const page = item.sk.S.split('#').slice(1).join('#')
    pageMap[page] = (pageMap[page] || 0) + Number(item.views?.N || 0)
  }
  const pages = Object.entries(pageMap)
    .map(([page, views]) => ({ page, views }))
    .sort((a, b) => b.views - a.views)

  return {
    statusCode: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ daily, pages }),
  }
}

// ── Main handler ──────────────────────────────────────────────────────
export const handler = async (event) => {
  const method = event.requestContext?.http?.method
  const path   = event.requestContext?.http?.path || '/'

  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  try {
    if (path === '/content') {
      if (method === 'GET')  return await handleGetContent()
      if (method === 'POST') return await handlePostContent(event)
    }

    if (path === '/shop/products/all'    && method === 'GET')  return await handleGetAllProducts(event)
    if (path === '/shop/products/delete' && method === 'POST') return await handleDeleteProduct(event)
    if (path === '/shop/products') {
      if (method === 'GET')  return await handleGetProducts()
      if (method === 'POST') return await handleUpsertProduct(event)
    }
    if (path === '/shop/checkout'    && method === 'POST') return await handleCheckout(event)
    if (path === '/shop/upload-url' && method === 'POST') return await handleUploadUrl(event)
    if (path === '/shop/webhook'    && method === 'POST') return await handleWebhook(event)
    if (path === '/shop/orders'   && method === 'GET')  return await handleGetOrders(event)
    if (path === '/shop/cart') {
      if (method === 'GET')  return await handleGetCart(event)
      if (method === 'POST') return await handleSaveCart(event)
    }

    if (path === '/analytics/track' && method === 'POST') return await handleTrack(event)
    if (path === '/analytics'       && method === 'GET')  return await handleGetAnalytics(event)

    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Not found' }) }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
