# PIIS Backend — Render / Express

Node 18+ Express server exposing the PIIS briefing API. Deployable to **Render**, **Railway**, **Fly.io**, or any Node host.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/briefing` | Generate a daily PIIS briefing for the supplied portfolio. |
| `GET`  | `/healthz` | Liveness check + service config (no secrets exposed). |
| `GET`  | `/` | Service descriptor. |

### Request — `POST /api/briefing`

```json
{
  "portfolio": [
    {
      "name": "BHARAT ELECTRONICS",
      "qty": 96,
      "avgPrice": 231,
      "invested": 22176,
      "sector": "Defence",
      "thesis": "Defence tailwinds, margin resilience.",
      "status": "Intact",
      "confidence": 8
    }
  ],
  "totalInvested": 22176,
  "date": "2025-06-09"
}
```

### Response

```json
{
  "briefing": { "executive_summary": [...], "portfolio_impact": [...], ... },
  "sources": [{ "url": "...", "title": "...", "page_age": "..." }],
  "model": "claude-sonnet-4-6",
  "usage": { "input_tokens": 7821, "output_tokens": 2940 },
  "generated_at": "2025-06-09T10:14:22.103Z"
}
```

## Environment variables

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `ANTHROPIC_API_KEY` | yes | — | Get one at [console.anthropic.com](https://console.anthropic.com). |
| `PIIS_MODEL` | no | `claude-sonnet-4-6` | Use `claude-opus-4-7` for premium quality. |
| `PIIS_MAX_SEARCHES` | no | `6` | Cap on web_search calls per briefing. |
| `CORS_ORIGIN` | no | `*` | Comma-separated allowed origins, e.g. `https://piis.vercel.app`. Tighten in prod. |
| `PORT` | no | `3000` | Render injects its own `$PORT`. |

## Deploy to Render

### Option A — Blueprint (one-click)

1. Push the project to GitHub.
2. Render Dashboard → **New +** → **Blueprint** → connect your repo.
3. Render detects [`render.yaml`](../../render.yaml) at the repo root and proposes the `piis-briefing` web service. (Render Blueprint only scans the repo root, so the file lives there even though it points at `backend/render/` via `rootDir`.)
4. After the service is created, open **Environment** and set:
   - `ANTHROPIC_API_KEY` = your `sk-ant-...` key
   - `CORS_ORIGIN` = your Vercel frontend URL (e.g. `https://piis.vercel.app`)
5. Trigger a redeploy.

### Option B — Manual web service

1. Render Dashboard → **New +** → **Web Service** → connect repo.
2. Settings:
   - **Root Directory**: `backend/render`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Starter $7/mo to avoid idle spin-down)
3. **Environment** tab → add `ANTHROPIC_API_KEY` and `CORS_ORIGIN`.
4. Deploy.

After deployment, your endpoint is `https://<service-name>.onrender.com/api/briefing`. Paste this into `frontend/config.js`:

```js
window.PIIS_BRIEFING_ENDPOINT = 'https://piis-briefing.onrender.com/api/briefing';
```

## Cold-start note (Render free tier)

Free Render web services **spin down after 15 minutes of inactivity**. The first request after sleep takes 30–60 seconds to wake the container. On top of the 15–25s briefing call, your user could wait **~75 seconds** for the first morning briefing. Subsequent requests within the active session are fast.

Mitigations:
- **Upgrade to Starter ($7/mo)** — no spin-down.
- **Cron ping** — set an external uptime monitor (UptimeRobot, Better Stack, cron-job.org) to hit `/healthz` every 10 minutes. Keeps the dyno warm. Free.
- **Move to Fly.io or Cloudflare Workers** — no cold starts on free tier.

The frontend's loader already shows "Waking analyst service…" as the first stage, so users see meaningful progress.

## Deploy to Railway

1. Railway Dashboard → **New Project** → **Deploy from GitHub repo**.
2. Set **Root Directory** to `backend/render`.
3. Add env vars (`ANTHROPIC_API_KEY`, `CORS_ORIGIN`).
4. Railway auto-detects Node and runs `npm start`.

## Deploy to Fly.io

```bash
cd backend/render
fly launch                          # creates fly.toml, picks region, deploys
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly secrets set CORS_ORIGIN=https://piis.vercel.app
fly deploy
```

## Local development

```bash
cd backend/render
npm install
cp .env.example .env
# edit .env with your ANTHROPIC_API_KEY
node --env-file=.env server.js
# server up at http://localhost:3000
# health: curl http://localhost:3000/healthz
```

Then in `frontend/config.js`:

```js
window.PIIS_BRIEFING_ENDPOINT = 'http://localhost:3000/api/briefing';
```

Serve the frontend locally (any static server works):

```bash
cd frontend
npx serve .      # http://localhost:3000 — use a different port if backend is on 3000
```

## Cost estimate

Each briefing on default settings (sonnet-4-6, 6 searches):
- Web search: ~$0.06
- Tokens: ~$0.07
- **~$0.13 per briefing**, ≈ $4/month for one daily user.

Costs scale linearly with `PIIS_MAX_SEARCHES`. Opus increases token cost ~5×.

## Files

```
backend/render/
├── server.js          Express app, routes, CORS
├── briefing.js        PIIS prompt, schema, Anthropic call (pure module)
├── package.json
├── .env.example
└── README.md
(render.yaml lives at the repo root — Render Blueprint requires that)
```
