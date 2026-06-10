# PIIS Backend — Cloudflare Pages Function (optional alternate to Render)

Stateless Workers-runtime function exposing `POST /api/briefing`. Free tier handles this workload comfortably — **no cold starts**, generous limits (100k req/day), global edge.

Use this if you want zero ops and zero monthly cost.

## Deploy

### Option A — Dashboard drag-and-drop

1. Zip the `backend/cloudflare/` folder.
2. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
3. Drop the zip. Cloudflare detects `functions/api/briefing.js` automatically.
4. After first deploy: project → **Settings** → **Variables and Secrets** → **Add**:
   - **Type**: Secret · **Name**: `ANTHROPIC_API_KEY` · **Value**: your `sk-ant-...` key
   - Apply to both Production and Preview.
5. **Deployments** → ⋯ → **Retry deployment** so the function picks up the secret.

### Option B — Wrangler CLI

```bash
cd backend/cloudflare
npx wrangler pages deploy . --project-name=piis-briefing
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=piis-briefing
```

Your endpoint: `https://piis-briefing.pages.dev/api/briefing`

Paste this into [`frontend/config.js`](../../frontend/config.js):

```js
window.PIIS_BRIEFING_ENDPOINT = 'https://piis-briefing.pages.dev/api/briefing';
```

## Environment variables

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `ANTHROPIC_API_KEY` | yes | — | Secret. Set via dashboard or `wrangler pages secret put`. |
| `PIIS_MODEL` | no | `claude-sonnet-4-6` | Plain text var. |
| `PIIS_MAX_SEARCHES` | no | `6` | Plain text var. |

## Why this vs Render?

| | Cloudflare Pages Functions | Render (Express) |
|--|----------------------------|------------------|
| Free tier viable | ✅ no cold starts | ⚠️ 30–60s cold start after 15min idle |
| Cost at scale | Free up to 100k req/day | $7/mo for warm dyno |
| Runtime | Workers (V8 isolate) | Node.js |
| Ops overhead | Zero | Minimal |
| Recommended for client shipping | ✅ | Only if Node-specific deps needed |

## Files

```
backend/cloudflare/
├── functions/api/briefing.js    Pages Function — routes to /api/briefing
├── wrangler.toml                Project config for CLI deploys
└── README.md
```
