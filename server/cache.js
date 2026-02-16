// In-memory cache with TTL and request deduplication.
// No external dependencies — suitable for a single-instance proxy.

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** @type {Map<string, { value: any, expiresAt: number }>} */
const store = new Map();

/** @type {Map<string, Promise<any>>} */
const inflight = new Map();

function makeKey(originLat, originLng, destLat, destLng) {
  // Round to 4 decimals (~11m precision) so nearby origins hit the same entry
  const oLat = originLat.toFixed(4);
  const oLng = originLng.toFixed(4);
  const dLat = destLat.toFixed(4);
  const dLng = destLng.toFixed(4);
  return `${oLat},${oLng}|${dLat},${dLng}`;
}

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function set(key, value, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function getInflight(key) {
  return inflight.get(key);
}

function setInflight(key, promise) {
  inflight.set(key, promise);
  // Clean up when the promise settles regardless of outcome
  promise.finally(() => inflight.delete(key));
}

// Periodic cleanup of expired entries (every 60s)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 60_000).unref();

module.exports = { makeKey, get, set, getInflight, setInflight, store, inflight };
