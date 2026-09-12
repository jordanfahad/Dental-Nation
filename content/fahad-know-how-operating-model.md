# E-commerce Operating Model: Reference Structure and Interaction Design

**Purpose of this file:** Complete content model and build spec for an interactive "How a large-scale omni-channel retail business runs" page. Reference case: Al Tayer Group, Bloomingdale's fashion, luxury and beauty platform (online + physical stores). Audience: Mr. Akbar Mohammadlou, CEO, Dental Nation. Author: Fahad.

**For Claude Code:** Sections 1 to 8 are content. Section 9 is the build spec. Build everything from the JSON data model in Section 9.2 so the content can be edited without touching components. No backend needed; ship as static data first.

---

## 1. Design principles behind the structure

These are the rules the whole model is built on. Every department, meeting and handoff below exists to enforce one of them.

1. **One P&L owner.** The VP owns online + omni-channel revenue and margin. Nobody else has a competing target.
2. **Revenue and margin are owned by different people.** Marketing is paid to grow revenue. Trading is paid to protect margin. They are forced to negotiate every promotion. This is the single most important design choice.
3. **Product enters through one door, gets sold through many.** Buying and Planning decide what comes in. Online, stores, marketplaces and CRM are all channels selling the same stock pool.
4. **Stores are a channel and a fulfilment node, not a separate business.** Store teams sell online stock, fulfil online orders, take online returns and feed customer insight back. They are measured on omni-channel contribution, not just till sales.
5. **Nothing goes live without three sign-offs.** Live and in stock (Content + Planning), margin-approved (Trading), traffic-planned (Marketing).
6. **One set of numbers.** Finance publishes the daily and weekly figures. Every meeting argues from the same sheet.
7. **Fixed cadence, named owners, written decisions.** Every meeting has an owner, an input pack, a decision log. Anything not decided in a meeting is escalated to the VP within 24 hours, not left open.
8. **Tech capacity is a commercial decision.** The trade meeting sets development priority by expected revenue impact.

---

## 2. Organisation chart

```
VP, E-commerce & Omni-channel  (P&L owner)
│
├── Buying                     Product, brands, supplier terms
├── Planning                   Stock, OTB, allocation, forecast
├── Marketing
│     ├── Digital Marketing    Paid, SEO, affiliates, CRM/email, marketplaces
│     └── Offline Marketing    Brand, PR, events, mall media, store activation
├── Trading / Merchandising    Margin, pricing, promotions, onsite merchandising, sell-through
├── Content                    Studio, product data, copy, translation, campaign creative
├── Development
│     ├── Front-end            Site, checkout, mobile, A/B builds
│     ├── Back-end             Integrations, OMS, PIM, payments, search
│     └── QA                   Release testing, peak readiness, incident follow-up
├── Finance                    P&L, budget control, reconciliation, business cases
│
└── Retail Operations (dotted line: reports to Group Retail, works daily with E-commerce)
      ├── Store Management     Store P&L, staffing, omni-channel targets
      ├── Visual Merchandising Window and floor presentation aligned to online campaigns
      ├── Store Fulfilment     Click & collect, ship-from-store, in-store returns
      ├── Customer Service     Contact centre, live chat, WhatsApp, order issues
      └── Warehouse & Logistics Receiving, pick/pack, last mile, returns processing
```

Retail Operations sits outside the direct reporting line but is inside the operating model. The VP and the Head of Retail co-own the omni-channel targets and sit in the same Monday trade meeting.

---

## 3. Department profiles

Each profile has the same seven fields so the UI can render them identically.

### 3.1 VP, E-commerce & Omni-channel
- **Mandate:** Own the online and omni-channel P&L. Arbitrate between functions on the numbers.
- **Owns:** Revenue, contribution margin, stock health, customer growth, platform stability.
- **Inputs needed:** Friday flash report (Finance), Monday trade pack (Trading + Planning), monthly P&L.
- **Outputs produced:** Weekly decision log, quarterly priorities, budget and headcount decisions.
- **KPIs:** Net revenue vs budget, contribution margin after marketing, stock weeks cover, active customers, NPS.
- **Talks daily to:** Trading, Finance, Marketing. Weekly to all heads. Monthly to Group leadership and Head of Retail.
- **Escalation rule:** Any cross-team disagreement not resolved in its forum lands with the VP within 24 hours with a one-page brief from each side.

