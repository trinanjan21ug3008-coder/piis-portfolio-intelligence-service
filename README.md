# PIIS — Personal Investment Intelligence System

A production-grade web platform implementing the PIIS protocol: daily AI-driven investment briefings powered by **Claude** with **live web search**, layered over a portfolio manager with full thesis tracking.

---

## Architecture

The project is split into two independently deployable modules:

```
piis/
├── frontend/                       Static client → Vercel
│   └── …
└── backend/                        Briefing API → Render (default) or Cloudflare Pages
    ├── render/                     Node + Express
    └── cloudflare/                 Cloudflare Pages Functions (free alternate)
```

| Module | Stack | Recommended host | Cost |
|--------|-------|------------------|------|
| `frontend/` | HTML / CSS / vanilla JS · Chart.js · SheetJS | **Vercel** (free) | Free |
| `backend/render/` | Node 18 · Express · `@anthropic-ai/sdk` | **Render** (free or $7/mo) | Free with 30–60s cold starts, $7/mo warm |
| `backend/cloudflare/` | Cloudflare Workers runtime (fetch only) | **Cloudflare Pages** | Free, no cold starts |

**Pick ONE backend.** Both expose the same `POST /api/briefing` contract — the frontend doesn't care which one runs behind it.

---

## What it does

- **Portfolio**: Upload `.xlsx` / `.xls` / `.csv`, then add to / reduce / exit positions with a logged investment thesis on every action.
- **Briefing**: One tap generates today's intelligence briefing using Claude with live web_search. The model pulls regulatory filings, earnings, insider activity, and macro data, then filters through the PIIS Final Filter — what would actually change a rational investor's behavior.
- **Charts**: Allocation donut, sector-exposure bar, top-holdings bar, weight distribution, concentration gauge, conviction radar — themable, live.
- **Activity log**: Full transaction history with rationale.
- **Themes**: Dark / light, persisted locally, auto-detected.
- **Local-first**: Portfolio + transactions + briefing all in browser `localStorage`. Only the portfolio payload leaves the device (sent to your backend, then to Anthropic).

**No database. No auth. No sessions. No cron. No queues.** That's by design.

---

## End-to-end deploy in 10 minutes (Vercel + Render)

### 1. Deploy the backend → Render

