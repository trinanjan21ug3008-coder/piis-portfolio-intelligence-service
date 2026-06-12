/**
 * PIIS frontend configuration
 *
 * Set PIIS_BRIEFING_ENDPOINT to the absolute URL of your backend's
 * /api/briefing endpoint.
 *
 * Examples:
 *   Render:               https://piis-api.onrender.com/api/briefing
 *   Fly.io:               https://piis-api.fly.dev/api/briefing
 *   Railway:              https://piis-api.up.railway.app/api/briefing
 *   Cloudflare Worker:    https://piis-briefing.<account>.workers.dev/api/briefing
 *   Same-origin (Netlify/CF Pages where backend is co-deployed):
 *     leave undefined — frontend defaults to "/api/briefing"
 *
 * For Vercel, you can also inject this at deploy time using the
 * NEXT_PUBLIC_* style by uncommenting the inline-replace block in
 * vercel.json (advanced). For most teams, editing this file before
 * deploy is the simplest path.
 */
window.PIIS_BRIEFING_ENDPOINT = 'https://piis-briefing.onrender.com/api/briefing';

// Optional: disable the daily auto-trigger of the briefing on page load.
// Useful in production if you want users to explicitly press the button.
// window.PIIS_AUTO_BRIEFING = false;