### 3.2 Buying
- **Mandate:** Own the range. Decide what the business sells, from which brands, at what cost.
- **Owns:** Brand relationships, range architecture, cost price, supplier terms, exclusives, launch calendar.
- **Inputs needed:** OTB budget by category (Planning), sell-through and margin by brand (Trading), customer search demand and zero-result terms (Marketing), store customer requests (Store Management).
- **Outputs produced:** Seasonal buy, launch calendar (rolling 12 weeks), supplier funding for promotions and markdowns, product briefs for Content.
- **KPIs:** Intake vs plan, initial margin, range productivity per brand, exclusives launched, supplier-funded promotion value.
- **Talks daily to:** Planning, Trading. Weekly to Marketing and Content. Monthly to Store Management.
- **Escalation rule:** A brand that misses sell-through target two seasons running is reviewed for range reduction. Buying cannot overrule without VP sign-off.

### 3.3 Planning
- **Mandate:** Own stock and cash. Turn the sales plan into an open-to-buy and keep inventory productive.
- **Owns:** Sales/stock/intake plan, OTB, allocation between DC and stores, size and depth ratios, replenishment, forecast.
- **Inputs needed:** Sales forecast by channel (Marketing + Trading), store sell-through (Store Management), intake dates (Buying, Warehouse), markdown plan (Trading).
- **Outputs produced:** Weekly trade pack (sales vs plan, stock cover, sell-through, intake status), allocation plan, reorder list, ageing stock report.
- **KPIs:** Stock turn, weeks cover, forecast accuracy, terminal stock, availability of top 200 lines online and in store.
- **Talks daily to:** Buying, Trading, Warehouse. Weekly to Finance and Store Management.
- **Escalation rule:** Any category above target weeks cover for three consecutive weeks triggers a mandatory markdown or transfer decision in the next trade meeting.

### 3.4 Marketing
- **Mandate:** Own revenue. Bring the right customers to online and stores at an acceptable cost and convert them.

**3.4a Digital Marketing**
- **Owns:** Paid search, paid social, affiliates (CPS/CPL IOs), programmatic, marketplaces, SEO, CRM/email/SMS/WhatsApp lifecycle, loyalty integration, onsite promotion execution, A/B test roadmap.
- **Inputs needed:** Launch calendar (Buying), promotion approvals (Trading), creative (Content), site changes (Development), spend budget (Finance), store event calendar (Offline Marketing).
- **Outputs produced:** Weekly channel plan, daily spend and ROAS report, weekly revenue forecast, email/CRM calendar, affiliate performance report, test results.
- **KPIs:** Net revenue vs target, traffic, conversion rate, AOV, cost per acquisition, ROAS, new vs returning mix, email revenue share.

**3.4b Offline Marketing**
- **Owns:** Brand campaigns, PR, influencer events, mall media, outdoor, store activations, partnerships, in-store promotion collateral.
- **Inputs needed:** Campaign calendar (Digital), VM plan (Visual Merchandising), store capacity for events (Store Management), brand funding (Buying).
- **Outputs produced:** Quarterly brand calendar, event briefs, footfall attribution report, PR coverage report.
- **KPIs:** Footfall, store conversion during campaigns, brand awareness and share of voice, event ROI, PR reach.

- **Talks daily to:** Trading, Content, Development. Weekly to Buying, Store Management, Finance.
- **Escalation rule:** No promotion goes live without Trading margin approval logged. A promotion that misses forecast by more than 20% is reviewed in the next trade meeting before any repeat.

### 3.5 Trading / Merchandising
- **Mandate:** Own margin and sell-through. Sell what was bought at the best possible price before it ages.
- **Owns:** Pricing, promotion governance, markdown cadence, onsite merchandising (category sort, placement, cross-sell), daily trade review, clearance strategy, price matching with stores.
- **Inputs needed:** Daily sales and margin (Finance), stock cover and ageing (Planning), promotion proposals (Marketing), store sell-through and transfers (Store Management), site merchandising tools (Development).
- **Outputs produced:** Monday trade pack and decision log, promotion approval log, markdown list, category priority list for Content and Development, weekly winners/losers report to Buying.
- **KPIs:** Achieved margin, full-price sell-through, markdown as % of sales, ageing profile, promotion incremental margin.
- **Talks daily to:** Marketing, Planning, Finance. Weekly to Buying, Content, Store Management.
- **Escalation rule:** Trading can block any promotion on margin grounds. Marketing can escalate to the VP with a revenue case. VP decides same day.