1. Push this repo to GitHub.
2. [render.com](https://render.com) → **New +** → **Blueprint** → connect your repo.
3. Render reads [`render.yaml`](render.yaml) at the repo root and proposes the `piis-briefing` service (its `rootDir` points at `backend/render/`).
4. After service is created, **Environment** → add:
   - `ANTHROPIC_API_KEY` = your `sk-ant-...` key from [console.anthropic.com](https://console.anthropic.com)
   - `CORS_ORIGIN` = leave as `*` for now (tighten after frontend deploys)
5. Wait ~2 min for build + deploy. Copy your service URL — something like `https://piis-briefing.onrender.com`.
6. Verify with `curl https://piis-briefing.onrender.com/healthz` — should return JSON with `ok: true`.

Full backend docs + Railway/Fly alternates: [`backend/render/README.md`](backend/render/README.md).

### 2. Configure the frontend

Edit [`frontend/config.js`](frontend/config.js) and replace the placeholder URL:

```js
window.PIIS_BRIEFING_ENDPOINT = 'https://piis-briefing.onrender.com/api/briefing';
```

### 3. Deploy the frontend → Vercel

```bash
cd frontend
npx vercel              # first time: login + link
npx vercel --prod       # promote to production
```

Or via the Vercel dashboard: **New Project** → import repo → set **Root Directory** to `piis/frontend` → leave build commands empty → Deploy.

Copy your Vercel URL — something like `https://piis.vercel.app`.

### 4. Lock down CORS

Back in Render → **Environment** → set `CORS_ORIGIN` to your Vercel URL (`https://piis.vercel.app`) → save → service auto-redeploys.

### 5. Use it

Open your Vercel URL → upload portfolio (or click **Load sample**) → tap **Generate Today's Briefing**. First request after deploy or after a 15-min idle takes ~60s (Render free-tier cold start). Subsequent briefings: 15–25s.

Full frontend docs: [`frontend/README.md`](frontend/README.md).

---

## Alternative backend: Cloudflare Pages Functions (free, no cold starts)

If you don't want to deal with Render cold starts and don't need a Node-specific environment, deploy the Cloudflare variant instead — it runs on the Workers runtime, free tier handles this workload cleanly, and there are no cold starts.

```bash
cd backend/cloudflare
npx wrangler pages deploy . --project-name=piis-briefing
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=piis-briefing
```

Then point `frontend/config.js` at `https://piis-briefing.pages.dev/api/briefing`. Done.

Full Cloudflare docs: [`backend/cloudflare/README.md`](backend/cloudflare/README.md).

---

## Environment variables (backend, both variants)

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `ANTHROPIC_API_KEY` | yes | — | Set in the backend host's env vars. Never in the frontend. |
| `PIIS_MODEL` | no | `claude-sonnet-4-6` | Use `claude-opus-4-7` for premium quality (~5× cost). |
| `PIIS_MAX_SEARCHES` | no | `6` | Cap on web_search calls per briefing. |
| `CORS_ORIGIN` | no | `*` | (Render only) Lock to your Vercel domain in production. |

---

## How the briefing pipeline works

1. User taps **Generate Today's Briefing** (or auto-triggered on first daily visit).
2. Frontend POSTs portfolio snapshot to `${PIIS_BRIEFING_ENDPOINT}`.
3. Backend calls Claude with:
   - **System prompt**: full PIIS Chief Investment Intelligence Analyst protocol.
   - **Tools**: `web_search_20250305` (live search, capped) + `submit_briefing` (structured JSON schema).
   - **User message**: portfolio with positions, sectors, theses, conviction levels.
4. Claude researches the web for each holding / sector / macro factor, then calls `submit_briefing` with the structured PIIS output.
5. Backend extracts the structured briefing + every `web_search_result` URL as sources.
6. Frontend renders 9 PIIS sections + sources panel + impact-distribution visualizations.

Briefing is cached in `localStorage` per day. Manual refresh always available via the **Generate** button.

---

## Cost estimate

Each briefing on defaults (sonnet-4-6, 6 web searches):
- Web search: ~6 × $0.01 = **~$0.06**
- Tokens: ~8K in × $3/M + ~3K out × $15/M = **~$0.07**
- **~$0.13 per briefing** = **~$4/month** at one briefing/day per user.

Hosting: Vercel frontend free. Render free with cold starts OR $7/mo warm. Cloudflare Pages free, no caveats.

**Total for one daily-active user: $4–$11/month all-in.**

---

## Privacy model

- Portfolio + transactions + briefing data live in the **user's browser** (`localStorage`).
- The portfolio snapshot is sent to **your backend** (which you control), and from there to **Anthropic's API**.
- No analytics, no cookies, no third-party trackers, no DB to breach.
- Set [Anthropic's zero-retention](https://docs.anthropic.com) flag if your client requires it.

---

## Local development

```bash
# Backend (terminal 1)
cd backend/render
npm install
cp .env.example .env
# edit .env with your ANTHROPIC_API_KEY
node --env-file=.env server.js
# → http://localhost:3000

# Frontend (terminal 2)
cd frontend
# edit config.js → set PIIS_BRIEFING_ENDPOINT = 'http://localhost:3000/api/briefing'
npx serve . -p 5500
# → http://localhost:5500
```

---

## File map

```
piis/
├── README.md                                this file
├── render.yaml                              Render Blueprint (root-level so Render auto-detects)
├── .gitignore
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── config.js                            ← edit before deploy
│   ├── vercel.json
│   └── README.md
└── backend/
    ├── render/                              ← deploy this for Render / Railway / Fly.io
    │   ├── server.js
    │   ├── briefing.js
    │   ├── package.json
    │   ├── .env.example
    │   └── README.md
    └── cloudflare/                          ← OR deploy this for Cloudflare Pages
        ├── functions/api/briefing.js
        ├── wrangler.toml
        └── README.md
```
