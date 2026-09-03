import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';

/**
 * Static content blocks for Ads Command: the paid-media change log and the two
 * playbooks (landing pages, DN Ortho launch). Deliberately server-rendered
 * constants — this is the written record and the agreed plan, not synced data.
 */

/* ------------------------------------------------------------------ */
/* Change log                                                          */
/* ------------------------------------------------------------------ */

interface LogEntry {
  date: string; // YYYY-MM-DD
  platform: 'Google' | 'Meta';
  action: string;
  why: string;
}

/** Newest first. Append here whenever a meaningful account change is made. */
const LOG: LogEntry[] = [
  {
    date: '2026-09-03',
    platform: 'Meta',
    action:
      'Published "Leads | WhatsApp | DN Ortho | Dubai | Sep 2026" — click-to-WhatsApp (+971 55 277 2311), AED 50/day, open audience Al Wasl/Jumeirah +8mi, two static ads from the Masoud lane-J creative set ("See your smile before you commit" / "What is a digital smile scan?"). Copy sells The DN Scan (AED 499, credited). Replaced the inherited Ramadan AED 2,199 WhatsApp auto-reply with a DN Ortho welcome + pre-filled booking message. In Meta ad review; benchmark AED 18/conversation from the account’s prior WhatsApp winner.',
    why: 'Meta lead gen restarted on the only historically-proven format (243 conversations @ AED 18), refreshed from seasonal to evergreen ortho creative. DN Ortho focus per Dr. Luvi; budget per Fahad. Three old third-party drafts in the account were left untouched.',
  },
  {
    date: '2026-09-03',
    platform: 'Google',
    action:
      'Launched "Search | SOS Emergency | Dubai | Sep 2026" (Lane D) — AED 70/day, 16 exact/phrase emergency keywords (emergency dentist, toothache, broken tooth, 24 hour dentist), ad sells the Dental SOS visit (AED 699, seen fast), landing page /en/sos. Built with the same copy-and-convert recipe as DN Ortho. Also discarded all four dead campaign drafts cluttering the campaigns list.',
    why: 'Fahad approved Lane D as the next launch: emergency searches are the highest-intent dental queries and the AED 699/60-minute promise is a sharp, honest hook. Enabled spend is now AED 300/day (PMax 90 + Calls & Bookings 70 + DN Ortho 70 + SOS 70).',
  },
  {
    date: '2026-09-03',
    platform: 'Google',
    action:
      'Launched "Search | DN Ortho | Braces & Aligners | Dubai | Sep 2026" — AED 70/day, 16 exact/phrase ortho keywords (braces, Invisalign, clear aligners, orthodontist), ad sells The DN Scan (AED 499, credited to treatment), landing page /en/scan. Built by copying the proven Calls & Bookings campaign (the new-campaign wizard was erroring server-side), then swapping keywords, ad and name.',
    why: "Dr. Luvi asked for DN Ortho ads. Ortho searches were previously unserved; the AED-499-credited scan is the honest hook (never advertised as a free consultation). Health-policy exception requested on the flagged keywords, same as the parent campaign.",
  },
  {
    date: '2026-09-03',
    platform: 'Google',
    action: 'Paused "Search | Phone call leads | 9th jan 2026".',
    why: 'Redundant: its generic dental keywords are covered by Calls & Bookings, which has cleaner goals (calls + bookings only) and a priced landing page instead of the homepage. Keeps enabled spend at AED 230/day (PMax 90 + Calls & Bookings 70 + DN Ortho 70) instead of creeping to 300.',
  },
  {
    date: '2026-09-02',
    platform: 'Google',
    action:
      'Repointed the live Calls & Bookings ad to /en/first-look (Lane B — The DN First Look, AED 799 welcome visit).',
    why: 'A transparent priced offer converts search traffic better than the homepage brochure; one lane, one campaign, one page.',
  },
  {
    date: '2026-09-02',
    platform: 'Google',
    action:
      'Launched "Search | Calls & Bookings | Dubai | Sep 2026" — AED 70/day, exact/phrase keywords only, optimising for Book appointments + Phone call leads, Dubai presence-only, EN+AR.',
    why: 'Replace broad-match waste with the proven converting queries; bidding now trains on real lead goals instead of engagement counts.',
  },
  {
    date: '2026-09-02',
    platform: 'Google',
    action: 'Paused "Leads | phone call leads | Top 3 keywords | 10th jan 2026".',
    why: 'AED 38.48 per conversion vs AED 9.34 in the sibling campaign — broad "dental clinic near me" with a low Quality Score was burning ~AED 2,000/month.',
  },
  {
    date: '2026-09-02',
    platform: 'Google',
    action:
      'Account audit: conversion tracking counts Engagements / YouTube follow-on views / page views as account-default conversions; "Submit lead form" action is misconfigured.',
    why: 'Flagged for cleanup — demoting the junk goals to secondary makes every campaign (incl. PMax) bid on calls and bookings only.',
  },
];