### 3.6 Content
- **Mandate:** Own the product on the page. Nothing sells until it is shot, written, translated and live.
- **Owns:** Studio operations, retouching, product attributes and data quality (PIM), copy and translation (EN/AR), size guides, campaign and editorial creative, brand guideline compliance.
- **Inputs needed:** Intake schedule and product briefs (Buying, Warehouse), priority order (Trading by expected sales), campaign briefs (Marketing), brand assets (Buying).
- **Outputs produced:** Live products within SLA, content backlog report, campaign assets, homepage and category creative, in-store screen content shared with VM.
- **KPIs:** Goods-in to live SLA (target 48h for replenishment, 5 days for new lines), % of stock live and shoppable, backlog by value, return rate attributed to poor product information.
- **Talks daily to:** Warehouse, Trading, Marketing. Weekly to Buying, Development, Visual Merchandising.
- **Escalation rule:** Any stock over AED value threshold not live within SLA is reported in the Monday trade pack by name.

### 3.7 Development
- **Mandate:** Own the platform. Keep it fast, stable and secure and ship what sells more.
- **Owns:** Storefront, checkout, mobile app, search, PIM/CMS, OMS integration, payments, loyalty integration, store systems integration (endless aisle, ship-from-store), release management, incident response.
- **Inputs needed:** Prioritised backlog (Trading via trade meeting), campaign dates and freeze windows (Marketing), content requirements (Content), reconciliation issues (Finance), store device issues (Store Fulfilment).
- **Outputs produced:** Release notes, uptime and performance report, A/B test results, incident reports with root cause, peak-readiness sign-off.
- **KPIs:** Uptime, page speed, checkout error rate, release cadence, defect escape rate, incident time to recovery.
- **Talks daily to:** Marketing, Content, Customer Service. Weekly to Trading, Finance, Store Fulfilment.
- **Escalation rule:** Revenue-impacting incident: Customer Service raises, Development acknowledges within 15 minutes, VP and Trading informed within 30 minutes, hourly update until resolved.

### 3.8 Finance
- **Mandate:** Own the numbers. One truth for the whole operating model.
- **Owns:** Daily flash, weekly flash, monthly P&L by channel and category, budget control, marketing spend validation, inventory valuation and provisions, payment and COD reconciliation, refunds and chargebacks, business cases.
- **Inputs needed:** Sales and orders (OMS), spend (Marketing platforms and invoices), stock (Planning), returns (Warehouse), store omni-channel sales (Store Management).
- **Outputs produced:** Daily flash (by 9am), Friday flash to VP and Group, monthly P&L and reforecast, spend vs budget by team, promotion post-mortems with Trading.
- **KPIs:** Contribution margin after marketing, cost to serve per order, budget adherence, working capital in stock, reconciliation gaps.
- **Talks daily to:** Trading, Marketing. Weekly to every head. Monthly to VP and Group.
- **Escalation rule:** Any team more than 10% over budget month-to-date is flagged to the VP in the Friday flash.

### 3.9 Retail Operations (store side)

**Store Management**
- **Mandate:** Run the stores as an omni-channel channel, not a standalone till.
- **Owns:** Store P&L, staffing, in-store omni-channel targets (endless aisle orders, click & collect conversion, in-store returns handled), customer feedback capture.
- **Inputs needed:** Campaign calendar (Marketing), stock allocation (Planning), price changes and markdowns (Trading, same day as online), event plan (Offline Marketing).
- **Outputs produced:** Weekly store trade report, customer requests and missed sales log (to Buying), staff feedback on product and pricing, endless aisle sales.
- **KPIs:** Store revenue vs target, omni-channel sales attributed to store, click & collect conversion to additional purchase, in-store return recapture rate, NPS.

**Visual Merchandising**
- **Mandate:** Make the store say what the website says, in the same week.
- **Owns:** Windows, floor sets, in-store screens, campaign roll-out standards.
- **Inputs needed:** Campaign creative (Content), launch calendar (Buying), floor stock allocation (Planning).
- **Outputs produced:** Floor set calendar, campaign compliance photos, in-store screen playlists.
- **KPIs:** Campaign roll-out compliance, floor set on-time rate, conversion uplift on featured lines.

