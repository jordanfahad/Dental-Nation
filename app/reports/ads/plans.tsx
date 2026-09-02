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
/* Landing-page plan                                                   */
/* ------------------------------------------------------------------ */

interface LpSpec {
  tag: string;
  name: string;
  route: string;
  audience: string;
  sections: string[];
}

const LPS: LpSpec[] = [
  {
    tag: 'L1',
    name: 'Call-first service template',
    route: '/lp/{service} — the master template every other LP inherits',
    audience: 'High-intent search: "dental clinic near me / dubai", checkup, cleaning',
    sections: [
      'Hero: one promise ("Same-day dental care in Dubai"), one CTA pair — Call + WhatsApp — with Book Online as secondary',
      'Trust strip: DHA-licensed, Google rating, years in practice, insurance partner logos',
      'Price-from anchors for the 3 entry services (checkup / cleaning / x-ray) — no hidden-price anxiety',
      '3-step "your first visit" strip (book → assess → plan) with real clinic photography',
      'Dentist cards with names and photos (people book people, not clinics)',
      'FAQ accordion (insurance, cost, pain, Arabic-speaking staff) + closing CTA block',
    ],
  },
  {
    tag: 'L2',
    name: 'DN Ortho — braces & aligners',
    route: '/lp/ortho (interim: dentalnation.com/en/care-journeys/align)',
    audience: 'Ortho searches + Meta prospecting: braces, Invisalign, clear aligners',
    sections: [
      'Hero: outcome-first ("Straight teeth, invisibly") with free ortho consultation + scan offer',
      'Aligners vs braces comparison table (visibility, comfort, duration, price-from)',
      'Monthly-instalment price framing via DN Pay ("from AED xxx/month") — ortho is an instalment purchase',
      'Before/after smile gallery (real cases, consented) — the single highest-converting ortho element',
      'Dr. Luvi profile block: credentials, photo, cases completed',
      'FAQ: treatment length, pain, age limits, retainers; sticky mobile bar: Call / WhatsApp / Free consult',
    ],
  },
  {
    tag: 'L3',
    name: 'Emergency dentistry',
    route: '/lp/emergency (interim: dentalnation.com/en/care-journeys/sos)',
    audience: '"emergency dentist", "toothache", same-day queries — call-dominant',
    sections: [
      'Hero: "In pain? Seen today." with tap-to-call as the ONLY primary CTA',
      'Open-now signal with today\'s hours per branch; nearest-branch map row (Al Wasl / AMC / Dr Tosun)',
      'What counts as an emergency checklist (broken tooth, swelling, knocked-out tooth…)',
      'Short reassurance strip: pain-relief first, transparent pricing after assessment',
    ],
  },
  {
    tag: 'L4',
    name: 'Location pages',
    route: '/lp/al-wasl · /lp/jumeirah (interim: /en/clinics/*)',
    audience: '"dentist al wasl", "dental clinic jumeirah" — area intent',
    sections: [
      'Hero anchored to the area name + map with parking note',
      'Branch team, opening hours, drive-time from nearby districts',
      'Reviews specific to that branch; standard CTA pair',
    ],
  },
];

const LP_RULES = [
  'One page, one goal: every LP optimises a single action (call/WhatsApp/booking) — no top navigation to leak visitors back into the main site.',
  'Sticky mobile CTA bar (Call · WhatsApp · Book) on every LP — ~90% of paid clinic traffic is mobile.',
  'Design language: the dentalnation.com "Beyond Smiles" identity (navy/cream, serif display) so paid visitors land on-brand, but stripped to conversion essentials.',
  'Bilingual: every LP ships EN + AR mirrored (campaigns already target both languages).',
  'Speed: static Next.js pages, hero image optimised, < 2s LCP on 4G.',
  'Measurement: gtag events call_click / whatsapp_click / booking_submit wired as Google Ads + Meta conversions — this also fixes the misconfigured "Submit lead form" action.',
];

export function LandingPagePlan() {
  return (
    <Card>
      <SectionHeader tag="P1" eyebrow="Playbook" title="Landing-page plan" />
      <div className="px-5 pb-5 pt-4">
        <p className="text-[12.5px] leading-snug text-ink-soft">
          Today every ad lands on the homepage (or a page Google auto-picks). The plan: four
          conversion-first landing pages, one per intent, each inheriting the same template rules.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {LPS.map((lp) => (
            <div key={lp.tag} className="rounded-card border border-line p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/5 text-[11px] font-semibold text-accent">
                  {lp.tag}
                </span>
                <div>
                  <h3 className="text-[13.5px] font-semibold tracking-tight text-ink">{lp.name}</h3>
                  <p className="mt-0.5 text-[11px] text-ink-faint">{lp.route}</p>
                  <p className="mt-1 text-[11.5px] text-ink-soft">
                    <span className="font-medium text-ink">For:</span> {lp.audience}
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
            Template rules (apply to all four)
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
          Build order: L2 DN Ortho first (new campaign waiting on it), then L1 as the template it
          generalises into, then L3/L4. Until each ships, campaigns point at the closest existing
          dentalnation.com page — noted per card above.
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
              Phase 1 — Google Search (now)
            </h3>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-snug text-ink-soft">
              <li>Campaign: <span className="font-medium text-ink">Search | DN Ortho | Braces &amp; Aligners | Dubai</span></li>
              <li>Budget: AED 70/day to start · Maximise conversions · goals = calls + bookings only</li>
              <li>Dubai presence-only · EN + AR · no Search Partners / Display · AI Max off</li>
              <li>Landing page: /en/care-journeys/align until /lp/ortho ships</li>
              <li>Ads lead with the free ortho consultation + instalment framing (DN Pay)</li>
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
              Phase 2 — Meta (after LP + creative)
            </h3>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-snug text-ink-soft">
              <li>Objective: Leads — WhatsApp-first (the channel patients actually use), Instant Form as B-test</li>
              <li>Audience: Dubai 18–45 + parents (kids braces); Advantage+ off to start, interests: teeth straightening, Invisalign, cosmetic dentistry</li>
              <li>Creative: before/after smile carousel, aligner close-up reels, Dr. Luvi talking-head — stills produced with the ChatGPT Pro image workflow, cases must be real &amp; consented</li>
              <li>Offer: free ortho consultation + scan, instalments from AED —/month (price to confirm with Dr. Luvi)</li>
              <li>Gate before launch: /lp/ortho live + WhatsApp response SLA agreed with reception</li>
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
