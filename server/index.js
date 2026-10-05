const express = require('express');
const cors = require('cors');
const { rateLimitMiddleware } = require('./rateLimit');
const { directionsHandler } = require('./directions');
const { createResolveLinkHandler } = require('./resolveLink');

const app = express();

// --- CORS ---
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : null; // null = allow all in dev

app.use(
  cors(
    allowedOrigins
      ? {
          origin(origin, cb) {
            // Allow requests with no origin (mobile apps, curl)
            if (!origin || allowedOrigins.includes(origin)) {
              cb(null, true);
            } else {
              cb(new Error('CORS: origin not allowed'));
            }
          },
        }
      : undefined, // default cors() allows all origins
  ),
);

// --- JSON body parser ---
app.use(express.json());

// --- Rate limiting (applied to /api/* routes) ---
app.use('/api', rateLimitMiddleware());

// --- Routes ---
app.post('/api/directions', directionsHandler);
app.post('/api/resolve-link', createResolveLinkHandler());

// --- Health check ---
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// --- Start ---
const PORT = parseInt(process.env.PORT || '3001', 10);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[bite-proxy] listening on :${PORT}`);
  });
}

module.exports = app; // for testing