**Store Fulfilment**
- **Mandate:** Turn every store into a stock node for online.
- **Owns:** Click & collect handover, ship-from-store pick and pack, in-store returns of online orders, endless aisle ordering on the floor.
- **Inputs needed:** OMS routing rules (Development), order volume forecast (Planning, Marketing), returns policy (Customer Service, Finance).
- **Outputs produced:** Daily fulfilment SLA report, stock accuracy exceptions, returns processed report.
- **KPIs:** Ship-from-store SLA, click & collect ready-in-time rate, order pick accuracy, return-to-stock time.

**Customer Service**
- **Mandate:** Own the customer after the order. Every issue is a data point for the operating model.
- **Owns:** Contact centre, live chat, WhatsApp, social inbox, order issues, refunds initiation, complaint escalation.
- **Inputs needed:** Order and delivery status (OMS, Logistics), promotion terms (Marketing), site incidents (Development), returns policy (Finance).
- **Outputs produced:** Daily contact driver report, site bug reports to Development, product issue reports to Buying and Content, VOC summary to VP weekly.
- **KPIs:** First response time, resolution time, contact rate per 100 orders, CSAT, refund cycle time.

**Warehouse & Logistics**
- **Mandate:** Move stock in, out and back, accurately and on time.
- **Owns:** Receiving, put-away, pick/pack, carrier management, last mile, COD cash collection, returns processing, stock accuracy.
- **Inputs needed:** Intake schedule (Buying, Planning), order forecast (Marketing), returns policy (Finance), peak plan (VP).
- **Outputs produced:** Goods-in report (triggers Content), dispatch SLA report, returns report, stock count exceptions.
- **KPIs:** Receipt-to-available time, dispatch within SLA, delivery success rate, return processing time, stock accuracy.

---

## 4. Interaction map

Format: Sender to Receiver | What passes between them | Artefact | Cadence.

| From | To | What | Artefact | Cadence |
|---|---|---|---|---|
| Buying | Planning | Proposed buy, supplier intake dates | Buy sheet | Seasonal + weekly update |
| Planning | Buying | OTB approval, reorder triggers | OTB sheet | Weekly |
| Buying | Marketing | Launch calendar, hero products, exclusives, brand funding | Rolling 12-week launch calendar | Weekly |
| Buying | Content | Product briefs, brand assets, arrival dates | Product brief in PIM | Per intake |
| Trading | Buying | Winners, losers, slow lines, range gaps | Winners/losers report | Weekly |
| Marketing | Trading | Promotion proposals with revenue forecast | Promotion request form | As needed, min 5 days before live |
| Trading | Marketing | Approve / block / amend promotion with margin impact | Promotion approval log | Within 48h of request |
| Trading | Content | Priority order for photography and go-live | Priority list | Weekly |
| Trading | Development | Merchandising tool needs, sort rules, backlog priority | Trade meeting decision log | Weekly |
| Content | Marketing | Campaign assets, email creative | Asset library | Per campaign |
| Content | Visual Merchandising | Campaign creative for in-store screens and windows | Shared campaign kit | Per campaign |
| Warehouse | Content | Goods-in notification (starts the go-live clock) | Goods-in report | Daily |
| Warehouse | Planning | Stock accuracy, receipt status | Receiving report | Daily |
| Marketing | Development | Site changes, landing pages, tests, freeze windows | Sprint tickets | Weekly + campaign-based |
| Customer Service | Development | Bugs and checkout issues | Incident ticket | Real time |
| Customer Service | Buying / Content | Product complaints, sizing, description errors | Product issue report | Weekly |
| Customer Service | VP | Voice of customer summary | VOC report | Weekly |
| Planning | Store Management | Allocation, transfers, replenishment | Allocation plan | Weekly |
| Store Management | Buying | Customer requests, missed sales, competitor prices | Missed sales log | Weekly |
| Store Management | Trading | Store sell-through, price feedback | Store trade report | Weekly |
| Trading | Store Management | Price changes and markdowns, same day as online | Price change file | Same day |
| Offline Marketing | Store Management | Event plan, activation briefs | Event calendar | Monthly |
| Digital Marketing | Offline Marketing | Campaign calendar to align store and online timing | Shared campaign calendar | Weekly |
| Development | Store Fulfilment | OMS routing rules, device support | Store ops runbook | On change |
| Store Fulfilment | Planning | Ship-from-store stock movements, exceptions | Fulfilment SLA report | Daily |
| Finance | All | Daily flash, weekly flash, budget vs actual | Flash report | Daily / Friday |
| Finance | Marketing | Spend validation, invoice approval, ROI review | Spend tracker | Weekly |
| Finance | Planning | Inventory valuation, provisions | Stock valuation | Monthly |
| VP | All | Decisions, priorities, escalation rulings | Decision log | Weekly |

