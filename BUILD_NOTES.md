# BUILD_NOTES — Lane E Daily Control Report

Engineering log: setup, the human prerequisites, key decisions, and every
assumption made. Update this as the build progresses past Phase 0.

---

## Current build state (v1 scaffold — "mock-first")

Per the build owner's direction, this is the **credential-independent scaffold
with mock data**. Everything that does NOT depend on the real sheet columns is
built and verified:

- ✅ Next.js 15 (App Router, TS, Server Components) + Tailwind 3 design system (§14)
- ✅ Supabase schema migration — bronze/silver/gold + ingestion_log (§7)
- ✅ Auth password gate: middleware + /login + HMAC-signed cookie + rate-limit (§12)
- ✅ Cron endpoint `/api/cron/sync` (GET, secret-protected) + `vercel.json` (§11)
- ✅ "Refresh now" server action
- ✅ Ingestion pipeline with the **adapter contract** (§9/§17) — Sheets adapter
  implemented; lead-tracker normalisation (the spine) implemented
- ✅ Metric layer: funnel math, derived rates, channel ranking, suggested
  decision with transparent reasoning (§10)
- ✅ Full UI shell A–G with mock data, charts, print stylesheet
- ✅ Phase 0 introspection script (`pnpm introspect`)

**Verified locally:** `pnpm build` passes (types valid); the page renders all
sections from mock data; the auth gate redirects to `/login` when configured and
is open when unconfigured; the cron endpoint returns 401 without the secret and
runs (status `skipped`) with it.

### What is NOT done yet (needs credentials + Phase 0 input)

- ❌ **Phase 0 sheet introspection has not been run** — it needs a Google service
  account and the 12 sheets shared with it. The mappings in
  `config/sheet-mapping.ts` are HYPOTHESES marked `PHASE0`.
- ❌ Live data: silver normalisation beyond the lead-tracker spine (channel
  status, social raw, content, PAC, blockers) — stubbed, follows the same
  pattern once Phase 0 confirms columns.
- ✅ **Supabase schema applied** to the existing "Dental Nation" project (see
  next section).
- ❌ No Vercel project provisioned yet.

---

## Supabase — "Dental Nation" project (provisioned)

The existing project was used (not a new one), per the build owner.

- **Project ref:** `wfsovcbyexqnswgrchxh` · **URL:** `https://wfsovcbyexqnswgrchxh.supabase.co`
- Set `NEXT_PUBLIC_SUPABASE_URL=https://wfsovcbyexqnswgrchxh.supabase.co` and
  `SUPABASE_SERVICE_ROLE_KEY=<from Dashboard → Settings → API → service_role>`.

### ⚠️ Schema conflict found — and how it was resolved

The project's `public` schema **already hosts a different application** (a
projects / tasks / components / effort / evidence tracker) **and** a
differently-shaped `daily_snapshot` (`snapshot_date`, `qualified_inquiries`,
`glow_up_bookings`, `best_channel`, `leads_total`, `notes`). Applying this
spec's schema to `public` would have **silently skipped** the colliding
`daily_snapshot` (`create table if not exists`) and broken the app at runtime.

**Resolution:** the entire Lane E schema was created in a dedicated **`lane_e`
Postgres schema**, leaving the existing app 100% untouched. The Supabase client
sets `db: { schema: 'lane_e' }` (see `lib/supabase/server.ts`). All 17 tables
(`leads`, `channel_status`, …, `daily_snapshot`, `ingestion_log`, 10× `raw_*`)
were applied and verified.

> **Open question for the build owner:** that pre-existing `public` schema looks
> like a parallel "Lane E / Dental Nation" build with a different data model. If
> it's meant to be the same initiative, we should decide whether to reconcile the
> two models rather than run them side by side. Flagging rather than assuming.

### Security posture (important)

- **RLS is ENABLED on all 17 `lane_e` tables with no policies.** The dashboard
  only ever uses the **service-role key, server-side** (service-role bypasses
  RLS), so this locks the tables to `anon`/`authenticated` without breaking the
  app. This is the correct posture for a server-only app — do **not** add
  permissive anon policies.
- The `lane_e` schema was exposed to PostgREST via
  `alter role authenticator set pgrst.db_schemas = 'public, graphql_public, lane_e'`
  + `notify pgrst`. **Belt-and-suspenders:** also add `lane_e` under Dashboard →
  Settings → API → **Exposed schemas**, so a platform config reload can't drop
  it. If the app ever gets `PGRST106 / schema must be one of` errors, this is why.

