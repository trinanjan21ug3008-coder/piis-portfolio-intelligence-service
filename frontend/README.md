# PIIS Frontend

Static client for the Personal Investment Intelligence System.
Zero build step. Deploy to Vercel, Netlify, Cloudflare Pages, GitHub Pages, S3 — anything that serves files.

## Stack

- HTML / CSS / vanilla ES6
- Chart.js 4 (CDN)
- SheetJS 0.18 (CDN)
- Inter + JetBrains Mono (Google Fonts)

All state lives in `localStorage` — no auth, no DB, no cookies.

## Configure the backend URL

Before deploying, edit [`config.js`](config.js) and replace the placeholder with your deployed backend URL:

```js
window.PIIS_BRIEFING_ENDPOINT = 'https://your-backend.onrender.com/api/briefing';
```

That's the only thing you need to change.

## Deploy to Vercel

### Option A — drag-and-drop

1. Zip the `frontend/` folder.
2. Go to <https://vercel.com/new> → **Import Third-Party Git Repository** or use the [CLI](https://vercel.com/docs/cli).

### Option B — Vercel CLI

```bash
cd frontend
npx vercel              # first time: login + link
npx vercel --prod       # promote to production
```

Vercel auto-detects the static project (no build), serves files, applies headers from `vercel.json`.

### Option C — Git connected

1. Push the repo to GitHub.
2. Vercel → **New Project** → import repo → **Root Directory**: `piis/frontend` → **Framework Preset**: Other → leave build commands empty → Deploy.

## Deploy to other static hosts

| Host | Steps |
|------|-------|
| Netlify | Drag the `frontend/` folder to <https://app.netlify.com/drop>. |
| Cloudflare Pages | Pages → Upload assets → drop `frontend/`. |
| GitHub Pages | Push `frontend/` contents to `gh-pages` branch. |
| S3 + CloudFront | Upload, set index.html as default doc. |

## CORS

The backend must allow your frontend's origin. The Render Express server enables CORS for all origins by default — tighten this in production by setting `CORS_ORIGIN` env var on the backend to your frontend domain (e.g. `https://piis.yourdomain.com`).

## Files

```
frontend/
├── index.html       Markup shell
├── styles.css       Theme tokens + components
├── app.js           State, parsing, charts, briefing rendering
├── config.js        Backend URL (edit before deploy)
├── vercel.json      Vercel static config + headers
└── README.md
```
