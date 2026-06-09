# First Rank Pro – Proxy Server

Backend proxy + AI API for the **First Rank Pro** Framer plugin (the Vite/React app in the
repository root). It is a standalone Next.js app deployed to Vercel and is kept in this repo
so the plugin and its backend live together.

Production deployment: `https://first-rank-proxy.vercel.app`

## Endpoints

| Route | Purpose |
| --- | --- |
| `GET /api/proxy?url=<page>` | CORS-friendly proxy that fetches page HTML so the plugin can analyze pages (supports `allow404=true`). |
| `POST /api/ai-generate` | Generates SEO suggestions (keyword / title / meta / h1) from extracted page data. |
| `POST /api/generate-alt-text` | Generates image alt text. |

These are consumed by the plugin via `src/services/seoService.ts` and
`src/services/aiService.ts`. To point the plugin at a local instance, set in the root `.env.local`:

```
VITE_AI_API_URL=http://localhost:3000/api/ai-generate
VITE_ALT_TEXT_API_URL=http://localhost:3000/api/generate-alt-text
```

## Local development

```bash
cd proxy-server
npm install
npm run dev      # next dev on http://localhost:3000
```

## Environment variables

Set these in Vercel (and in `proxy-server/.env.local` for local runs):

- `ANTHROPIC_API_KEY` – Anthropic API key (used by `/api/ai-generate`).
- `OPENAI_API_KEY` – OpenAI API key (used by `/api/ai-generate` and `/api/generate-alt-text`).
- `GOOGLE_GEMINI_API_KEY` – Google Gemini API key (used by `/api/generate-alt-text`).

## Deploy

```bash
cd proxy-server
npm run deploy   # vercel deploy --prod
```
