# Short URL Backend

Node.js + Express backend for creating and redirecting short URLs, with MongoDB storage and Redis-backed redirect caching.

## Environment

Add these variables to `.env`:

```env
PORT=8000
NODE_ENV=development
MONGODB_URI=
JWT_SECRET=
FRONTEND_URL=http://localhost:3000
PUBLIC_SHORT_URL=http://localhost:3000
SHORT_URL_BASE=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CRON_SECRET=
GMAIL_USER=
GMAIL_APP_PASSWORD=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
REDIS_LOCAL_CACHE_MAX_ENTRIES=500
REDIS_CACHE_TTL_SECONDS=3600
```

## Redis Cache

Redirect lookups use a two-level cache:

1. Redis stores the short URL metadata for shared access across instances.
2. An in-memory LRU cache keeps the hottest entries local for faster lookups.

Cache behavior:

- New short URLs are written to cache after creation.
- Redirect requests read cache first and fall back to MongoDB if needed.
- Cache entries are invalidated when a URL is deleted or deactivated.
- The local cache is bounded by `REDIS_LOCAL_CACHE_MAX_ENTRIES`.
- Cached entries expire after `REDIS_CACHE_TTL_SECONDS`.

If Redis is unavailable, the app falls back to MongoDB without failing the request.

## Run

```bash
npm install
npm run dev
```

