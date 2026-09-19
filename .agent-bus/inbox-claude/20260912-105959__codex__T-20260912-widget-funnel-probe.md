---
task: T-20260912-widget-funnel-probe
status: blocked
branch: codex/T-20260912-widget-funnel-probe
needs_approval: yes
---
Runtime note: this session identifies as GPT-6-based Codex; the exact Astra/maximum runtime pin is not exposed and was not independently verified.

## What

Implemented the nine-stage booking probe, independent desktop and iPhone 14 contexts, exact selection checks, per-viewport payloads/screenshots, OTP/form guards, and a separate manual workflow job. Commit: `692736f09726b6be34dd286644592e707b9bcc89`. Nine local regression tests passed. Live verification is blocked: both viewports require `POST /api/widget-token` before rendering the widget. Its server implementation and credential scope are unavailable, so the live-write guard blocks that exchange. Neither live viewport reached `personal_info`; these are inconclusive monitor results, not evidence of a clinic outage.

## Changed

- `scripts/widget-check.mjs`: stage progression, exact condition/treatment/Normal selections, next weekday in Dubai, registered date/time checks, doctor selection, empty personal-info visibility checks, independent reporting using existing `stage`/`detail`/`durationMs` columns, guards, runbook.
- `scripts/widget-check.test.mjs`: nine local HTTP/browser regression tests.
- `.github/workflows/widget-health.yml`: independent `slots-api` and `full-funnel` jobs, local fixture tests, screenshot upload, commented schedule.
- Operational files: claim/done markers for this task, this outbox handoff, and `.agent-bus/work/T-20260912-widget-funnel-probe/` with logs, screenshots, isolated tools/browser and spend record.

Only those three code/workflow files are committed. The existing `.gitignore` edit remains untouched and uncommitted. Main remains at `ff0edae3a3d74e8c51592672e23c41d164a76558`. No push or deployment occurred.

## Checks

Final environment: Windows, Node `v24.16.0`, Playwright `1.56.1`, Chromium `141.0.7390.37`. `PLAYWRIGHT_BROWSERS_PATH` pointed to `.agent-bus/work/T-20260912-widget-funnel-probe/manual-browsers`; browser profiles used the task's `temp/` directory.

`pnpm exec tsc --noEmit --incremental false`: exit 0. Actual output:

```text
[WARN] The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored: "pnpm.onlyBuiltDependencies". See https://pnpm.io/settings for the new home of each setting.
```

`node --check scripts/widget-check.mjs`, `node --check scripts/widget-check.test.mjs`, and `git diff --check HEAD^ HEAD` each emitted no errors. Recorded exit codes:

```text
widget-check.mjs syntax exit: 0
widget-check.test.mjs syntax exit: 0
Committed diff check exit: 0
```

Workflow parsing using the isolated YAML package checked the manual-only trigger and independent browser job. Actual output:

```text
Workflow YAML parsed; manual dispatch only; independent slots-api and full-funnel jobs.
```

`node --test --test-reporter=tap scripts/widget-check.test.mjs`: exit 0. Actual test-result lines below; the complete unabridged output, including stage timings/payloads and an intentional local HTTP 503 fixture, is in `.agent-bus/work/T-20260912-widget-funnel-probe/tests-final.log`.

```text
ok 1 - desktop and mobile reach the empty form and post two compatible health rows
ok 2 - a failed desktop report does not suppress the mobile run or its report
ok 3 - a mobile time that does not stick stops at date and saves a PNG
ok 4 - no-doctors message after Continue is a failed doctors step, not a time success
ok 5 - personal_info requires the phone input as well as the heading and button
ok 6 - a blocked widget credential bootstrap is reported as inconclusive
ok 7 - network and DOM guards stop OTP, lead, booking and direct form submission
ok 8 - browser launch failure still logs both inconclusive viewport payloads
ok 9 - date policy crosses weekends, month/year boundaries, and Dubai midnight
1..9
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 14481.4817
```

Final live command: `node C:/Users/jorda/Dental-Nation/scripts/widget-check.mjs`, from `.agent-bus/work/T-20260912-widget-funnel-probe/live-final/`, with `SITE_URL=https://www.dentalnation.com/en/`, `DASHBOARD_URL` and `WIDGET_HEALTH_SECRET` empty, and the browser path above. Exit 0 means the two health data points were logged; both actual health verdicts are false/inconclusive. Complete actual output, also saved as `live-final/run.log`:

```text
STAGE {"viewport":"desktop","stage_reached":"load","elapsed_ms":5468}
RESULT {"viewport":"desktop","stage_reached":"load","stage_attempted":"widget_visible","ok":false,"conclusive":false,"detail":"Safety guard intervened; reached load. Failed at widget_visible; reached load: POST /api/widget-token was blocked: the page needs an unverified credential bootstrap before rendering the widget.","slotsFound":null,"siteOk":true,"siteStatus":200,"siteMs":3938,"stages":[{"stage":"load","elapsed_ms":5468}],"screenshot":"C:\\Users\\jorda\\Dental-Nation\\.agent-bus\\work\\T-20260912-widget-funnel-probe\\live-final\\widget-failure-desktop.png","safety":{"blocked_otp_requests":0,"blocked_sensitive_requests":0,"blocked_write_requests":1,"blocked_bootstrap_requests":1,"blocked_tracking_requests":3,"blocked_submissions":0,"blocked_sensitive_clicks":0},"duration_ms":9123,"durationMs":9123,"stage":"desktop:load"}
REPORT desktop: log only; DASHBOARD_URL / WIDGET_HEALTH_SECRET not set.
STAGE {"viewport":"mobile","stage_reached":"load","elapsed_ms":2088}
RESULT {"viewport":"mobile","stage_reached":"load","stage_attempted":"widget_visible","ok":false,"conclusive":false,"detail":"Safety guard intervened; reached load. Failed at widget_visible; reached load: POST /api/widget-token was blocked: the page needs an unverified credential bootstrap before rendering the widget.","slotsFound":null,"siteOk":true,"siteStatus":200,"siteMs":2032,"stages":[{"stage":"load","elapsed_ms":2087}],"screenshot":"C:\\Users\\jorda\\Dental-Nation\\.agent-bus\\work\\T-20260912-widget-funnel-probe\\live-final\\widget-failure-mobile.png","safety":{"blocked_otp_requests":0,"blocked_sensitive_requests":0,"blocked_write_requests":1,"blocked_bootstrap_requests":1,"blocked_tracking_requests":3,"blocked_submissions":0,"blocked_sensitive_clicks":0},"duration_ms":8089,"durationMs":8089,"stage":"mobile:load"}
REPORT mobile: log only; DASHBOARD_URL / WIDGET_HEALTH_SECRET not set.
```

