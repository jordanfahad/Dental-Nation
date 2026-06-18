# Lane E — Daily Control Report

A password-protected executive dashboard for **Dental Nation · Lane E**. It
answers one question per day — *Is Lane E becoming a controlled
patient-acquisition engine?* — with a decision-first, McKinsey-style layout.

Data is pulled on a schedule from Google Sheets (read-only), cached in Supabase
(bronze → silver → gold), and rendered as a precomputed daily snapshot. The UI
never reads Google directly and never computes heavy aggregates at request time.

## Stack

Next.js 15 (App Router, Server Components, TS) · Supabase (Postgres) · Google
Sheets API (`googleapis`) · Recharts · Tailwind 3 · date-fns (Asia/Dubai) · zod.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # then fill it in (see BUILD_NOTES.md)
pnpm dev                     # http://localhost:3000
```

Without Supabase/Google credentials the app runs in **mock mode** (a "Mock data"
badge shows in the header) so the full UI is reviewable immediately.

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js dev / production build / serve |
| `pnpm introspect` | **Phase 0** — introspect the 12 sheets → `sheet-introspection.md` |

## How it works

- **Ingestion** (`lib/sync/`): each source is an adapter (`fetch → RawRow[]`).
  `/api/cron/sync` mirrors raw rows to bronze, normalises to silver, computes the
  gold `daily_snapshot`, and logs sync health. A single sheet failing → `partial`,
  never an aborted run.
- **Metrics** (`lib/metrics/`): funnel math, derived rates (null-guarded, never a
  fabricated zero), channel ranking by quality, and a transparent *suggested*
  decision (Continue / Fix / Hold / Stop) that always shows its reasoning.
- **UI** (`app/page.tsx` + `components/sections/`): sections A–G — executive
  summary, channel activation, tracking integrity, daily funnel, content,
  PAC/WhatsApp feedback, blockers. Prints cleanly to A4.
- **Auth** (`middleware.ts`): a shared-password gate with an HMAC-signed cookie.
- **Cron** (`vercel.json`): hourly on Vercel Pro; see BUILD_NOTES for the Hobby
  (daily) and external-scheduler alternatives.

## Tab 2 — Growth Manager Impact Dashboard (`/impact`)

A second tab behind the **same** password gate (no second login) makes the case
for the growth manager across six functions (Online Marketing · SEO · AI SEO ·
Website Growth · Lead Generation · Hiring). Outcomes-first: hero KPIs, six
swimlanes, a hand-rolled roadmap Gantt, blockers, honest effort (counts when
hours aren't tracked — never invented), impact-by-function, and a signed-URL
evidence locker. It cross-links the live Lane E snapshot under Lead Gen /
Marketing.

Updates flow through **one human gate**: paste text or drop a file (PDF / Excel
/ CSV / HTML / Zoho export) → `/api/ingest` extracts a proposal with Claude
(`claude-sonnet-4-6`) → you review and **Approve** on `/impact/review/[jobId]`.
Nothing reaches the dashboard without that approval; Zoho exports import
structurally and dedupe by task id. Its tables live in the `lane_e` schema
(migration `0002`). See **BUILD_NOTES.md → Tab 2** for the full design.

## Configuration lives in one place

- `config/sheet-mapping.ts` — every sheet → canonical column mapping (the only
  place column names appear). Fill from Phase 0.
- `config/decision-rules.ts` — decision thresholds.
- `config/data-gap-owners.ts` — default owner per data-gap area.
- `config/channels.ts` — canonical channel list.

See **BUILD_NOTES.md** for env setup, the service-account sharing step, the
`GOOGLE_PRIVATE_KEY` newline gotcha, the Pro-vs-Hobby cron decision, and the full
list of assumptions made.
