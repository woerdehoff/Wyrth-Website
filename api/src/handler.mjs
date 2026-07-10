import { createPublicKey, createVerify, createHmac, createHash, timingSafeEqual, randomUUID } from 'node:crypto'
import * as storage from './adapters/s3.mjs'
import * as db from './adapters/dynamodb.mjs'
import { sendMagicLinkEmail } from './adapters/email.mjs'
import * as security from './security.mjs'

let _event = null
function cors() { return security.corsHeaders(_event) }

const TENANT_ID             = process.env.ENTRA_TENANT_ID
const CLIENT_ID             = process.env.ENTRA_CLIENT_ID
const STRIPE_SECRET_KEY     = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const SITE_URL              = process.env.SITE_URL
const GOOGLE_CLIENT_ID      = process.env.GOOGLE_CLIENT_ID
const MAIL_FROM             = process.env.MAIL_FROM || process.env.SES_FROM_EMAIL || ''
const JWT_SECRET            = process.env.JWT_SECRET || ''

// Admin allowlist — Entra tokens are only accepted for users on this list.
// Set ADMIN_EMAILS as a comma-separated list of preferred_username / email / upn values.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
)

const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_UPLOAD_EXTS  = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

let entraJwksCache = null, entraJwksCacheTime = 0
let googleJwksCache = null, googleJwksCacheTime = 0
const JWKS_TTL = 3_600_000

function signHs256Jwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig    = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

function verifyHs256Jwt(token) {
  if (!JWT_SECRET) throw new Error('Magic link not configured')
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed JWT')
  const expected = createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url')
  const expBuf = Buffer.from(expected)
  const actBuf = Buffer.from(parts[2])
  if (expBuf.length !== actBuf.length || !timingSafeEqual(expBuf, actBuf)) throw new Error('Invalid signature')
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired')
  return payload
}

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

async function verifyRS256(token, getJwks, { audience, issuer }) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed JWT')
  const header  = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  if (header.alg !== 'RS256') throw new Error('Unexpected algorithm')
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) throw new Error('Token expired')
  if (payload.nbf && payload.nbf > now + 60) throw new Error('Token not yet valid')
  if (audience && payload.aud !== audience) throw new Error('Invalid audience')
  if (issuer) {
    const issuers = Array.isArray(issuer) ? issuer : [issuer]
    if (!issuers.includes(payload.iss)) throw new Error('Invalid issuer')
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
  const payload = await verifyRS256(authHeader.slice(7), getEntraJwks, {
    audience: CLIENT_ID,
    issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
  })
  // Fail secure: without an allowlist a valid tenant token would otherwise grant admin.
  if (ADMIN_EMAILS.size === 0) throw new Error('Admin allowlist not configured')
  const email = String(payload.preferred_username || payload.email || payload.upn || '').toLowerCase()
  if (!email || !ADMIN_EMAILS.has(email)) throw new Error('Not authorized')
  return payload
}

async function verifyGoogleToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing bearer token')
  return verifyRS256(authHeader.slice(7), getGoogleJwks, {
    audience: GOOGLE_CLIENT_ID,
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
  })
}

async function verifyCustomerToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing bearer token')
  const token = authHeader.slice(7)
  const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'))
  if (header.alg === 'HS256') return verifyHs256Jwt(token)
  return verifyGoogleToken(authHeader)
}

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

function isSafeLinkUrl(str) {
  if (typeof str !== 'string' || str === '') return true
  if (str.startsWith('/')) return true
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:'
  } catch { return false }
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

async function handleGetContent() {
  const body = await storage.getContentJson()
  if (!body) return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: 'No content saved yet' }) }
  return { statusCode: 200, headers: { ...cors(), 'Content-Type': 'application/json' }, body }
}

async function handlePostContent(event) {
  try { await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }
  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Invalid JSON' }) }
  }
  if (!body.content || typeof body.content !== 'object') {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Missing content' }) }
  }
  if (!isSafeLinkUrl(body.content.announcement?.link)) {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'announcement.link must be http(s), mailto, or a site-relative path' }) }
  }
  await storage.putContentJson(body.content)
  return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) }
}

async function handleGetProducts() {
  const products = await db.scanContainer('products', { active: true })
  return { statusCode: 200, headers: { ...cors(), 'Content-Type': 'application/json' }, body: JSON.stringify({ products }) }
}