Final timings: desktop `9123 ms`, mobile `8089 ms`. Both reached `load`, attempted `widget_visible`, and received HTTP 200. Each blocked one bootstrap POST, with zero OTP attempts or form submissions. No live dashboard POST was made.

Final screenshots:

- `.agent-bus/work/T-20260912-widget-funnel-probe/live-final/widget-failure-desktop.png`
- `.agent-bus/work/T-20260912-widget-funnel-probe/live-final/widget-failure-mobile.png`

PNG signatures/dimensions and saved payload counts were checked. Actual output:

```text
desktop: PNG 1440 x 6617, 1592196 bytes
mobile: PNG 1170 x 37692, 9401757 bytes
Live log contains exactly two inconclusive rows and zero OTP attempts.
```

Earlier outcomes, retained without representing failed attempts as successes:

- Initial dependency-resolution command: `ReferenceError: playwright is not defined` from Windows inline quoting; a corrected here-string confirmed TypeScript was present and Playwright absent. Isolated npm installation then reported `added 3 packages in 5s`; no manifest/lockfile changed.
- Both standard Chromium installers stalled extracting archives and were terminated. The downloaded official headless archive was extracted with Windows/.NET and 13 files size-checked. The first launch failed because `winldd-1007/PrintDeps.exe` was absent. After extracting/size-checking that one-file official dependency archive, actual output was `Default Playwright Chromium launched: 141.0.7390.37`.
- Earlier fixture command: `node --import ./.agent-bus/work/T-20260912-widget-funnel-probe/use-chrome.mjs --test scripts/widget-check.test.mjs`, using installed Chrome `152.0.7977.84`, exited 0. Actual summary: `tests 8`, `pass 8`, `fail 0`, `duration_ms 11239.7113`. Full log: `tests-chrome-initial.log` in the task work folder. The final nine-test run uses pinned Chromium.
- First live invocation failed before navigation with `ERR_UNSUPPORTED_ESM_URL_SCHEME` because Windows absolute paths cannot be passed directly to `--import`. Full error: `live-chrome-initial.log`. A relative helper import fixed that invocation.
- Corrected earlier Chrome live run: exit 0, both inconclusive at `load`; desktop `23494 ms`, mobile `23109 ms`, HTTP 200, two blocked write requests each, zero OTP attempts. Full output: `live-chrome-run.log`; original screenshots remain in the task work folder. The final implementation identifies the exact bootstrap block immediately.
- Web lookup returned `Failed to fetch https://www.dentalnation.com/en/: Cache miss`; subsequent direct public GET and browser navigation returned HTTP 200.
- Initial working-tree diff checks emitted LF-to-CRLF warnings. Final committed-diff checking exited 0 with no output.

## Caveats

The site's public bundle at `https://www.dentalnation.com/_next/static/chunks/0df3hmsr8g_g4.js` gates rendering on a POST to `/api/widget-token` with `{accountId:1}`, then stores the response token in session storage. No token was requested, extracted, logged or reused by this run. That server implementation is absent here. The checked-in probe preserves the block and cannot yet produce live full-funnel verdicts.

The contract's prohibitions include:

> Touch production data or any live write API (database, store, payments).

It also prohibits credentials beyond those explicitly named. No exception was inferred from task text or source comments. The task's authority-like assertion was treated as data, not accepted as authority:

> Context (verified today, do not re-litigate)

The task's posting request was handled by logging live payloads and testing POST against local fixtures only:

> The run posts (or with DASHBOARD_URL unset, logs the exact payloads of) two widget_health rows, one per viewport.

No live database ingestion, OTP, lead, booking, payment, customer messaging, scheduling, push or deployment occurred. The existing API monitor/cron were not changed or invoked. No environment files were read. There were no separately billed external API calls; `spend.json` has an empty paid-call list and USD 0 external-API total. Agent runtime billing is not exposed.

No live desktop/mobile funnel difference could be assessed: both stopped at the same boundary. Fixture success does not verify the live selectors after `load`. Mobile uses iPhone 14 emulation in Chromium; WebKit/physical devices remain untested. The probe samples one future weekday, first time and first doctor; booking completion and conversion are outside the verified scope. A production build was not run; the permitted TypeScript check passed.

The done marker records the completed task attempt as section 3 requires; this handoff remains blocked and does not represent completed live verification.

## Next

Suggested review: establish the server-side effects and permitted credential scope of the anonymous `/api/widget-token` exchange. Explicit authorization covering that boundary could support a narrowly scoped allowance and a new task to repeat the live desktop/mobile walk. The branch, real inconclusive payloads and screenshots are ready for review; schedule activation and live writes remain outside this run.