## Human prerequisites (must be done by a person)

1. **Share every spreadsheet** in `config/sheet-mapping.ts` with the
   `GOOGLE_SERVICE_ACCOUNT_EMAIL` as **Viewer**. Without this the Sheets API
   returns 403 and that source becomes a data gap.
2. **Uploaded .xlsx files can't be read** by the Sheets API. If any of the 12
   links is an uploaded Excel file (not a native Google Sheet), open it in
   Sheets → File → Save as Google Sheets, then map the new ID. The Phase 0
   script flags inaccessible sources so you can spot these.
3. **Create the Supabase project**, run `supabase/migrations/0001_init.sql`, and
   put the URL + service-role key in env.
4. Set all env vars (see `.env.example`).

---

## Environment setup

Copy `.env.example` → `.env.local` and fill in. All vars are documented inline
there. Summary:

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase (service-role; never sent to browser) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` | Read-only Sheets access |
| `CRON_SECRET` | Protects `/api/cron/sync` |
| `DASHBOARD_PASSWORD` | The shared password the reviewer enters |
| `AUTH_SESSION_SECRET` | Signs the auth cookie (HMAC) |

> **Auth-gate note:** if `DASHBOARD_PASSWORD` or `AUTH_SESSION_SECRET` are unset,
> the gate is **disabled (open)** so the scaffold is viewable before secrets are
> configured. Set both to activate the gate. (See `middleware.ts`.)

---

## The `GOOGLE_PRIVATE_KEY` `\n` gotcha (the #1 "invalid_grant" cause)

The private key in the service-account JSON contains real newlines, but env vars
store it as a single line with literal `\n` escape sequences. Both
`lib/sync/google-auth.ts` and `scripts/introspect-sheets.ts` do:

```ts
const key = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
```

Without this you get `error:1E08010C:DECODER routines::unsupported` or
`invalid_grant`. Paste the key into `.env.local` exactly as it appears in the
JSON (with the `\n`s) — do not pre-convert it.

---

## Cron: Vercel Pro vs. Hobby decision

`vercel.json` defaults to **hourly** (`0 * * * *`), which **requires Vercel
Pro**. On the **Hobby/free** plan, cron is capped at **once per day** and the
hourly expression fails to deploy. Options:

- **(a) Daily on Hobby** — change the schedule to `0 5 * * *` (05:00 UTC ≈ 09:00
  Dubai) and accept a daily refresh.
- **(b) Hourly via a free external scheduler** — keep the endpoint and point a
  free scheduler (cron-job.org / Crontap) at
  `https://<domain>/api/cron/sync?secret=<CRON_SECRET>` every hour. The endpoint
  is fast and accepts the secret via query string for exactly this.

`vercel.json` can't hold comments (it's strict JSON), so the daily fallback
lives here rather than inline. The `/api/cron/sync` route also sets
`maxDuration = 300` (Pro budget); the sync is chunked to stay well within it.

**Recommendation:** if hourly freshness matters and Pro isn't desired, use
option (b) — it's free and gives hourly cadence.

---

## Timezone (`Asia/Dubai`)

The clinic day boundary is Dubai midnight (UTC+4, no DST). All report-date logic
runs through `lib/dates.ts` (`reportDateForSync`, `dubaiToday`). Vercel cron
fires in UTC; a sync is always attributed to the Dubai-local calendar day it
fires in. The footer renders "Last synced HH:mm (Dubai)".

---

## Decisions & assumptions made past Phase 0

- **Stack pins:** Next 15, React 19, Tailwind 3.4 (not 4 — 3.x is stable with the
  hand-built design system), recharts 2.15 (v2 deprecation warning is benign; v3
  migration deferred), date-fns 3 + date-fns-tz 3, zod 3, `googleapis`.
- **ESLint not wired** into the scaffold so `next build` verifies types only
  (`next.config.ts: eslint.ignoreDuringBuilds`). Add `eslint-config-next` for a
  CI lint step later.
- **Auth via Web Crypto HMAC**, not a JWT library, so the same code runs in Edge
  middleware and Node. 30-day httpOnly+secure cookie. Single shared secret is
  adequate for one trusted reviewer; swap to Supabase Auth (schema already
  present) if named users / audit logging are needed.