---

## 5. Operating cadence

| When | Forum | Owner | Attendees | Input pack | Decisions |
|---|---|---|---|---|---|
| Daily 9:00 | Daily flash | Finance | Trading, Marketing, Planning, CS, Warehouse (async) | Yesterday's revenue, margin, orders, traffic, dispatch, contact rate | Same-day fixes only: spend shifts, site issues, stock issues |
| Monday 10:00 | Trade meeting (60 min) | Trading | VP, all heads, Head of Retail | Trade pack (Planning + Trading + Finance) | Winners pushed, losers marked down, promotions approved, Development priority set, store transfers agreed |
| Tuesday | Marketing + Content sync | Marketing | Digital, Offline, Content, VM | Campaign calendar, asset status, backlog | This week's campaign, email plan, assets, store roll-out |
| Wednesday | Buying + Planning review | Planning | Buying, Trading, Warehouse | OTB, intake status, ageing report | Reorders, cancellations, transfers, markdown proposals for Monday |
| Thursday | Product + Tech stand-up | Development | Marketing, Content, CS, Store Fulfilment | Release plan, incident log, test results | Release go/no-go, bug priority, freeze windows |
| Thursday | Store ops call | Store Management | Planning, Trading, Store Fulfilment, CS | Store trade report, fulfilment SLA | Staffing for campaigns, stock moves, price compliance |
| Friday 15:00 | VP flash | Finance | VP, Group leadership | One-page flash | Escalations, spend approvals |
| Monthly | P&L and reforecast | Finance | VP, all heads | P&L by channel and category | Budget moves, headcount, reforecast |
| Quarterly | Range and strategy review | VP | Buying, Planning, Marketing, Head of Retail | Season review, customer data | Range architecture, brand exits, channel investment |

---

## 6. Ideal scenario walkthroughs

Each scenario is a swimlane: step number, department, action, artefact, elapsed time. Built to show how the handoffs actually run when the model works.

### Scenario A: New brand launch (12 weeks out to day 1)

| Step | Dept | Action | Artefact | Timing |
|---|---|---|---|---|
| 1 | Buying | Signs brand, agrees exclusivity, launch date, marketing funding | Supplier agreement | W-12 |
| 2 | Planning | Approves buy against OTB, sets depth, allocates DC vs 3 flagship stores | OTB sheet, allocation plan | W-11 |
| 3 | Buying | Adds launch to rolling calendar, briefs Marketing, Content, Store Management | Launch calendar entry | W-10 |
| 4 | Marketing | Builds launch plan: paid, email, affiliates, PR, store event | Campaign brief | W-8 |
| 5 | Trading | Approves launch pricing, confirms no conflicting promotion that week, sets category placement | Promotion approval log | W-8 |
| 6 | Content | Receives samples early, shoots campaign and product, writes EN/AR copy | Asset library, PIM records | W-6 to W-2 |
| 7 | Development | Builds landing page, adds brand to navigation, schedules release | Sprint ticket | W-4 |
| 8 | Offline Marketing + VM | Plans window, floor set, launch event in flagship | Event brief, floor set plan | W-4 |
| 9 | Warehouse | Receives stock, confirms goods-in, Content flags products live | Goods-in report | W-1 |
| 10 | Store Fulfilment | Confirms store stock landed, endless aisle enabled for non-stocked stores | Store readiness check | W-1 |
| 11 | Finance | Loads launch budget and revenue target into flash | Budget line | W-1 |
| 12 | All | Go-live: site, email, paid, window, event on the same morning | Launch checklist signed by Trading, Content, Marketing | Day 0 |
| 13 | Trading | Day 3 and day 7 read: sell-through by SKU, online vs store | Launch read | Day 3, Day 7 |
| 14 | Buying | Reorder decision on winners with Planning; feedback to brand | Reorder sheet | Day 10 |

### Scenario B: Weekly trade cycle (Monday to Friday)

