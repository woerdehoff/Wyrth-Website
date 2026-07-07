import * as db from './adapters/cosmos.mjs'

const ALLOWED_ORIGINS = buildAllowedOrigins()

function buildAllowedOrigins() {
  const set = new Set()
  for (const raw of [process.env.SITE_URL, process.env.ALLOWED_ORIGINS]) {
    if (!raw) continue
    for (const part of raw.split(',')) {
      const v = part.trim()
      if (!v) continue
      try { set.add(new URL(v).origin) } catch { set.add(v) }
    }
  }
  if (process.env.STORAGE_CDN_HOST) {
    set.add(`https://${process.env.STORAGE_CDN_HOST}`)
  }
  set.add('http://localhost:5173')
  set.add('http://localhost:4173')
  return set
}

export function corsHeaders(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin || ''
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options':       'nosniff',
    'Vary':                         'Origin',
  }
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

export function getClientIp(event) {
  return event.requestContext?.http?.sourceIp
    || event.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || event.headers?.['X-Forwarded-For']?.split(',')[0]?.trim()
    || 'unknown'
}

function originFromReferer(referer) {
  try { return new URL(referer).origin } catch { return '' }
}

export function isAllowedBrowserRequest(event) {
  const origin = event.headers?.origin || event.headers?.Origin
  if (origin && ALLOWED_ORIGINS.has(origin)) return true
  const referer = event.headers?.referer || event.headers?.Referer
  if (referer && ALLOWED_ORIGINS.has(originFromReferer(referer))) return true
  return false
}

export function denyForbidden(event) {
  return {
    statusCode: 403,
    headers: corsHeaders(event),
    body: JSON.stringify({ error: 'Forbidden' }),
  }
}

export function denyTooMany(event) {
  return {
    statusCode: 429,
    headers: corsHeaders(event),
    body: JSON.stringify({ error: 'Too many requests. Please try again later.' }),
  }
}

export async function enforceRateLimit(event, bucket, id, limit, windowSeconds) {
  const ok = await db.rateLimit(bucket, id, limit, windowSeconds)
  return ok ? null : denyTooMany(event)
}

export function requireBrowser(event) {
  return isAllowedBrowserRequest(event) ? null : denyForbidden(event)
}