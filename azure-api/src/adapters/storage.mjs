import { randomUUID } from 'node:crypto'
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob'

const account   = process.env.STORAGE_ACCOUNT_NAME
const accountKey = process.env.STORAGE_ACCOUNT_KEY
const cdnHost   = process.env.STORAGE_CDN_HOST || ''

const credential = new StorageSharedKeyCredential(account, accountKey)
const blobService = new BlobServiceClient(
  `https://${account}.blob.core.windows.net`,
  credential,
)

const webContainer = blobService.getContainerClient('$web')

export async function getContentJson() {
  try {
    const blob = webContainer.getBlockBlobClient('content.json')
    const res  = await blob.download()
    return await streamToString(res.readableStreamBody)
  } catch (err) {
    if (err.statusCode === 404) return null
    throw err
  }
}

export async function putContentJson(content) {
  const blob = webContainer.getBlockBlobClient('content.json')
  await blob.upload(JSON.stringify(content), JSON.stringify(content).length, {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  })
}

export async function createUploadUrl(ext, contentType) {
  const uploads = blobService.getContainerClient('uploads')
  const key     = `uploads/${randomUUID()}.${ext}`
  const blob    = uploads.getBlockBlobClient(key.replace('uploads/', ''))

  const sas = generateBlobSASQueryParameters({
    containerName: 'uploads',
    blobName:      key.replace('uploads/', ''),
    permissions:   BlobSASPermissions.parse('cw'),
    startsOn:      new Date(Date.now() - 60_000),
    expiresOn:     new Date(Date.now() + 300_000),
    contentType,
  }, credential).toString()

  const uploadUrl = `${blob.url}?${sas}`
  const publicUrl = cdnHost
    ? `https://${cdnHost}/${key}`
    : `https://${account}.blob.core.windows.net/${key}`

  return { uploadUrl, publicUrl }
}

async function streamToString(stream) {
  if (!stream) return ''
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}