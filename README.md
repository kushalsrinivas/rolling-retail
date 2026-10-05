# Rolling Retail

White-label design software for builders of food trucks and activation
vehicles. Buyers configure their own truck — style quiz, AI concepts, layout,
menu board, video, 3D, spec package — and the factory gets a quotable
specification plus a CMS record of every run.

## Run it

```bash
npm install
cp .env.example .env   # fill in GOOGLE_API_KEY at minimum
npm run dev            # http://localhost:3000
```

Without `GOOGLE_API_KEY` the app still runs with placeholder renders, so the
demo never dies. See `.env.example` — every variable is documented there.

## Routes

| Route | What it is |
| --- | --- |
| `/` | Marketing homepage (buyer-facing, B2C) |
| `/trucks`, `/trucks/$slug` | The six bodies — specs, planning ranges, Product schema |
| `/use-cases`, `/use-cases/$slug` | Per-business layouts (snapshot of `layoutFor`, test-enforced) |
| `/resources`, `/resources/$slug` | Guides / blog (`src/content/articles-*.ts`) |
| `/stories`, `/stories/$slug` | Customer stories — **illustrative**, labelled on every page |
| `/how-it-works`, `/pricing`, `/faq`, `/about` | Core marketing pages |
| `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/llms-full.txt` | Generated from `src/lib/site-index.ts` |
| `/chat` | The designer: 7-step brief quiz → AI concepts → build & spec tabs |
| `/studio` | Standalone 3D playground (needs `RODIN_API_KEY`), noindex |
| `/report` | Location-scoring reports, ADK-era (needs `DATABASE_URL`), noindex |
| `/admin` | Staff CMS (token-gated), noindex |

SEO lives in `src/lib/site.ts` (`pageHead()` + JSON-LD builders). Set
`VITE_SITE_URL` in production so canonicals and the sitemap use the real
domain. Image and video prompts are ASD-STE100 documents built by
`src/lib/food-truck/ste.ts`; `ste.test.ts` lints every prompt.

API lives in `src/routes/api/agent/*` — session, chat (SSE), intake,
quiz-step, images, design versions, approvals, menu, video, package PDF,
leads, submissions. One process, same origin, no separate backend URL.

## Key concepts

- **Quiz** (`src/lib/food-truck/quiz.ts` + `StyleQuizFlow.tsx`): star-pick
  rounds collapse to the same answer record the old intake produced, so the
  render pipeline is untouched. Style cards take an optional `image`
  (`public/quiz/*.jpg`); gradients stand in until then.
- **Design record** (`design-record.ts`): immutable versioned spec — every
  render, video and PDF reads it. Revisions append children, never mutate.
- **Sessions** (`session.ts` + `store.ts`): in-memory with disk snapshots in
  `data/` — the always-on record. Postgres models exist for the `/report`
  side only.
- **Analytics** (`src/lib/track.ts`): `quiz_started/step/completed`,
  `design_approved`. Silent no-op without `VITE_POSTHOG_KEY`.
- **Staff**: `FACTORY_DASHBOARD_TOKEN` gates `/api/agent/leads` and
  `/api/agent/submissions`; `/admin` sends it as `x-factory-token`.

## Verify

```bash
npm run test    # vitest, 200+ tests
npm run check   # biome lint + format check
```