const pillTone = (p: LogEntry['platform']) =>
  p === 'Google' ? 'bg-accent/8 text-accent' : 'bg-good/10 text-good';

export function ActionLog() {
  return (
    <Card>
      <SectionHeader eyebrow="Change log" title="What changed, when, and why" />
      <div className="px-5 pb-5 pt-3">
        <ol className="space-y-3">
          {LOG.map((e, i) => (
            <li key={i} className="rounded-card border border-line/70 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${pillTone(e.platform)}`}>
                  {e.platform}
                </span>
                <span className="text-[11px] tabular-nums text-ink-faint">{e.date}</span>
              </div>
              <p className="mt-1 text-[12.5px] leading-snug text-ink">{e.action}</p>
              <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">{e.why}</p>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Campaign specs — objective, tagging, tracking, expected results     */
/* ------------------------------------------------------------------ */

interface CampaignSpec {
  name: string;
  lane: string;
  state: 'live' | 'learning' | 'watch';
  budget: string;
  objective: string;
  tagging: string[];
  tracking: string[];
  expected: string[];
}

/** One block per running campaign. Expectations are honest planning
 *  numbers anchored on this account's own history — not promises. */
const CAMPAIGN_SPECS: CampaignSpec[] = [
  {
    name: 'Search | Calls & Bookings | Dubai | Sep 2026',
    lane: 'Lane B — First Look · /en/first-look',
    state: 'live',
    budget: 'AED 70/day',
    objective:
      'New-patient lead gen: turn general "dentist / dental clinic dubai & near me" searches into calls and booked visits for the AED 799 First Look.',
    tagging: [
      'Google auto-tagging (GCLID) on — every click is individually attributable',
      'Naming convention Search | offer | geo | date; display path /dubai/book-online',
      'One lane, one final URL — /en/first-look, AI Max & URL expansion off',
    ],
    tracking: [
      'Campaign-level conversion goals: Book appointments + Phone call leads ONLY (account-default junk goals excluded)',
      'UAE call number with Google call reporting on the ad',
      'Maximise Conversions bidding trains on those two actions and nothing else',
    ],
    expected: [
      'CPC ~AED 6–9 on the proven exact-match queries (account history)',
      'Target ≤ AED 15/lead after learning; the old sibling campaign booked at AED 9.34/conv',
      '~5–10 leads/day at full budget once out of learning (1–2 weeks)',
    ],
  },
  {
    name: 'Search | DN Ortho | Braces & Aligners | Dubai | Sep 2026',
    lane: 'Lane J — DN Scan · /en/scan',
    state: 'learning',
    budget: 'AED 70/day',
    objective:
      'Ortho consult lead gen for Dr. Luvi: braces/Invisalign searches → booked DN Scan (AED 499, credited to treatment).',
    tagging: [
      'Auto-tagging (GCLID); display path /scan/book',
      '16 exact/phrase ortho keywords only — no broad match',
      'Final URL /en/scan; ad copy sells the paid-and-credited scan (no "free consult" claims)',
    ],
    tracking: [
      'Same lead-only goals: Book appointments + Phone call leads',
      'Health-policy keyword exception under Google review (same as parent campaign — cleared before)',
      'Judge on cost per booked scan, not per click',
    ],
    expected: [
      'CPC higher than general dental: ~AED 10–20 on Invisalign/braces terms',
      'Win threshold ≤ AED 80/booked scan — one aligner case covers months of spend',
      'Low volume first days while review + learning complete; ~1–3 scans/week initially',
    ],
  },
  {
    name: 'Search | SOS Emergency | Dubai | Sep 2026',
    lane: 'Lane D — DN SOS · /en/sos',
    state: 'learning',
    budget: 'AED 70/day',
    objective:
      'Same-day emergency lead gen: toothache / broken tooth / emergency dentist searches → immediate calls for the AED 699 SOS visit.',
    tagging: [
      'Auto-tagging (GCLID); display path /sos/book',
      '16 exact/phrase emergency keywords; no 24/7 claims in copy (clinic hours honesty)',
      'Final URL /en/sos — tap-to-call is the primary CTA',
    ],
    tracking: [
      'Lead-only goals: Phone call leads carry this campaign (emergency patients call, not form-fill)',
      'Call reporting on the UAE number; watch call length as a quality proxy',
      'Next sharpen: ad schedule matched to clinic hours so calls land when reception answers',
    ],
    expected: [
      'Highest conversion rate of the three — emergency intent converts at 8–12% typically',
      'Target ≤ AED 40/call-lead; CPC ~AED 8–14 on emergency terms',
      'Volume is demand-driven and spiky — judge weekly, not daily',
    ],
  },
  {
    name: 'Dental Nation Campaign | March 13 (Performance Max)',
    lane: 'Cross-network — Search, Maps, Display, YouTube, Gmail',
    state: 'watch',
    budget: 'AED 90/day',
    objective:
      'Automated supplemental reach beyond keyword targeting; catches demand the Search campaigns miss (Maps, competitors’ branded, long-tail).',
    tagging: [
      'Auto-tagging (GCLID); asset groups auto-assemble the creative',
      'Landing pages partly auto-selected — the campaign predates the one-lane-one-page rule',
    ],
    tracking: [
      'Still on ACCOUNT-DEFAULT goals: Engagements / YouTube views / page views inflate its "conversions"',
      'Queued fix: demote junk goals to secondary so PMax bids on calls + bookings only',
    ],
    expected: [
      'Reported conversions are directional only until the goal cleanup lands',
      'After cleanup expect reported conversions to DROP but real lead quality to rise — that is success, not failure',
    ],
  },
];

const stateChip = (s: CampaignSpec['state']) =>
  s === 'live'
    ? { label: 'LIVE', cls: 'bg-good/10 text-good' }
    : s === 'learning'
      ? { label: 'LIVE · LEARNING', cls: 'bg-accent/8 text-accent' }
      : { label: 'LIVE · NEEDS GOAL CLEANUP', cls: 'bg-watch/10 text-watch' };

function SpecList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">{title}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2 text-[12px] leading-snug text-ink-soft">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent/60" />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CampaignSpecs() {
  return (
    <Card>
      <SectionHeader
        eyebrow="Campaign specs"
        title="Objective, tagging, tracking & expected results — per campaign"
      />
      <div className="px-5 pb-5 pt-3">
        <p className="text-[12.5px] leading-snug text-ink-soft">
          The contract for each running campaign: what it is trying to achieve, how its traffic is
          tagged and its conversions tracked, and what results are realistic. Expectations are
          planning numbers anchored on this account&apos;s own history — never promises.
        </p>
        <div className="mt-4 space-y-3">
          {CAMPAIGN_SPECS.map((c) => {
            const chip = stateChip(c.state);
            return (
              <div key={c.name} className="rounded-card border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[13.5px] font-semibold tracking-tight text-ink">{c.name}</h3>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${chip.cls}`}>{chip.label}</span>
                  <span className="text-[11px] tabular-nums text-ink-faint">{c.budget}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-ink-faint">{c.lane}</p>
                <p className="mt-2 text-[12.5px] leading-snug text-ink">
                  <span className="font-medium">Objective:</span> {c.objective}
                </p>
                <div className="mt-3 grid gap-4 lg:grid-cols-3">
                  <SpecList title="Tagging" items={c.tagging} />
                  <SpecList title="Tracking" items={c.tracking} />
                  <SpecList title="Expected results" items={c.expected} />
                </div>
              </div>
            );
          })}
        </div>
        <Takeaway>
          Shared measurement backbone: Google auto-tagging on every click, lead-only conversion
          goals on all three Search campaigns, and the queued account-level goal cleanup to bring
          PMax onto the same standard. Cost per BOOKED patient — not per click — is the number that
          decides budgets.
        </Takeaway>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Landing-page plan                                                   */
/* ------------------------------------------------------------------ */

interface LaneSpec {
  tag: string;
  name: string;
  route: string;
  offer: string;
  audience: string;
  sections: string[];
}

/** The lane → landing-page map. These pages EXIST on dentalnation.com — the job
 *  is pointing paid traffic at the right lane and sharpening each page for it. */
const LANES: LaneSpec[] = [
  {
    tag: 'B',
    name: 'Lane B — The DN First Look',
    route: 'dentalnation.com/en/first-look',
    offer: 'Welcome visit AED 799 all-inclusive (exam + digital X-ray + clean, saves AED 531)',
    audience: 'New-patient search: "dental clinic near me / dubai", checkup, cleaning → the Calls & Bookings campaign',
    sections: [
      'This replaces the homepage as the destination for the general search campaign — a transparent priced offer beats a brochure',
      'Sharpen: sticky mobile Call/WhatsApp bar; keyword-matched headline variant ("Looking for a dental clinic in Dubai?")',
    ],
  },
  {
    tag: 'J',
    name: 'Lane J — The DN Scan',
    route: 'dentalnation.com/en/scan',
    offer: 'Aligner & braces planning AED 499 — 3D scan + specialist consult + written plan, fully deducted if treatment proceeds',
    audience: 'Ortho search: braces, Invisalign, aligners, orthodontist → the DN Ortho campaign (Dr. Luvi)',
    sections: [
      'Ad copy must sell the AED 499-credited scan (NOT a "free consultation") — the no-pressure, brand-neutral positioning is the differentiator',
      'Sharpen: before/after gallery + Dr. Luvi profile + DN Pay instalment framing for the treatment itself',
    ],
  },
  {
    tag: 'D',
    name: 'Lane D — DN SOS',
    route: 'dentalnation.com/en/sos',
    offer: 'Emergency: seen in 60 minutes, AED 699 all-inclusive (AED 200 deposit counts toward fee), AMC clinic',
    audience: '"emergency dentist", "toothache", same-day queries — call-dominant campaign (LIVE 3 Sep 2026)',
    sections: [
      'Campaign: exact-match emergency keywords, call-first ads, ad schedule matched to clinic hours',
      'Sharpen: tap-to-call as the single primary CTA; open-now hours signal',
    ],
  },
  {
    tag: 'E',
    name: 'Lane E — The DN Glow Up',
    route: 'dentalnation.com/en/glow-up',
    offer: 'Zoom laser whitening AED 1,699 all-inclusive, dentist-supervised, 1 hour',
    audience: 'Whitening search + Meta/IG prospecting (pre-event, post-aligner) — visual-first lane',
    sections: [
      'Google: [teeth whitening dubai], [zoom whitening dubai], [laser teeth whitening] exact/phrase',
      'Meta: before/after reels + carousel — the natural first Meta campaign once creative is ready',
    ],
  },
  {
    tag: 'C',
    name: 'Lane C — Restore (implants)',
    route: 'dentalnation.com/en/care-journeys/restore',
    offer: 'Implants: consult from AED 1,000, single tooth AED 12,500, full-arch AED 40–60k',
    audience: 'Highest-ticket lane: [dental implants dubai], [all on 4 dubai], [implant cost dubai]',
    sections: [
      'Worth its own campaign at higher CPCs — one implant case pays for months of ad spend',
      'Sharpen: financing/DN Pay block and consultation-first CTA (nobody buys a full arch from an ad)',
    ],
  },
];

const LP_RULES = [
  'One lane, one campaign, one page: every campaign\'s final URL is its lane page — never the homepage, never auto-selected pages (AI Max / URL expansion stay off).',
  'Sticky mobile CTA bar (Call · WhatsApp · Book) on every lane page — ~90% of paid clinic traffic is mobile.',
  'Price honesty is the brand: every lane leads with its all-inclusive AED price. Ad copy must match the page (no "free" claims where the offer is paid-and-credited).',
  'Bilingual: EN + AR mirrors for every lane page (campaigns target both languages).',
  'Measurement: gtag events call_click / whatsapp_click / booking_submit per lane, wired as Google Ads + Meta conversions — also fixes the misconfigured "Submit lead form" action.',
];

export function LandingPagePlan() {
  return (
    <Card>
      <SectionHeader tag="P1" eyebrow="Playbook" title="Lanes & landing pages" />
      <div className="px-5 pb-5 pt-4">
        <p className="text-[12.5px] leading-snug text-ink-soft">
          Each business lane has a productised offer page on dentalnation.com. Paid traffic maps one
          campaign to one lane page — the fix for ads historically dumping on the homepage.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {LANES.map((lp) => (
            <div key={lp.tag} className="rounded-card border border-line p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/5 text-[11px] font-semibold text-accent">
                  {lp.tag}
                </span>
                <div>
                  <h3 className="text-[13.5px] font-semibold tracking-tight text-ink">{lp.name}</h3>
                  <p className="mt-0.5 text-[11px] text-ink-faint">{lp.route}</p>
                  <p className="mt-1 text-[11.5px] text-ink"><span className="font-medium">Offer:</span> {lp.offer}</p>
                  <p className="mt-1 text-[11.5px] text-ink-soft">
                    <span className="font-medium text-ink">Traffic:</span> {lp.audience}
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {lp.sections.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-snug text-ink-soft">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent/60" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-card border border-dashed border-line bg-panel/40 p-4">
          <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">
            Rules (apply to every lane)
          </p>
          <ul className="mt-2 space-y-1.5">
            {LP_RULES.map((r, i) => (
              <li key={i} className="flex gap-2 text-[12px] leading-snug text-ink-soft">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent/60" />
                {r}
              </li>
            ))}
          </ul>
        </div>
        <Takeaway>
          Rollout: Lane B (repoint the live Calls &amp; Bookings campaign to /en/first-look) → Lane J
          (DN Ortho campaign lands on /en/scan) → Lane D emergency campaign → Lane E whitening
          (Google, then Meta with creative) → Lane C implants.
        </Takeaway>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* DN Ortho launch brief                                               */
/* ------------------------------------------------------------------ */

const ORTHO_KEYWORDS = [
  '[braces dubai]',
  '[invisalign dubai]',
  '[clear aligners dubai]',
  '[teeth aligners dubai]',
  '[orthodontist dubai]',
  '[orthodontist near me]',
  '[braces price dubai]',
  '[invisalign cost dubai]',
  '[ceramic braces dubai]',
  '[kids braces dubai]',
  '[teeth straightening dubai]',
  '"invisible braces dubai"',
];

export function OrthoPlan() {
  return (
    <Card>
      <SectionHeader tag="P2" eyebrow="Playbook" title="DN Ortho launch (for Dr. Luvi)" />
      <div className="px-5 pb-5 pt-4">
        <p className="text-[12.5px] leading-snug text-ink-soft">
          Orthodontics is the highest-ticket recurring service in the group; Dr. Luvi has asked for
          dedicated ads. Two phases: capture existing demand on Google first, then generate demand on
          Meta with creative.
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-card border border-line p-4">
            <h3 className="text-[13.5px] font-semibold tracking-tight text-ink">
              Phase 1 — Google Search{' '}
              <span className="rounded bg-good/10 px-1.5 py-0.5 text-[10px] font-medium text-good align-middle">
                LIVE 3 Sep 2026
              </span>
            </h3>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-snug text-ink-soft">
              <li>Campaign: <span className="font-medium text-ink">Search | DN Ortho | Braces &amp; Aligners | Dubai</span></li>
              <li>Budget: AED 70/day to start · Maximise conversions · goals = calls + bookings only</li>
              <li>Dubai presence-only · EN + AR · no Search Partners / Display · AI Max off</li>
              <li>Landing page: <span className="font-medium text-ink">/en/scan — The DN Scan (Lane J)</span></li>
              <li>Ads sell the AED 499 scan, fully credited against treatment — no &ldquo;free consult&rdquo; claims; instalments via DN Pay for the treatment itself</li>
            </ul>
            <p className="mt-3 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">Keyword set (exact/phrase only)</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {ORTHO_KEYWORDS.map((k) => (
                <span key={k} className="rounded bg-na/8 px-1.5 py-0.5 text-[11px] text-ink-soft">{k}</span>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-line p-4">
            <h3 className="text-[13.5px] font-semibold tracking-tight text-ink">
              Phase 2 — Meta{' '}
              <span className="rounded bg-good/10 px-1.5 py-0.5 text-[10px] font-medium text-good align-middle">
                CTWA LIVE 3 Sep 2026
              </span>
            </h3>
            <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">
              First wave live: click-to-WhatsApp statics at AED 50/day (campaign &ldquo;Leads | WhatsApp |
              DN Ortho&rdquo;). The items below are the second wave — video/before-after creative still
              gated on Dr. Luvi&rsquo;s inputs.
            </p>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-snug text-ink-soft">
              <li>Objective: Leads — WhatsApp-first (the channel patients actually use), Instant Form as B-test</li>
              <li>Audience: Dubai 18–45 + parents (kids braces); Advantage+ off to start, interests: teeth straightening, Invisalign, cosmetic dentistry</li>
              <li>Creative: before/after smile carousel, aligner close-up reels, Dr. Luvi talking-head — stills produced with the ChatGPT Pro image workflow, cases must be real &amp; consented</li>
              <li>Offer: The DN Scan (AED 499, credited to treatment) as the hook; treatment instalments from AED —/month (to confirm with Dr. Luvi)</li>
              <li>Gate before launch: consented before/after set + WhatsApp response SLA agreed with reception</li>
            </ul>
            <p className="mt-3 rounded-card border border-dashed border-watch/50 bg-watch/5 px-3 py-2 text-[11.5px] leading-snug text-ink-soft">
              <span className="font-medium text-ink">Needed from Dr. Luvi:</span> ortho price list +
              instalment terms, 4–6 consented before/after cases, and who answers ortho WhatsApp
              enquiries.
            </p>
          </div>
        </div>

        <Takeaway>
          Success yardstick: the existing call campaign books at ≈AED 9/conversion; ortho leads are
          worth multiples of a checkup, so anything under AED 80/booked consultation is a win at
          typical case values.
        </Takeaway>
      </div>
    </Card>
  );
}
