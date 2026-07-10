/**
 * AWS Lambda entry (API Gateway HTTP API payload format 2.0).
 * Reuses the same route() handler as the Azure Functions adapter.
 */
import { route } from './handler.mjs'

function normalizeHeaders(headers = {}) {
  const out = {}
  for (const [k, v] of Object.entries(headers)) {
    out[k] = v
    out[k.toLowerCase()] = v
  }
  return out
}

export async function handler(event) {
  const method = event.requestContext?.http?.method
    || event.requestContext?.httpMethod
    || event.httpMethod
    || 'GET'

  const path = event.rawPath
    || event.requestContext?.http?.path
    || event.path
    || '/'

  const normalized = {
    ...event,
    body: event.isBase64Encoded && event.body
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : (event.body ?? ''),
    headers: normalizeHeaders(event.headers),
    queryStringParameters: event.queryStringParameters || {},
    requestContext: {
      ...event.requestContext,
      http: {
        method,
        path,
        sourceIp: event.requestContext?.http?.sourceIp
          || event.requestContext?.identity?.sourceIp
          || '',
      },
    },
  }

  const result = await route(normalized)
  return {
    statusCode: result.statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...(result.headers || {}),
    },
    body: result.body ?? '',
  }
}