async function handleGetAllProducts(event) {
  try { await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }
  const products = await db.scanContainer('products')
  return { statusCode: 200, headers: { ...cors(), 'Content-Type': 'application/json' }, body: JSON.stringify({ products }) }
}

async function handleUpsertProduct(event) {
  try { await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }
  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Invalid JSON' }) }
  }
  const { productId, name, description, priceInCents, imageUrl, active } = body
  if (!productId || !name || !priceInCents) {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'productId, name, and priceInCents are required' }) }
  }
  const safeId = String(productId).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64)
  await db.putDoc('products', 'productId', {
    productId: safeId, name: String(name).slice(0, 200),
    description: String(description || '').slice(0, 1000),
    priceInCents: Math.max(1, Math.round(Number(priceInCents))),
    imageUrl: String(imageUrl || '').slice(0, 500),
    active: active !== false, createdAt: new Date().toISOString(),
  })
  return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true, productId: safeId }) }
}

async function handleDeleteProduct(event) {
  try { await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }
  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Invalid JSON' }) }
  }
  if (!body.productId) return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'productId is required' }) }
  await db.deleteDoc('products', 'productId', String(body.productId))
  return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) }
}

async function handleCheckout(event) {
  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Invalid JSON' }) }
  }
  let lineItemsInput
  if (Array.isArray(body.items) && body.items.length > 0) {
    lineItemsInput = body.items.map(i => ({
      productId: String(i.productId || '').slice(0, 64),
      quantity:  Math.max(1, Math.min(10, Math.round(Number(i.quantity || 1)))),
    })).filter(i => i.productId)
  } else if (body.productId) {
    lineItemsInput = [{ productId: String(body.productId).slice(0, 64), quantity: Math.max(1, Math.min(10, Math.round(Number(body.quantity || 1)))) }]
  } else {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'items array or productId is required' }) }
  }
  if (!lineItemsInput.length) return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'No valid items' }) }
  if (!STRIPE_SECRET_KEY) return { statusCode: 200, headers: cors(), body: JSON.stringify({ url: `${SITE_URL}/shop` }) }

  const params = {
    mode: 'payment',
    success_url: `${SITE_URL}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${SITE_URL}/shop/cancel`,
    customer_creation: 'always',
    billing_address_collection: 'auto',
    'shipping_address_collection[allowed_countries][0]': 'US',
  }

  for (let i = 0; i < lineItemsInput.length; i++) {
    const item = lineItemsInput[i]
    const product = await db.getDoc('products', 'productId', item.productId)
    if (!product) return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: `Product not found: ${item.productId}` }) }
    if (!product.active) return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: `Product unavailable: ${product.name}` }) }
    params[`line_items[${i}][quantity]`] = String(item.quantity)
    params[`line_items[${i}][price_data][currency]`] = 'usd'
    params[`line_items[${i}][price_data][unit_amount]`] = String(product.priceInCents)
    params[`line_items[${i}][price_data][product_data][name]`] = product.name
    params[`line_items[${i}][price_data][product_data][description]`] = product.description || ''
    if (product.imageUrl) params[`line_items[${i}][price_data][product_data][images][0]`] = product.imageUrl
  }
  params['metadata[productIds]'] = lineItemsInput.map(i => i.productId).join(',').slice(0, 500)
  const session = await stripePost('/v1/checkout/sessions', params)
  return { statusCode: 200, headers: cors(), body: JSON.stringify({ url: session.url }) }
}

async function handleWebhook(event) {
  const rawBody   = event.body || ''
  const sigHeader = event.headers?.['stripe-signature'] || event.headers?.['Stripe-Signature']
  try { verifyStripeSignature(rawBody, sigHeader) }
  catch (err) { return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: err.message }) } }
  let stripeEvent
  try { stripeEvent = JSON.parse(rawBody) } catch {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Invalid JSON' }) }
  }
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object
    await db.putDoc('orders', 'orderId', {
      orderId: session.id, customerEmail: session.customer_details?.email || '',
      customerName: session.customer_details?.name || '',
      productId: session.metadata?.productIds || session.metadata?.productId || '',
      amountTotal: session.amount_total || 0, currency: session.currency || 'usd', status: 'paid',
      shippingAddress: JSON.stringify(session.shipping_details?.address || {}),
      createdAt: new Date().toISOString(),
    })
  }
  return { statusCode: 200, headers: cors(), body: JSON.stringify({ received: true }) }
}

