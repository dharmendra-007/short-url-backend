const REDIS_BASE_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "") || ""
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || ""

const LOCAL_CACHE_MAX_ENTRIES = Math.max(parseInt(process.env.REDIS_LOCAL_CACHE_MAX_ENTRIES || "500", 10) || 500, 1)
const DEFAULT_CACHE_TTL_SECONDS = Math.max(parseInt(process.env.REDIS_CACHE_TTL_SECONDS || "3600", 10) || 3600, 60)
const fetchImpl = globalThis.fetch

const cachePrefix = "shorturl:redirect:"

class LRUCache {
  constructor(maxEntries) {
    this.maxEntries = maxEntries
    this.store = new Map()
  }

  get(key) {
    const entry = this.store.get(key)
    if (!entry) return null

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return null
    }

    this.store.delete(key)
    this.store.set(key, entry)
    return entry.value
  }

  set(key, value, ttlSeconds) {
    const expiresAt = Date.now() + ttlSeconds * 1000
    if (this.store.has(key)) {
      this.store.delete(key)
    }

    this.store.set(key, {
      value,
      expiresAt,
    })

    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value
      this.store.delete(oldestKey)
    }
  }

  delete(key) {
    this.store.delete(key)
  }
}

const localCache = new LRUCache(LOCAL_CACHE_MAX_ENTRIES)

function makeCacheKey(shortId) {
  return `${cachePrefix}${String(shortId).toLowerCase()}`
}

async function redisRequest(path) {
  if (!REDIS_BASE_URL || !REDIS_TOKEN || typeof fetchImpl !== "function") return null

  try {
    const response = await fetchImpl(`${REDIS_BASE_URL}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.warn("redis request failed:", error instanceof Error ? error.message : String(error))
    return null
  }
}

export async function getCachedShortUrl(shortId) {
  const cacheKey = makeCacheKey(shortId)
  const localValue = localCache.get(cacheKey)
  if (localValue) {
    return localValue
  }

  const remote = await redisRequest(`/get/${encodeURIComponent(cacheKey)}`)
  const rawValue = remote?.result

  if (!rawValue) {
    return null
  }

  try {
    const parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue
    localCache.set(cacheKey, parsed, DEFAULT_CACHE_TTL_SECONDS)
    return parsed
  } catch {
    return null
  }
}

export async function setCachedShortUrl(shortId, payload, ttlSeconds = DEFAULT_CACHE_TTL_SECONDS) {
  const cacheKey = makeCacheKey(shortId)
  const value = {
    shortId: String(shortId).toLowerCase(),
    redirectUrl: payload.redirectUrl,
    isActive: Boolean(payload.isActive),
  }

  localCache.set(cacheKey, value, ttlSeconds)

  if (!REDIS_BASE_URL || !REDIS_TOKEN || typeof fetchImpl !== "function") {
    return value
  }

  try {
    await fetchImpl(
      `${REDIS_BASE_URL}/set/${encodeURIComponent(cacheKey)}/${encodeURIComponent(JSON.stringify(value))}?ex=${ttlSeconds}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${REDIS_TOKEN}`,
        },
      }
    )
  } catch (error) {
    console.warn("redis set failed:", error instanceof Error ? error.message : String(error))
  }

  return value
}

export async function deleteCachedShortUrl(shortId) {
  const cacheKey = makeCacheKey(shortId)
  localCache.delete(cacheKey)

  if (!REDIS_BASE_URL || !REDIS_TOKEN || typeof fetchImpl !== "function") {
    return
  }

  try {
    await fetchImpl(`${REDIS_BASE_URL}/del/${encodeURIComponent(cacheKey)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    })
  } catch (error) {
    console.warn("redis delete failed:", error instanceof Error ? error.message : String(error))
  }
}
