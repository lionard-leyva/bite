// Simple sliding-window rate limiter — no external dependencies.
// Tracks request counts per IP in a Map with auto-cleanup.

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 30;  // 30 req/min per IP

/** @type {Map<string, { count: number, resetAt: number }>} */
const buckets = new Map();

function rateLimitMiddleware(
  windowMs = DEFAULT_WINDOW_MS,
  maxRequests = DEFAULT_MAX_REQUESTS,
) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let bucket = buckets.get(ip);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }

    bucket.count += 1;

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - bucket.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Try again later.',
      });
    }

    next();
  };
}

// Periodic cleanup of expired buckets (every 2 min)
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(ip);
  }
}, 120_000).unref();

module.exports = { rateLimitMiddleware, buckets };
