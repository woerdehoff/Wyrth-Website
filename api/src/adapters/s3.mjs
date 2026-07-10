import { randomUUID } from 'node:crypto'
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
// Legacy stack uses BUCKET_NAME; new stack uses SITE_BUCKET
const siteBucket = process.env.SITE_BUCKET || process.env.BUCKET_NAME
const uploadsBucket = process.env.UPLOADS_BUCKET || siteBucket
const cdnHost = process.env.CDN_HOST
  || process.env.STORAGE_CDN_HOST
  || process.env.CLOUDFRONT_DOMAIN
  || ''

const s3 = new S3Client({ region })

async function streamToString(stream) {
  if (!stream) return ''
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

export async function getContentJson() {
  try {
    const out = await s3.send(new GetObjectCommand({
      Bucket: siteBucket,
      Key: 'content.json',
    }))
    return await streamToString(out.Body)
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null
    throw err
  }
}

export async function putContentJson(content) {
  const body = JSON.stringify(content)
  await s3.send(new PutObjectCommand({
    Bucket: siteBucket,
    Key: 'content.json',
    Body: body,
    ContentType: 'application/json',
    CacheControl: 'no-cache, no-store, must-revalidate',
  }))
}

export async function createUploadUrl(ext, contentType) {
  const key = `uploads/${randomUUID()}.${ext}`
  const command = new PutObjectCommand({
    Bucket: uploadsBucket,
    Key: key,
    ContentType: contentType,
  })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
  const publicUrl = cdnHost
    ? `https://${cdnHost}/${key}`
    : `https://${uploadsBucket}.s3.${region}.amazonaws.com/${key}`
  return { uploadUrl, publicUrl }
}