async function handleGetOrders(event) {
  try { await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }
  const orders = (await db.scanContainer('orders')).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return { statusCode: 200, headers: { ...cors(), 'Content-Type': 'application/json' }, body: JSON.stringify({ orders }) }
}

async function handleGetCart(event) {
  let user
  try { user = await verifyCustomerToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }
  const cart = await db.getDoc('carts', 'userId', user.sub)
  const items = cart ? JSON.parse(cart.items || '[]') : []
  return { statusCode: 200, headers: { ...cors(), 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) }
}

async function handleSaveCart(event) {
  let user
  try { user = await verifyCustomerToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }
  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Invalid JSON' }) }
  }
  if (!Array.isArray(body.items)) return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'items must be an array' }) }
  const clean = body.items.map(i => ({
    productId: String(i.productId || '').slice(0, 64),
    name: String(i.name || '').slice(0, 200),
    priceInCents: Math.max(0, Math.round(Number(i.priceInCents || 0))),
    imageUrl: String(i.imageUrl || '').slice(0, 500),
    quantity: Math.max(1, Math.min(99, Math.round(Number(i.quantity || 1)))),
  })).filter(i => i.productId)
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30
  await db.putDoc('carts', 'userId', {
    userId: user.sub, email: user.email || '', items: JSON.stringify(clean),
    updatedAt: new Date().toISOString(), expiresAt, ttl: expiresAt,
  })
  return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) }
}

async function handleUploadUrl(event) {
  try { await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }
  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Invalid JSON' }) }
  }
  const ext = String(body.ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)
  const contentType = String(body.contentType || 'image/jpeg').toLowerCase().slice(0, 100)
  if (!ALLOWED_UPLOAD_EXTS.has(ext) || !ALLOWED_UPLOAD_TYPES.has(contentType)) {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Only image uploads (jpg, jpeg, png, webp, gif) are allowed' }) }
  }
  const { uploadUrl, publicUrl } = await storage.createUploadUrl(ext, contentType)
  return { statusCode: 200, headers: cors(), body: JSON.stringify({ uploadUrl, publicUrl }) }
}

async function handleTrack(event) {
  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Invalid JSON' }) }
  }
  const page = String(body.page || '/').slice(0, 200)
  if (!page.startsWith('/')) return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Invalid page' }) }
  if (page.startsWith('/admin')) return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) }
  const today = new Date().toISOString().slice(0, 10)
  const ttl = Math.floor(Date.now() / 1000) + 90 * 86400
  const ip = event.requestContext?.http?.sourceIp || 'unknown'
  const visitorHash = createHash('sha256').update(ip + today).digest('hex').slice(0, 16)
  await db.trackPageView(page, visitorHash, ttl)
  return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) }
}

async function handleGetAnalytics(event) {
  try { await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization) }
  catch (err) { return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) } }
  const days = Math.min(90, Math.max(1, Number(event.queryStringParameters?.days) || 30))
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = now.toISOString().slice(0, 10)

  const dailyRows = await db.queryByPk('analytics', 'DAILY', startStr, endStr)
  const daily = dailyRows.map(r => ({
    date: r.sk, views: r.views || 0, visitors: r.visitors || 0,
  })).sort((a, b) => a.date.localeCompare(b.date))

  const pageRows = await db.queryByPk('analytics', 'PAGE', startStr, `${endStr}~`)
  const pageMap = {}
  for (const r of pageRows) {
    const page = r.sk.split('#').slice(1).join('#')
    pageMap[page] = (pageMap[page] || 0) + (r.views || 0)
  }
  const pages = Object.entries(pageMap).map(([page, views]) => ({ page, views })).sort((a, b) => b.views - a.views)
  return { statusCode: 200, headers: { ...cors(), 'Content-Type': 'application/json' }, body: JSON.stringify({ daily, pages }) }
}

