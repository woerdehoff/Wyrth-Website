import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront'
import { createPublicKey, createVerify } from 'node:crypto'

const s3 = new S3Client({})
const cf = new CloudFrontClient({ region: 'us-east-1' })

const BUCKET          = process.env.BUCKET_NAME
const DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID
const TENANT_ID       = process.env.ENTRA_TENANT_ID
const CLIENT_ID       = process.env.ENTRA_CLIENT_ID

// ── JWKS cache (warm Lambda reuse) ───────────────────────────────────
let jwksCache     = null
let jwksCacheTime = 0
const JWKS_TTL    = 3_600_000 // 1 hour

async function getJwks() {
  if (jwksCache && (Date.now() - jwksCacheTime) < JWKS_TTL) return jwksCache
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`
  )
  if (!res.ok) throw new Error('Failed to fetch JWKS')
  const data = await res.json()
  jwksCache     = data.keys
  jwksCacheTime = Date.now()
  return jwksCache
}

// ── JWT validation (RS256, no external deps) ────────────────────────
async function verifyEntraToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing bearer token')
  const token = authHeader.slice(7)
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed JWT')

  const header  = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))

  if (header.alg !== 'RS256') throw new Error('Unexpected algorithm')

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now)        throw new Error('Token expired')
  if (payload.nbf && payload.nbf > now + 60)   throw new Error('Token not yet valid')
  if (payload.aud !== CLIENT_ID)                throw new Error('Invalid audience')

  const expectedIss = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`
  if (payload.iss !== expectedIss)              throw new Error('Invalid issuer')

  const keys = await getJwks()
  const jwk  = keys.find(k => k.kid === header.kid && k.kty === 'RSA')
  if (!jwk) throw new Error('Signing key not found')

  const publicKey = createPublicKey({ key: jwk, format: 'jwk' })
  const data      = Buffer.from(`${parts[0]}.${parts[1]}`)
  const sig       = Buffer.from(parts[2], 'base64url')

  const verifier = createVerify('RSA-SHA256')
  verifier.update(data)
  if (!verifier.verify(publicKey, sig)) throw new Error('Invalid signature')

  return payload
}

// ── CORS headers ─────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ── Handler ──────────────────────────────────────────────────────────
export const handler = async (event) => {
  const method = event.requestContext?.http?.method

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' }
  }

  // GET /content — return saved content.json (no auth required, public data)
  if (method === 'GET') {
    try {
      const result = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: 'content.json' }))
      const body   = await result.Body.transformToString()
      return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body }
    } catch (err) {
      if (err.name === 'NoSuchKey') {
        return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'No content saved yet' }) }
      }
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal error' }) }
    }
  }

  if (method !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // POST /content — verify Entra ID token, then save
  try {
    await verifyEntraToken(event.headers?.authorization ?? event.headers?.Authorization)
  } catch (err) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: `Unauthorized: ${err.message}` }) }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { content } = body
  if (!content || typeof content !== 'object') {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing content' }) }
  }

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         'content.json',
    Body:        JSON.stringify(content),
    ContentType: 'application/json',
    CacheControl: 'public, max-age=60',
  }))

  await cf.send(new CreateInvalidationCommand({
    DistributionId: DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: { Quantity: 1, Items: ['/content.json'] },
    },
  }))

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
}
