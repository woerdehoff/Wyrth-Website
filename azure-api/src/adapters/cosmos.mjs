import { CosmosClient } from '@azure/cosmos'

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key:        process.env.COSMOS_KEY,
})

const database = client.database(process.env.COSMOS_DATABASE || 'wyrth')

function col(name) {
  return database.container(name)
}

function withId(doc, idField) {
  return { ...doc, id: doc[idField] }
}

/** Cosmos document ids cannot contain /, \\, ?, or #. */
function analyticsDocId(pk, sk) {
  return Buffer.from(`${pk}\0${sk}`).toString('base64url')
}

export async function scanContainer(name, filter) {
  const { resources } = await col(name).items.readAll().fetchAll()
  if (filter?.active !== undefined) {
    return resources.filter(r => r.active === filter.active)
  }
  return resources
}

export async function getDoc(name, idField, id) {
  const { resource } = await col(name).item(id, id).read()
  return resource || null
}

export async function putDoc(name, idField, doc) {
  await col(name).items.upsert(withId(doc, idField))
}

export async function deleteDoc(name, idField, id) {
  await col(name).item(id, id).delete()
}

export async function queryByPk(name, pk, skFrom, skTo) {
  const { resources } = await col(name).items
    .query({
      query: 'SELECT * FROM c WHERE c.pk = @pk AND c.sk >= @from AND c.sk <= @to',
      parameters: [
        { name: '@pk',   value: pk },
        { name: '@from', value: skFrom },
        { name: '@to',   value: skTo },
      ],
    })
    .fetchAll()
  return resources
}

async function addCounter(pk, sk, field, ttl) {
  const id = analyticsDocId(pk, sk)
  const { resource } = await col('analytics').item(id, pk).read()
  if (!resource) {
    await col('analytics').items.create({ id, pk, sk, [field]: 1, ttl })
    return
  }
  await col('analytics').item(id, pk).replace({ ...resource, [field]: (resource[field] || 0) + 1, ttl })
}

/** Fixed-window rate limiter stored in the analytics container. */
export async function rateLimit(bucket, id, limit, windowSeconds) {
  const window = Math.floor(Date.now() / 1000 / windowSeconds)
  const pk    = `RATE#${bucket}`
  const sk    = `${id}#${window}`
  const docId = analyticsDocId(pk, sk)
  const ttl   = Math.floor(Date.now() / 1000) + windowSeconds + 120

  const { resource } = await col('analytics').item(docId, pk).read()
  if (!resource) {
    await col('analytics').items.create({ id: docId, pk, sk, count: 1, ttl })
    return true
  }
  const count = (resource.count || 0) + 1
  if (count > limit) return false
  await col('analytics').item(docId, pk).replace({ ...resource, count, ttl })
  return true
}

export async function trackPageView(page, visitorHash, ttl) {
  const today = new Date().toISOString().slice(0, 10)
  await addCounter('PAGE',  `${today}#${page}`, 'views', ttl)
  await addCounter('DAILY', today, 'views', ttl)

  const visPk = `VIS#${today}`
  try {
    await col('analytics').items.create(
      { id: analyticsDocId(visPk, visitorHash), pk: visPk, sk: visitorHash, ttl },
      { accessCondition: { type: 'IfNoneMatch', condition: '*' } },
    )
    await addCounter('DAILY', today, 'visitors', ttl)
  } catch (err) {
    if (err.code !== 409) throw err
  }
}