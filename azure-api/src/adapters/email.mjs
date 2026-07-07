import { ClientSecretCredential } from '@azure/identity'

let tokenCache = null
let tokenExpiry = 0

async function getGraphToken() {
  const now = Date.now()
  if (tokenCache && now < tokenExpiry - 60_000) return tokenCache

  const tenant = process.env.ENTRA_TENANT_ID
  const clientId = process.env.MAIL_CLIENT_ID
  const secret   = process.env.MAIL_CLIENT_SECRET
  if (!tenant || !clientId || !secret) throw new Error('Mail not configured')

  const cred = new ClientSecretCredential(tenant, clientId, secret)
  const { token, expiresOnTimestamp } = await cred.getToken('https://graph.microsoft.com/.default')
  tokenCache = token
  tokenExpiry = expiresOnTimestamp
  return token
}

export async function sendMagicLinkEmail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM
  if (!from) throw new Error('MAIL_FROM not configured')

  const token = await getGraphToken()
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: html || text },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: false,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph sendMail failed: ${res.status} ${err}`)
  }
}