| Step | Dept | Action | Artefact | Timing |
|---|---|---|---|---|
| 1 | Finance | Publishes weekly figures Sunday night | Trade pack, finance section | Sun |
| 2 | Planning | Adds stock cover, ageing, intake status | Trade pack, stock section | Sun |
| 3 | Trading | Adds winners/losers, margin, promotion results, proposals for the week | Trade pack, trade section | Mon 8:00 |
| 4 | All heads + Head of Retail | Trade meeting. Decisions logged: push list, markdown list, promotions approved, dev priorities, store transfers | Decision log | Mon 10:00 |
| 5 | Marketing | Reweights spend to push list, updates email plan, briefs affiliates | Channel plan | Mon pm |
| 6 | Content | Reprioritises backlog to push list | Priority list | Mon pm |
| 7 | Trading | Executes price changes online and sends store price file for same-day change | Price change file | Mon pm |
| 8 | Store Management | Applies price changes, moves markdown stock to sale area, updates VM | Compliance photos | Tue am |
| 9 | Development | Pulls Monday priorities into sprint | Sprint board | Tue |
| 10 | Buying + Planning | Wednesday review: cancel, reorder, transfer | OTB decisions | Wed |
| 11 | Store ops call | Store trade report, missed sales log to Buying, fulfilment SLA | Store report | Thu |
| 12 | Finance | Friday flash: how the week landed vs Monday decisions | Flash | Fri |

### Scenario C: A promotion, from request to post-mortem

| Step | Dept | Action | Artefact | Timing |
|---|---|---|---|---|
| 1 | Marketing | Submits promotion request: mechanic, categories, revenue forecast, spend, channels, store inclusion | Promotion request form | D-10 |
| 2 | Trading | Models margin impact, checks stock cover on included lines, checks calendar conflicts. Approves, amends or blocks | Promotion approval log | D-8 |
| 3 | Planning | Confirms stock depth can support forecast, allocates extra to stores if included | Stock check | D-7 |
| 4 | Buying | Secures supplier funding where available | Funding confirmation | D-7 |
| 5 | Finance | Validates spend against budget, loads target | Budget line | D-6 |
| 6 | Content | Produces creative, badges, email, in-store collateral with VM | Asset kit | D-5 |
| 7 | Development | Configures promotion engine, tests in QA, confirms store POS parity | Release ticket | D-3 |
| 8 | Customer Service | Briefed on terms and exclusions | CS brief | D-2 |
| 9 | Store Management | Staff briefed, collateral live, POS tested | Store readiness | D-1 |
| 10 | All | Go-live, same time online and in store | Checklist | D0 |
| 11 | Finance + Trading | Daily read: revenue, margin, cannibalisation | Daily flash | D1 to end |
| 12 | Trading + Marketing + Finance | Post-mortem: incremental revenue, incremental margin, repeat or retire | Post-mortem in trade pack | D+7 |

### Scenario D: A slow line (stock problem)

| Step | Dept | Action | Artefact | Timing |
|---|---|---|---|---|
| 1 | Planning | Ageing report flags category at 18 weeks cover vs 10 target | Ageing report | Wed |
| 2 | Trading | Diagnoses: price, placement, content, or demand. Checks store vs online sell-through | Diagnosis note | Wed |
| 3 | Content | If content issue: reshoot or rewrite within 48h | Priority list | Thu |
| 4 | Marketing | If demand issue: targeted push via email and paid to existing customers of the brand | Channel plan | Thu |
| 5 | Store Management | If channel issue: transfer from weak store to online or strong store | Transfer request | Thu |
| 6 | Buying | Asks supplier for markdown support or return-to-vendor | Supplier note | Fri |
| 7 | Trading | Monday: markdown depth decided if still above target after actions | Markdown list | Mon |
| 8 | Finance | Provision updated, margin impact logged | Stock valuation | Month end |

### Scenario E: Site incident during peak (checkout failing)

| Step | Dept | Action | Artefact | Timing |
|---|---|---|---|---|
| 1 | Customer Service | Spike in checkout complaints; raises P1 incident | Incident ticket | T+0 |
| 2 | Development | Acknowledges, starts incident channel, confirms scope | Incident channel | T+15 min |
| 3 | Development | Informs VP, Trading, Marketing | Incident update | T+30 min |
| 4 | Marketing | Pauses paid spend to affected journeys, holds email send | Spend log | T+30 min |
| 5 | Customer Service | Publishes holding message on chat, WhatsApp, social | CS macro | T+30 min |
| 6 | Store Management | Endless aisle in stores used as fallback for customers who call | Store note | T+45 min |
| 7 | Development | Fix deployed, QA verified | Release note | T+resolution |
| 8 | Marketing | Resumes spend, sends recovery email if needed | Channel plan | After fix |
| 9 | Development | Root cause report within 48h; item added to peak-readiness checklist | Incident report | T+48h |
| 10 | Finance | Revenue loss estimate in Friday flash | Flash | Fri |

