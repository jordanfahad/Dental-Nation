# T-20260912-widget-probe-liverun — Run the full-funnel probe LIVE, both viewports

**Mode:** repo (continue on branch `codex/T-20260912-widget-funnel-probe`)
**Approval:** GRANTED — see `.agent-bus/approvals/DECIDED.md` → `REQ-20260912-widget-probe-live-run`.
Fahad authorised the probe to make the anonymous `POST /api/widget-token {accountId:1}`
bootstrap call (read-only session-token mint the public site requires to render the widget).

## Why this task exists

Your previous run (task T-20260912-widget-funnel-probe, same branch) built the probe
correctly but your safety guard blocked `/api/widget-token`, so both viewports stopped at
`load` — inconclusive. That block is now explicitly lifted for THIS one call only.

## What to do

1. Adjust the probe's guard so the SINGLE bootstrap call `POST /api/widget-token`
   (body `{accountId:1}` or whatever the site sends) is ALLOWED — and ONLY that call.
   Every other guard stays exactly as-is.
2. Run the probe live against `SITE_URL=https://www.dentalnation.com/en/` for BOTH
   desktop and iPhone-14 viewports.
3. Walk as deep as the funnel allows on each viewport:
   load → widget_visible → condition → treatment → visit_type → date → time → doctors
   → personal_info, then STOP (personal-info form visible = success; never Send OTP).
4. Capture per-viewport: deepest stage reached, timing per stage, and a screenshot at
   the point of failure (or at personal_info if it completes).

## STILL PROHIBITED (unchanged)

OTP requests, entering a phone number, clicking Send OTP, submitting the personal-info
form, any booking/payment/lead write, reusing the token outside this run, committing to
main, deploying, enabling the workflow schedule.

## Deliverables

- The exact per-stage result for desktop AND mobile — this is the whole point:
  **where does each viewport stop, and do they differ?**
- Screenshots for each viewport at its stopping point.
- If a stage fails, the concrete reason (selector missing, element not interactable,
  network error, JS error in console) — enough for the VPS site team to act on.
- Handoff to `.agent-bus/outbox/T-20260912-widget-probe-liverun.md` with the raw
  per-stage output pasted in, screenshot paths, and a plain-English verdict:
  "desktop reaches X, mobile reaches Y, the break is at Z because <reason>."

## Acceptance criteria (Claude will re-derive)

- Both viewports ran live; each reports a stage deeper than `load` OR a concrete
  technical reason it could not (with console/network evidence).
- Exactly the ONE approved bootstrap POST was allowed; guard logs show zero OTP,
  zero submissions, zero other writes.
- No commits on main; branch only. `tsc` still clean.