async function handleMagicLinkSend(event) {
  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Invalid JSON' }) }
  }
  const email = (body.email || '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Valid email required' }) }
  }
  for (const blocked of [
    await security.enforceRateLimit(event, 'magic-ip', security.getClientIp(event), 5, 3600),
    await security.enforceRateLimit(event, 'magic-email', email, 3, 3600),
  ]) {
    if (blocked) return blocked
  }
  // SES: MAIL_FROM (or SES_FROM_EMAIL) must be a verified identity; JWT signs the session.
  if (!MAIL_FROM || !JWT_SECRET) {
    return { statusCode: 503, headers: cors(), body: JSON.stringify({ error: 'Magic link not configured' }) }
  }
  const token = randomUUID()
  const ttl   = Math.floor(Date.now() / 1000) + 900
  await db.putDoc('magic-tokens', 'token', { token, email, ttl })
  const link = `${SITE_URL}/auth/verify?token=${token}`
  const text = `Click the link below to sign in to Wyrth. This link expires in 15 minutes.\n\n${link}\n\nIf you did not request this, you can safely ignore this email.`
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:40px auto;color:#111"><h2 style="margin-bottom:8px">Sign in to Wyrth</h2><p>Click the button below to sign in. This link expires in <strong>15 minutes</strong>.</p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;font-weight:600">Sign in to Wyrth</a><p style="color:#666;font-size:13px;margin-top:24px">If you did not request this email, you can safely ignore it.</p></body></html>`
  try {
    await sendMagicLinkEmail({ to: email, subject: 'Sign in to Wyrth', text, html })
  } catch (err) {
    console.error('SES send failed:', err)
    return { statusCode: 503, headers: cors(), body: JSON.stringify({ error: 'Could not send sign-in email. Please try again later.' }) }
  }
  return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) }
}

async function handleMagicLinkVerify(event) {
  const token = event.queryStringParameters?.token || ''
  if (!token) return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Token required' }) }
  if (!JWT_SECRET) return { statusCode: 503, headers: cors(), body: JSON.stringify({ error: 'Magic link not configured' }) }
  const item = await db.getDoc('magic-tokens', 'token', token)
  if (!item) return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: 'Invalid or expired link' }) }
  if (item.ttl < Math.floor(Date.now() / 1000)) {
    return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: 'Link expired' }) }
  }
  await db.deleteDoc('magic-tokens', 'token', token)
  const now = Math.floor(Date.now() / 1000)
  const jwt = signHs256Jwt({ sub: item.email, email: item.email, name: '', iat: now, exp: now + 30 * 24 * 60 * 60 })
  return { statusCode: 200, headers: cors(), body: JSON.stringify({ jwt }) }
}

export async function route(event) {
  _event = event
  const method = event.requestContext?.http?.method
  const path   = event.requestContext?.http?.path || '/'

  if (method === 'OPTIONS') {
    const origin = event.headers?.origin || event.headers?.Origin
    if (!origin || security.isAllowedBrowserRequest(event)) {
      return { statusCode: 204, headers: cors(), body: '' }
    }
    return { statusCode: 403, headers: {}, body: '' }
  }

  const ip = security.getClientIp(event)

  try {
    // Browser-only public write endpoints (blocks direct curl/scripts)
    if (path === '/auth/magic/send' && method === 'POST') {
      const denied = security.requireBrowser(event)
      if (denied) return denied
    }
    if (path === '/analytics/track' && method === 'POST') {
      const denied = security.requireBrowser(event)
      if (denied) return denied
      const limited = await security.enforceRateLimit(event, 'track-ip', ip, 120, 60)
      if (limited) return limited
    }
    if (path === '/shop/checkout' && method === 'POST') {
      const denied = security.requireBrowser(event)
      if (denied) return denied
      const limited = await security.enforceRateLimit(event, 'checkout-ip', ip, 20, 3600)
      if (limited) return limited
    }
    if (path === '/auth/magic/verify' && method === 'GET') {
      const limited = await security.enforceRateLimit(event, 'verify-ip', ip, 30, 3600)
      if (limited) return limited
    }
    if ((path === '/content' || path === '/shop/products') && method === 'GET') {
      const limited = await security.enforceRateLimit(event, 'read-ip', ip, 300, 60)
      if (limited) return limited
    }
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
    if (path === '/shop/orders'     && method === 'GET')  return await handleGetOrders(event)
    if (path === '/shop/cart') {
      if (method === 'GET')  return await handleGetCart(event)
      if (method === 'POST') return await handleSaveCart(event)
    }
    if (path === '/analytics/track' && method === 'POST') return await handleTrack(event)
    if (path === '/analytics'       && method === 'GET')  return await handleGetAnalytics(event)
    if (path === '/auth/magic/send'   && method === 'POST') return await handleMagicLinkSend(event)
    if (path === '/auth/magic/verify' && method === 'GET')  return await handleMagicLinkVerify(event)
    return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: 'Not found' }) }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: 'Internal server error' }) }
  }
}