- **Rate limiting is in-memory** (per serverless instance) — best-effort. Back it
  with a Supabase counter for hard guarantees.
- **Decision rule ordering** (§10) was slightly reordered for sanity: Stop →
  structural Fix (unattributed share / open tracking-PAC blocker) → Hold (too
  little volume to judge) → rate-based Fix → Continue. Hold precedes the
  rate-based Fix so a noisy low-volume day doesn't fire Fix on an unreliable
  rate. The reasoning string is always shown ("suggested — reviewer overrides").
- **Funnel date semantics:** inquiry stages counted by `inquiry_date`, bookings
  by `booking_date` (fallback inquiry), attended/treatment/proof/reviews by
  `appointment_date` (fallback booking). "Total" is all-time.
- **Booking definition:** a lead counts as a booking if it has a `booking_date`
  or a `booking_status` in {booked, attended, no-show, rescheduled, cancelled}.
- **Spend is out of scope (Sheets-v1).** `cost_per_inquiry` / `cost_per_booking`
  render an explicit owned **data gap**, never a zero. If sheet #7 (DN My
  performance report) turns out to contain a spend column in Phase 0, map it to
  unlock these.
- **Top-of-funnel volume** (reach/impressions/clicks/LP visits/WA+call clicks)
  has no source in v1 → those funnel stages render as data gaps. They are the
  drop-in point for a future GA4/Meta/Ads adapter (§17).
- **Sources #9 and #10** are the same spreadsheet+gid → treated as ONE source
  (`zavis`) unless Phase 0 reveals distinct tabs.
- **Mock data** lives in `lib/mock/report.ts` and deliberately exercises every
  edge state (data gaps, unattributed > ceiling → suggested Fix, founder
  decision required, partial channel activation). The data layer
  (`lib/data.ts`) reads live Supabase when configured and falls back to mock
  otherwise, so the page never crashes.

---

## Architecture for the future (built for, not built)

- `lib/sync/adapters/` is the extension point: each source implements
  `SourceAdapter` (`fetch → RawRow[]`). A GA4/Meta/Google Ads API source is a new
  adapter with the same contract; normalisation downstream is unchanged.
- Weekly Performance Review: the silver/gold model supports 7-day rollups; add a
  `/weekly` route that aggregates `leads` + `daily_snapshot` later.
- Not built: multi-user auth, Slack/email alerting on `partial`/`Stop`,
  per-clinic/per-doctor drill-downs.

---

## Next steps (resume order)

1. Provide Google service-account creds + share the 12 sheets → run
   `pnpm introspect` → review `sheet-introspection.md`.
2. Fill confirmed tabs + headers into `config/sheet-mapping.ts`.
3. Provision Supabase, run the migration, set env → first real sync of the
   **lead tracker** (build step 2: spine end-to-end).
4. Add remaining silver normalisers (channel status, social raw, content, PAC,
   blockers) one at a time.
5. Deploy to Vercel, wire cron, smoke-test the live pull.

---
---

# Tab 2 — Growth Manager Impact Dashboard

Added as a **second navigable tab** (`/impact`) inside this same app — same
Next 15 / pnpm / Tailwind 3 stack, same Supabase project, same password gate.
Built by porting the *logic* of a standalone reference build (npm + Tailwind 4
+ `proxy.ts`) into this repo's conventions. Per the plan: there is exactly ONE
human-in-the-loop gate (the ingestion review/approve step); every other
ambiguity was decided, implemented, and logged here.

## T0. The schema decision (where Tab 2's tables live)

Tab 2's tables live in the **existing `lane_e` Postgres schema**, alongside the
Lane E report tables — **not** `public`, and **not** a new schema. Why:

- The app's service-role client (`lib/supabase/server.ts`) is already bound to
  `lane_e`, so one client serves both tabs and the §7 cross-link to
  `lane_e.daily_snapshot` is trivial — **reuse, don't rebuild**.
- `lane_e` is already in PostgREST's exposed schemas, so there's **no new
  dashboard step** (a new schema would need exposing, a silent-failure trap).
- No name collisions inside `lane_e` (it has `blockers`/`ingestion_log`; Tab 2
  adds the distinct `project_blockers`/`ingestion_jobs`, plus
  `components`/`projects`/`tasks`/`evidence_files`/`effort_log`).

