// Route handler for POST /api/resolve-link.
// Follows the redirects of a short Google Maps link (maps.app.goo.gl) so the client can
// read the place name and coordinates from the final URL. Only Google Maps hosts are
// followed, so this can't be used to make the server fetch arbitrary URLs.

const MAX_HOPS = 5;
const FETCH_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 500;

const cache = new Map(); // url -> { value, ts }

function parseUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}

function isGoogleHost(host) {
  return /(^|\.)google\.[a-z.]{2,6}$/.test(host);
}

function isAllowedUrl(u) {
  const host = u.hostname.toLowerCase();
  if (host === 'maps.app.goo.gl') return true;
  if (host === 'goo.gl') return u.pathname.startsWith('/maps');
  if (host === 'consent.google.com') return true;
  if (!isGoogleHost(host)) return false;
  return host.startsWith('maps.google.') || u.pathname.startsWith('/maps');
}

// EU users get bounced to a cookie-consent page; the real target is in ?continue=
function unwrapConsent(u) {
  if (u.hostname.toLowerCase() !== 'consent.google.com') return u;
  const next = parseUrl(u.searchParams.get('continue') || '');
  return next && isAllowedUrl(next) && next.hostname !== 'consent.google.com' ? next : null;
}

async function resolveLink(raw, fetchImpl = fetch) {
  let current = parseUrl(raw);
  if (!current || !isAllowedUrl(current)) throw Object.assign(new Error('URL not allowed'), { status: 400 });

  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const unwrapped = unwrapConsent(current);
    if (!unwrapped) break;
    current = unwrapped;
    // Long Maps URL: nothing left to follow
    if (current.hostname !== 'maps.app.goo.gl' && current.hostname !== 'goo.gl') return current.toString();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res;
    try {
      res = await fetchImpl(current.toString(), { method: 'GET', redirect: 'manual', signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    const location = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !location) break;
    const next = parseUrl(new URL(location, current).toString());
    if (!next || !isAllowedUrl(next)) break;
    current = next;
  }
  throw Object.assign(new Error('Could not resolve link'), { status: 422 });
}

function createResolveLinkHandler(fetchImpl = fetch) {
  return async function resolveLinkHandler(req, res) {
    const url = req.body && req.body.url;
    if (typeof url !== 'string' || url.length > 2048) {
      return res.status(400).json({ error: 'url is required' });
    }

    const hit = cache.get(url);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return res.json({ url: hit.value });

    try {
      const resolved = await resolveLink(url, fetchImpl);
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
      cache.set(url, { value: resolved, ts: Date.now() });
      return res.json({ url: resolved });
    } catch (err) {
      return res.status(err.status || 502).json({ error: err.status ? err.message : 'Link resolution failed' });
    }
  };
}

module.exports = { resolveLink, isAllowedUrl, createResolveLinkHandler, cache };
