const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 50

const buckets = new Map()

export function rateLimit50PerMinute(req, res, next) {
  const key = req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "anonymous"
  const now = Date.now()
  const bucket = buckets.get(key) || { count: 0, resetAt: now + WINDOW_MS }

  if (now > bucket.resetAt) {
    bucket.count = 0
    bucket.resetAt = now + WINDOW_MS
  }

  bucket.count += 1
  buckets.set(key, bucket)

  if (bucket.count > MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    })
  }

  next()
}