> The project's **`public`** schema already contains a *stale standalone copy*
> of these exact tables (`public.projects` had demo rows) from the reference
> build, plus unrelated apps. Tab 2 does **not** touch `public`; those tables
> are orphaned/ignored per the plan ("ignore/delete the standalone build").

Migration: `supabase/migrations/0002_impact_dashboard.sql` (applied to project
`wfsovcbyexqnswgrchxh`). Text PKs default `gen_random_uuid()::text`;
`updated_at` is bumped by a `lane_e.set_updated_at()` trigger on
`projects`/`tasks`. RLS is **enabled with no policies** on all seven tables —
identical posture to Lane E (service-role bypasses RLS; anon/authenticated read
nothing).

## T1. The cross-link READS the existing Lane E snapshot (never duplicates)

`getLaneESnapshot()` (`lib/impact/data.ts`) reads the latest
`lane_e.daily_snapshot` row and maps **this app's real snapshot shape** — the
`funnel` jsonb array (`qualified_inquiries` / `glow_up_bookings` stage totals)
plus `best_channel` — onto the few fields the Impact tab attributes. It is
read-only and resilient: no snapshot (it's empty until the Lane E sync runs) or
unconfigured Supabase → returns null and the "live — from Lane E" tags simply
hide. The tags render under the **Lead Generation** and **Online Marketing**
component cards (`LANE_E_COMPONENTS`).

## T2. Navigation / routing

Lane E moved into an `app/(app)/` route group (URL unchanged, still `/`) so the
report and the Impact tab share one sticky `TopNav` (tabs: **Impact** /
**Lane E Report**). `/login` stays outside the group (no nav). Same gate, one
login; a `logout` server action (`app/(app)/actions.ts`) clears the cookie.

## T3. The human-in-the-loop guarantee (the ONE gate) — ENFORCED

**Hard rule, restated in `app/(app)/impact/review/actions.ts`:** the live
dashboard reflects ONLY rows in `projects`/`tasks`. The ONLY path from an
ingestion job to those tables is an explicit **Approve** on
`/impact/review/[jobId]` (`applyReviewAction`). No auto-apply, no
high-confidence shortcut.

- `POST /api/ingest` writes ONLY an `ingestion_jobs` row (`pending_review`) for
  the LLM path. (The Zoho path additionally upserts *trusted* task rows as
  orphans — structured task data is trusted per §5b; the project grouping is
  still gated.)
- **Reject** (`rejectReviewAction`) marks the job `rejected` and writes nothing.
- **"Do nothing"** (navigating away) writes nothing.
- The reviewer edits every field, toggles ownership/timeline, includes/excludes
  each item, and accepts/rejects matched-project updates per field. Unmapped
  items are shown (never dropped) and can be converted to a project.
- `/impact/review` lists the pending queue so jobs are findable after leaving.

## T4. Claude extraction — model, prompt, JSON schema (`lib/ingest/extract.ts`)

- **Model:** `claude-sonnet-4-6`, via `@anthropic-ai/sdk`, server-side only.
- **Inputs:** PDF → base64 `document` block; Excel/CSV → SheetJS → markdown
  table; HTML → `node-html-parser` structured text; pasted text → as-is (capped
  100K chars). The live catalog (every component id+name and every existing
  project id/name/component/status) is embedded so the model aligns to and
  dedupes against what exists.
- **Output JSON schema** (strict JSON only, no fences):
  ```json
  { "matched_projects":[{"project_id","proposed_updates":{"status","progress_pct","impact_summary","target_date"},"evidence","confidence"}],
    "new_projects":[{"component_id","name","description","suggested_status","suggested_target_date","ownership","rationale","confidence"}],
    "new_tasks":[{"project_ref","name","status","effort_hours","due_date"}],
    "unmapped":[], "notes":"" }
  ```
- **Defensive parse** (`parseExtraction`): strip ``` fences → slice the
  outermost `{…}` → `JSON.parse`. On any failure (or missing `ANTHROPIC_API_KEY`)
  it returns a result carrying `parse_error` + `raw_output`, surfaced on the
  review screen. It never crashes and never writes.

## T5. Zoho structural import (`config/zoho-mapping.ts`, `lib/ingest/zoho.ts`)

Mapped by header name (case-insensitive). On first import the route logs the
header row + 3 sample rows (`[zoho-import]`) — extend the candidate lists if a
column isn't picked up.

| Canonical field | Accepted headers (lowercased) |
| --- | --- |
| `external_id` | task id, id, taskid, task id#, task_id |
| `name` | task name, task, name, title, subject |
| `project_group` | task list, tasklist, task list name, project, project name, milestone |
| `status` | status, task status |
| `progress` | % completed, percent complete, completion, % complete, progress |
| `owner` | owner, assignee, assigned to, owner name |
| `start_date` / `due_date` / `completed_date` | start date/start · due date/end date/due/deadline · completed date/completion date/closed date |
| `effort_hours` | work, logged hours, work hours, hours, actual time, log hours, time spent |

- **Detection:** a tabular file is Zoho when it has a task-name column + one of
  id/status/grouping (`looksLikeZoho`).
- **Dedupe by `external_id` in code** (a partial unique index can't be an
  `ON CONFLICT` target): fetch existing ids → update vs insert. Re-import never
  duplicates. Tasks land as orphans (`project_id` null).
- **Only the grouping is a suggestion:** distinct task-list values → proposed
  projects (component guessed by keyword) or matched to existing projects, with
  the task `external_id`s attached — routed through the review gate. On approve,
  projects are created/assigned and each task's logged hours roll into
  `effort_log` (source `zoho`). Status map: completed/closed→done,
  progress/started→in_progress, block/hold/waiting→blocked, else open.

## T6. Effort sourcing is honest (non-negotiable)

`effort_log` is the canonical hours store (Zoho logged hours + manual entries).
A project's `effort_hours`/`effort_source` is recomputed from its logs
(`lib/impact/effort.ts`). **No logs → `effort_hours` stays null and the UI shows
task/project counts — hours are never invented.** Every headline carries its
source inline ("412 logged hrs (Zoho)" / "14 tasks across 5 projects — hours not
tracked").

## T7. Storage / evidence locker

Private bucket **`evidence`** (created in migration 0002). Uploads (authoring
drawer or per-project "attach file") write to Storage + an `evidence_files`
row. The locker serves each file via a short-lived **(60s) signed URL**
(`GET /api/evidence/[id]`, which also enforces `visible_to_ceo`). The bucket is
never public.

## T8. Design / charts

The ported components use token aliases added to `tailwind.config.ts`
(`paper/panel/ink-2/ink-3/hairline/accent-strong/accent-weak/ok/warn/bad/muted`
+ `-weak`) that map onto Lane E's exact palette — one shared visual language.
Lane E's single-accent discipline is kept: the status donut uses the semantic
set, but the by-component bars are **monochrome accent (no rainbow)** —
`COMPONENT_HUE` is intentionally all-accent. The roadmap is a **hand-rolled
CSS/SVG Gantt** (no chart library); collaborator bars are dashed, with a today
marker. Print: page breaks between major sections, A4, hairline borders.

## T9. ANTHROPIC_API_KEY setup

Add `ANTHROPIC_API_KEY` (server-side) in `.env.local` and the Vercel project.
Without it, ingestion still stores the raw upload and shows an "extraction
skipped" note on review; Zoho import and manual CRUD don't need it. (See
`.env.example`.)

## T10. ⚠️ Pre-existing security issue surfaced (NOT introduced here, NOT mine to fix)

A Supabase advisor reports **RLS disabled** on six `public` tables that belong
to a *different* app sharing this project: `public.brand_kit`, `guidelines`,
`assets`, `jobs`, `briefs`, `renders`. With the anon key these are
world-readable/writable. Tab 2 doesn't touch them (it lives in `lane_e` with RLS
on). **Recommendation for the owner:** enable RLS + add policies on those tables.

## T11. Decisions & assumptions (Tab 2)

- Tables in `lane_e` (see T0), reusing the one service-role client; the
  standalone reference build's `public` tables are ignored, not migrated.
- The cross-link maps this app's real `daily_snapshot.funnel` jsonb rather than
  the reference build's flat `qualified_inquiries`/`glow_up_bookings` columns.
- Lane E kept at `/`; Impact added at `/impact` via an `(app)` route group +
  shared TopNav. A global "Add update" drawer shows on both tabs (harmless on
  Lane E; matches the reference shell).
- Graceful degradation kept (Lane E philosophy): when Supabase is unconfigured,
  the read layer returns empty data + the six fixed components, so `/impact`
  renders its empty states instead of crashing.
- Added a `/impact/review` queue page (the reference build had none) so pending
  jobs are findable after navigating away.
- `next build` passes (types valid); ESLint stays out of the build (unchanged).
