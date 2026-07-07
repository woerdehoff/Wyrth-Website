import { app } from '@azure/functions'
import { route } from '../handler.mjs'

function toEvent(request) {
  const url = new URL(request.url)
  const params = {}
  url.searchParams.forEach((v, k) => { params[k] = v })

  return {
    body: request.method === 'GET' || request.method === 'OPTIONS' ? '' : undefined,
    headers: Object.fromEntries(request.headers.entries()),
    queryStringParameters: params,
    requestContext: {
      http: {
        method: request.method,
        path:   url.pathname,
        sourceIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
      },
    },
  }
}

async function readBody(request, event) {
  if (request.method !== 'GET' && request.method !== 'OPTIONS') {
    event.body = await request.text()
  }
}

app.http('api', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '{*path}',
  handler: async (request) => {
    const event = toEvent(request)
    await readBody(request, event)
    const result = await route(event)
    return {
      status:  result.statusCode,
      headers: result.headers,
      body:    result.body,
    }
  },
})