### Scenario F: Omni-channel order journeys

**F1 Click & collect**
1. Customer orders online, selects store. OMS reserves stock at store or routes from DC.
2. Store Fulfilment picks and confirms ready within SLA; customer notified.
3. Customer collects; store associate offers related items (measured as attach rate).
4. Store credited with omni-channel contribution in Finance's flash.

**F2 Ship-from-store**
1. Online order for an item out of stock at DC but in a store. OMS routes to nearest store with stock.
2. Store Fulfilment picks, packs, hands to carrier within SLA.
3. Planning sees the movement in the daily fulfilment report; replenishes the store.

**F3 Return in store of an online order**
1. Customer returns online purchase at any store.
2. Store processes refund via OMS; Finance reconciles; item goes to store stock or back to DC per Planning rule.
3. Return reason captured; CS aggregates weekly to Buying and Content.

**F4 Endless aisle**
1. Item not in store; associate orders from online stock for home delivery on the shop floor.
2. Sale attributed to store for target purposes, fulfilled by DC.
3. Buying uses endless aisle data to see which stores are missing which ranges.

### Scenario G: Store activation aligned with online campaign
1. Offline Marketing plans a flagship event for a beauty brand, agreed in the Tuesday sync with Digital's campaign calendar.
2. Buying secures brand funding and gifting stock; Planning allocates event stock.
3. Content produces one creative kit used on site, email, window, in-store screens.
4. Digital runs geo-targeted paid and email to drive RSVP; CRM captures attendees.
5. Trading approves the event-only offer and confirms online parity.
6. Store Management staffs the event; VM sets the window in the same week the homepage changes.
7. Finance reports event ROI: store sales during event, online uplift in the catchment, new customers acquired.

---

## 7. Decision rights (RACI)

R = Responsible, A = Accountable, C = Consulted, I = Informed

| Decision | VP | Buying | Planning | Marketing | Trading | Content | Dev | Finance | Retail Ops |
|---|---|---|---|---|---|---|---|---|---|
| What to buy | A | R | C | C | C | I | | I | C |
| How much to buy | A | C | R | I | C | | | C | I |
| Launch date | I | R | C | A | C | C | C | | C |
| Promotion go/no-go | escalation | C | C | R | A | I | I | C | I |
| Price and markdown | I | C | C | I | A/R | | | C | I |
| Which products get shot first | | C | | C | A | R | | | |
| Dev priority | A | | | C | R | C | R | | C |
| Marketing spend allocation | A | | | R | C | | | C | |
| Store stock transfers | | I | R | | A | | | | C |
| Site incident response | I | | | C | C | | A/R | | C |
| Budget and headcount | A | C | C | C | C | C | C | R | C |

---

## 8. Read-across to a multi-clinic dental group

| Retail function | Clinic group equivalent | Owns |
|---|---|---|
| VP E-commerce | CEO / COO | Group P&L, arbitration |
| Buying | Clinical services & doctor roster | Which treatments and specialists each clinic offers, lab and supplier terms, new services |
| Planning | Capacity & scheduling | Chair utilisation plan, doctor hours vs demand, no-show control, allocation of doctors across clinics |
| Digital Marketing | Growth (digital) | Leads, bookings, CPA, CRM/WhatsApp, reviews, SEO |
| Offline Marketing | Growth (offline) | Community events, corporate tie-ups, signage, referral programmes |
| Trading | Revenue management | Treatment plan conversion, pricing and offer governance, filling empty chair-hours, margin per treatment |
| Content | Patient education & brand | Treatment pages, doctor profiles, before/after, bilingual content |
| Development | Systems | HMS, CRM, WhatsApp automation, Lane E, integrations |
| Finance | Finance | P&L per clinic and per doctor, marketing ROI, one set of numbers |
| Store Management | Clinic managers | Clinic P&L, staffing, in-clinic conversion, patient feedback |
| Visual Merchandising | Clinic experience | Reception, signage, campaign visibility in clinic |
| Store Fulfilment | Front desk / treatment coordination | Converting the booking into the treatment plan, follow-ups, recalls |
| Customer Service | Patient care centre | Calls, WhatsApp, complaints, reschedules |
| Warehouse & Logistics | Procurement & lab logistics | Consumables, lab turnaround, equipment |

