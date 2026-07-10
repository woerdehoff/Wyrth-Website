import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

/**
 * Send transactional email via Amazon SES.
 * Requires MAIL_FROM (or SES_FROM_EMAIL) to be a verified SES identity
 * in the Lambda region (e.g. noreply@wyrthco.com on verified domain wyrthco.com).
 */
export async function sendMagicLinkEmail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM || process.env.SES_FROM_EMAIL
  if (!from) throw new Error('MAIL_FROM not configured')

  const client = new SESv2Client({})
  await client.send(new SendEmailCommand({
    FromEmailAddress: from,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: text || '', Charset: 'UTF-8' },
          ...(html ? { Html: { Data: html, Charset: 'UTF-8' } } : {}),
        },
      },
    },
  }))
}
