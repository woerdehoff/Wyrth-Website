import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
})

/** Prefer explicit table env vars (legacy AWS stack); else DYNAMO_TABLE_PREFIX. */
function table(name) {
  const explicit = {
    products: process.env.PRODUCTS_TABLE,
    orders: process.env.ORDERS_TABLE,
    carts: process.env.CARTS_TABLE,
    analytics: process.env.ANALYTICS_TABLE,
    'magic-tokens': process.env.MAGIC_TOKENS_TABLE,
  }
  if (explicit[name]) return explicit[name]
  const prefix = process.env.DYNAMO_TABLE_PREFIX || 'wyrth-website'
  return `${prefix}-${name}`
}

export async function scanContainer(name, filter) {
  const items = []
  let ExclusiveStartKey
  do {
    const out = await client.send(new ScanCommand({
      TableName: table(name),
      ExclusiveStartKey,
    }))
    items.push(...(out.Items || []))
    ExclusiveStartKey = out.LastEvaluatedKey
  } while (ExclusiveStartKey)

  if (filter?.active !== undefined) {
    return items.filter(r => r.active === filter.active)
  }
  return items
}

export async function getDoc(name, idField, id) {
  if (name === 'analytics') {
    const out = await client.send(new GetCommand({
      TableName: table(name),
      Key: { pk: id, sk: id },
    }))
    return out.Item || null
  }

  const out = await client.send(new GetCommand({
    TableName: table(name),
    Key: { [idField]: id },
  }))
  return out.Item || null
}

export async function putDoc(name, idField, doc) {
  await client.send(new PutCommand({
    TableName: table(name),
    Item: { ...doc, [idField]: doc[idField] },
  }))
}

export async function deleteDoc(name, idField, id) {
  await client.send(new DeleteCommand({
    TableName: table(name),
    Key: { [idField]: id },
  }))
}

export async function queryByPk(name, pk, skFrom, skTo) {
  const out = await client.send(new QueryCommand({
    TableName: table(name),
    KeyConditionExpression: 'pk = :pk AND sk BETWEEN :from AND :to',
    ExpressionAttributeValues: {
      ':pk': pk,
      ':from': skFrom,
      ':to': skTo,
    },
  }))
  return out.Items || []
}

async function addCounter(pk, sk, field, ttl) {
  await client.send(new UpdateCommand({
    TableName: table('analytics'),
    Key: { pk, sk },
    UpdateExpression: `ADD #f :one SET #ttl = :ttl`,
    ExpressionAttributeNames: { '#f': field, '#ttl': 'ttl' },
    ExpressionAttributeValues: { ':one': 1, ':ttl': ttl },
  }))
}

export async function rateLimit(bucket, id, limit, windowSeconds) {
  const window = Math.floor(Date.now() / 1000 / windowSeconds)
  const pk = `RATE#${bucket}`
  const sk = `${id}#${window}`
  const ttl = Math.floor(Date.now() / 1000) + windowSeconds + 120

  try {
    const existing = await client.send(new GetCommand({
      TableName: table('analytics'),
      Key: { pk, sk },
    }))
    const count = (existing.Item?.count || 0) + 1
    if (existing.Item && count > limit) return false

    await client.send(new PutCommand({
      TableName: table('analytics'),
      Item: { pk, sk, count, ttl },
    }))
    return true
  } catch (err) {
    console.error('rateLimit error', err)
    return true
  }
}

export async function trackPageView(page, visitorHash, ttl) {
  const today = new Date().toISOString().slice(0, 10)
  await addCounter('PAGE', `${today}#${page}`, 'views', ttl)
  await addCounter('DAILY', today, 'views', ttl)

  const visPk = `VIS#${today}`
  try {
    await client.send(new PutCommand({
      TableName: table('analytics'),
      Item: { pk: visPk, sk: visitorHash, ttl },
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
    }))
    await addCounter('DAILY', today, 'visitors', ttl)
  } catch (err) {
    if (err.name !== 'ConditionalCheckFailedException') throw err
  }
}