The two transfers that matter most: separate demand generation from pricing/offer governance, and run one weekly trade meeting on one report.

---

## 9. Build spec for Claude Code

### 9.1 What to build
An interactive reference page under the Lane E dashboard (Next.js app router, Tailwind, existing Lane E layout and auth). Route: `/reference/operating-model`. Read-only. All content from a single JSON file so it can be edited without code changes. Mobile-first; the CEO will open it on a phone.

Five tabs:
1. **Structure** – expandable org chart. Click a node to open its department profile (7 fields from Section 3) in a side sheet on desktop, bottom sheet on mobile.
2. **Interactions** – the map from Section 4. Two views: (a) table with filters by department and cadence, (b) chord/graph view where selecting a department highlights its edges. Graph view is optional; ship the table first.
3. **Cadence** – weekly calendar grid (Mon to Fri plus Daily, Monthly, Quarterly rows) from Section 5. Click a forum to see owner, attendees, input pack, decisions.
4. **Scenarios** – scenario picker, then a swimlane player: departments as rows, steps as cards in time order, "next step" button highlights each handoff and the artefact. Data from Section 6.
5. **Read-across** – Section 8 table plus Section 7 RACI, with a toggle to show retail labels or dental equivalents on every other tab (relabels departments throughout using the mapping).

### 9.2 Data model (`/data/operating-model.json`)

```json
{
  "principles": [ { "id": "p1", "title": "", "text": "" } ],
  "departments": [
    {
      "id": "trading",
      "name": "Trading / Merchandising",
      "parent": "vp",
      "group": "commercial | enabling | retail_ops | leadership",
      "dotted_line": false,
      "mandate": "",
      "owns": [""],
      "inputs": [ { "item": "", "from": "planning" } ],
      "outputs": [ { "item": "", "to": "buying" } ],
      "kpis": [""],
      "talks_to": { "daily": ["marketing"], "weekly": ["buying"], "monthly": [] },
      "escalation_rule": "",
      "dental_equivalent": { "name": "Revenue management", "owns": "" }
    }
  ],
  "interactions": [
    { "from": "marketing", "to": "trading", "what": "", "artefact": "", "cadence": "as_needed | daily | weekly | monthly | seasonal | realtime" }
  ],
  "cadence": [
    { "id": "trade_meeting", "when": "Monday 10:00", "slot": "mon", "forum": "", "owner": "trading", "attendees": ["vp"], "input_pack": "", "decisions": "" }
  ],
  "scenarios": [
    {
      "id": "brand_launch",
      "title": "New brand launch",
      "summary": "",
      "steps": [ { "n": 1, "dept": "buying", "action": "", "artefact": "", "timing": "W-12" } ]
    }
  ],
  "raci": [
    { "decision": "Promotion go/no-go", "roles": { "vp": "escalation", "marketing": "R", "trading": "A" } }
  ]
}
```

Populate every field from Sections 1 to 8 of this file. Do not summarise or drop rows.

### 9.3 Components
- `OrgChart` – recursive tree from `departments` using `parent`. Dotted-line nodes rendered with a dashed connector. Collapsible below level 1. Colour by `group`.
- `DepartmentSheet` – the 7-field profile. Inputs/outputs rendered as chips linking to the other department (clicking a chip opens that department).
- `InteractionTable` – sortable, filterable; row click highlights both departments in the org chart if visible.
- `CadenceGrid` – columns Mon to Fri, rows Daily / Weekly / Monthly / Quarterly; forum cards.
- `ScenarioPlayer` – swimlane; keyboard left/right and on-screen buttons; current step card expanded, others dimmed; progress indicator.
- `RaciMatrix` – sticky first column, legend.
- `LabelToggle` – global context: retail vs dental labels.

### 9.4 Constraints
- Match Lane E's existing typography, spacing and colour tokens. No new design system.
- No em dashes anywhere in UI copy.
- All copy in the JSON, none hard-coded in components.
- Works at 375px width. Tables collapse to stacked cards on mobile.
- Lighthouse accessibility 90+. Keyboard navigable.
- No external data or API calls.

### 9.5 Suggested prompt to start the build
"Read `ecommerce-operating-model-spec.md`. Create `/data/operating-model.json` populated fully from Sections 1 to 8. Then build the `/reference/operating-model` route under the existing Lane E layout as specified in Section 9, one tab at a time, starting with Structure. After each tab, show me a screenshot at 375px and 1280px before moving on."
