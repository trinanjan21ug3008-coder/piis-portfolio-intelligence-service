/**
 * PIIS Briefing API — Express server for Render / Railway / Fly.io / any Node host.
 *
 * Env vars:
 *   ANTHROPIC_API_KEY   (required)  — Anthropic API key
 *   PIIS_MODEL          (optional)  — default: claude-sonnet-4-6
 *   PIIS_MAX_SEARCHES   (optional)  — default: 6
 *   CORS_ORIGIN         (optional)  — restrict CORS to this origin (default: *)
 *   PORT                (optional)  — default: 3000
 */

const express = require('express');
const cors = require('cors');
const { generateBriefing } = require('./briefing');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '512kb' }));

// CORS — default to permissive for ease of dev, tighten in prod.
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin.split(',').map(s => s.trim()),
  methods: ['GET', 'POST', 'OPTIONS'],
}));

// Health check (used by Render to verify deploy + keep-alive pings).
app.get('/healthz', (req, res) => {
  res.json({
    ok: true,
    service: 'piis-briefing',
    model: process.env.PIIS_MODEL || 'claude-sonnet-4-6',
    has_api_key: Boolean(process.env.ANTHROPIC_API_KEY),
    uptime_seconds: Math.round(process.uptime()),
  });
});

// Root convenience response.
app.get('/', (req, res) => {
  res.json({
    service: 'PIIS Briefing API',
    endpoints: { briefing: 'POST /api/briefing', health: 'GET /healthz' },
  });
});

// Briefing endpoint.
app.post('/api/briefing', async (req, res) => {
  const { portfolio, totalInvested, date } = req.body || {};
  try {
    const result = await generateBriefing({
      portfolio,
      totalInvested,
      date,
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.PIIS_MODEL,
      maxSearches: process.env.PIIS_MAX_SEARCHES,
    });
    res.json(result);
  } catch (err) {
    const status = err.status || err?.error?.status || 500;
    const message = err.message || err?.error?.message || 'Unknown error';
    console.error(`[briefing] ${status} — ${message}`);
    if (status === 401 || /api[_ ]?key/i.test(message)) {
      return res.status(500).json({ error: 'API key is invalid. Check ANTHROPIC_API_KEY in your environment variables.' });
    }
    if (status === 429) {
      return res.status(429).json({ error: 'Rate limited by Claude API. Wait a moment and retry.' });
    }
    res.status(status).json({ error: message });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`[piis] listening on :${port}`);
  console.log(`[piis] CORS origin: ${corsOrigin}`);
  console.log(`[piis] model: ${process.env.PIIS_MODEL || 'claude-sonnet-4-6'}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[piis] WARNING: ANTHROPIC_API_KEY is not set. /api/briefing will return 500.');
  }
});
