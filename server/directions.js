// Route handler for POST /api/directions.
// Proxies to Google Directions API with caching and dedup.

const cache = require('./cache');
const { validateDirectionsBody } = require('./validate');

const API_KEY = process.env.GOOGLE_DIRECTIONS_API_KEY || '';
const FETCH_TIMEOUT_MS = 8_000; // 8 seconds

async function directionsHandler(req, res) {
  // --- Validate ---
  const validationError = validateDirectionsBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  if (!API_KEY) {
    // Log without revealing the variable name contains "key" in the value
    console.error('[directions] Server misconfigured: Directions API credentials missing');
    return res.status(503).json({ error: 'Directions service unavailable' });
  }

  const { origin, destination } = req.body;
  const cacheKey = cache.makeKey(origin.lat, origin.lng, destination.lat, destination.lng);

  // --- Cache hit ---
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  // --- Dedup: if identical request is already in-flight, wait for it ---
  const existing = cache.getInflight(cacheKey);
  if (existing) {
    try {
      const result = await existing;
      return res.json(result);
    } catch (err) {
      return res.status(502).json({ error: 'Directions API request failed' });
    }
  }

  // --- Fetch from Google ---
  const fetchPromise = fetchDirections(origin, destination);
  cache.setInflight(cacheKey, fetchPromise);

  try {
    const result = await fetchPromise;
    cache.set(cacheKey, result); // TTL defaults to 5 min
    return res.json(result);
  } catch (err) {
    const status = err.status || 502;
    return res.status(status).json({ error: err.message || 'Directions API error' });
  }
}

async function fetchDirections(origin, destination) {
  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${origin.lat},${origin.lng}` +
    `&destination=${destination.lat},${destination.lng}` +
    `&mode=driving` +
    `&key=${API_KEY}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('Directions API timeout');
      e.status = 504;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const e = new Error(`Google API returned HTTP ${res.status}`);
    e.status = 502;
    throw e;
  }

  const data = await res.json();

  if (data.status !== 'OK' || !data.routes?.length) {
    const e = new Error(
      data.status === 'ZERO_RESULTS'
        ? 'No driving route found'
        : `Directions API: ${data.status}`,
    );
    e.status = data.status === 'ZERO_RESULTS' ? 404 : 502;
    throw e;
  }

  const leg = data.routes[0].legs[0];

  return {
    distanceKm: parseFloat((leg.distance.value / 1000).toFixed(2)),
    durationMinutes: parseFloat((leg.duration.value / 60).toFixed(1)),
  };
}

module.exports = { directionsHandler };
