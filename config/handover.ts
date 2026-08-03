/**
 * Leave handover — content source (spec §4).
 *
 * First person, Fahad → Mr. Akbar. Rendered on /share/handover/[token] and on
 * the internal admin page. Content lives here (not in JSX) so the wording can
 * be corrected without touching layout.
 *
 * TWO HARD RULES, enforced by review of this file:
 *  1. NO credentials. Access is described by WHO HOLDS IT, never by what the
 *     secret is. No passwords, no recovery codes, no account numbers.
 *  2. NO patient PII. This is a handover manual, not a data extract.
 *
 * Anything still unconfirmed is a `pending: true` field and renders as a
 * visible amber "to confirm" chip — so nothing ships looking finished when it
 * isn't, and Fahad can see at a glance what is left before 5 August.
 */

/** A value that may still be awaiting confirmation. */
export interface Slot {
  value: string;
  /** true → render as an obvious "to confirm" placeholder, not as fact. */
  pending?: boolean;
}

export const P = (value: string): Slot => ({ value, pending: true });
export const V = (value: string): Slot => ({ value });

export const HANDOVER = {
  cover: {
    title: 'Marketing & Growth — Leave Handover',
    author: 'Fahad',
    authorTitle: V('Marketing Head'),
    audience: 'Prepared for Mr. Akbar',
    awayFrom: '5 August 2026',
    awayTo: '20 August 2026',
    returnDate: '21 August 2026',
    availability: 'Async on WhatsApp for genuine emergencies only — see the escalation rules below. Everything else holds for my return.',
    responseWindow: V('Within 2–3 hours, same day'),
    banner: 'Internal — prepared for Mr. Akbar. Not for board circulation.',
    bannerWhy: 'It references vendor and commercial matters.',
  },

  /** How the engine runs when I am here — so the rhythm is legible to whoever picks it up. */
  rhythm: {
    daily: [
      {
        title: 'Morning dashboard review',
        body: 'Lane E control dashboard: yesterday’s spend, leads, CPL and bookings by clinic. I flag anomalies — sudden CPL spikes, lead-flow drops, source outages.',
      },
      {
        title: 'Ad account check',
        body: 'Meta / Google: budget pacing against daily caps, ad disapprovals, delivery issues. Underperformers get paused or budget-shifted.',
      },
      {
        title: 'Lead flow check',
        body: 'Confirming new leads are reaching the clinics and the WhatsApp flows are firing — auto-replies and booking prompts.',
      },
    ],
    weekly: [
      'Budget reallocation across campaigns and clinics, based on the week’s CPL and booking data.',
      'Creative pipeline review — approving the next batch of ads.',
      'Partner lead reconciliation — externally billed leads verified line-by-line against our own dashboard before anything is accepted.',
      'Organic snapshot — dentalnation.com indexation and Search Console trend check.',
    ],
  },

  /** Who owns what while I am away. */
  coverage: [
    {
      area: 'Smile Club',
      owner: V('Gautam'),
      notes: 'Business as usual — already his.',
    },
    {
      area: 'Creative production',
      owner: V('Dental Nation Creative Platform'),
      notes: 'Runs on our own platform, not a retained agency. Pipeline pre-approved through the leave period.',
    },
    {
      area: 'Demand generation',
      owner: V('No cover needed — monitored on the dashboard'),
      notes:
        'I push the ads live before I go. Nothing needs changing while I am away; the team watches performance directly on the Performance Dashboard.',
    },
    {
      area: 'Paid campaigns',
      owner: V('Zavis externally · internal review by Gautam / Dr Luvi'),
      notes:
        'Zavis runs delivery. Mr. Akbar nominates Gautam or Dr Luvi to review from our side. Budgets stay at current daily levels.',
    },
    {
      area: 'Performance-partner alerts (Araby Ads)',
      owner: V('Internal team — email alerts enabled'),
      notes:
        'Alert email notifications are switched on, so the team is notified and responds directly. No manual monitoring required.',
    },
    {
      area: 'Zavis deliverables — QA',
      owner: V('Gautam / Dr Luvi'),
      notes:
        'Zavis sends the gatekeeping tasks to each team; Gautam and Dr Luvi review the deliverables and come back with a response.',
    },
    {
      area: 'WhatsApp / Marketing OS',
      owner: V('Zavis — automated; escalate only if flows stop'),
      notes: 'The system runs itself. Escalate on outage, not on volume.',
    },
    {
      area: 'Website & widget uptime',
      owner: V('Automated monitoring — Clinical Operations tab'),
      notes:
        'Booking-widget up/down time and site availability are monitored automatically and visible on the dashboard’s Clinical Operations tab.',
    },
    {
      area: 'Website / organic',
      owner: V('No action needed'),
      notes: 'I review on return.',
    },
    {
      area: 'Performance Dashboard',
      owner: V('Runs automatically — 15-minute sync'),
      notes: 'Live throughout. The board report and this handover are served from it.',
    },
  ],

  /**
   * The links that replace most of this document in practice — if something
   * needs checking, it is on one of these three screens rather than in
   * someone's inbox.
   */
  links: [
    {
      label: 'Performance Dashboard',
      href: 'https://dental-nation-one.vercel.app/',
      what: 'All clinical and marketing operations, automated and comprehensive. Campaign performance is monitored here directly — no report requests needed.',
    },
    {
      label: 'Clinical Operations — uptime & incidents',
      href: 'https://dental-nation-one.vercel.app/?tab=clinical-ops',
      what: 'Booking-widget up/down time, incident history, and whether the website itself is down.',
    },
    {
      label: 'Board Growth Report',
      href: 'https://dental-nation-one.vercel.app/share/growth/c612dfb4-ff89-4099-8a8c-00c114097037',
      what: 'The read-only board link. No login; safe to open in a meeting or forward to an investor.',
    },
    {
      label: 'Creative desk — asset production',
      href: 'https://creative-desk.vercel.app/download-jobs/Hashid',
      what: 'Live status of the creative assets the Lane B/D/E launch is waiting on. Check here rather than asking for an update. Access is held by the team — sign-in comes from the holder, not from this page.',
    },
  ],

  /** Decision rules — so nobody has to make a judgement call in my absence. */
  decisionRules: {
    steadyState: [
      'Campaigns run steady state: no new campaigns, no scaling, budgets capped at current daily levels.',
      'No new vendor commitments, no billing-term confirmations, no contract signatures.',
    ],
    pauseRule: {
      text:
        'Nobody has to judge this. An automated rule is enabled that pauses an ad set when it stops performing — so underperformance is handled by the system, not by someone watching a chart.',
      threshold: V('Automated rule — no manual threshold to apply'),
    },
    escalate: [
      'Ad account disabled or billing failure.',
      'Facebook page or Google account restriction.',
      'Booking widget or WhatsApp flow outage that the Clinical Operations tab shows persisting.',
    ],
    escalateNote:
      'These are the only "call Fahad" events, and even these surface as alerts first. Everything else waits — and nothing is lost by waiting.',
  },

  /** Open items and where each one stands on 5 August. */
  openItems: [
    {
      title: 'Hashid — onboarding',
      status: V('Trial complete · interview cleared · offer letter next'),
      position:
        'The trial is done and Hashid has cleared the interview, so this is no longer an assessment — it is paperwork on the critical path. Gautam carries the follow-up, aligning with Syed at Zavis to issue the offer letter and complete onboarding. It does not wait for my return, because the campaign launch below is waiting on the assets he produces.',
    },
    {
      title: 'Lane B, D & E campaign launch',
      status: V('Assets in progress — the only blocker'),
      position:
        'Family (B), Emergency (D) and Lifestyle (E) launch simultaneously, not in sequence. Nothing else is outstanding: strategy, budget and targeting are set, and the single dependency is creative. Hashid is already briefed and the work is moving — BAU organic assets first, then paid social, then paid search (PMax). Progress is visible on the creative desk rather than by asking for an update.',
      link: {
        label: 'Creative desk — Hashid’s asset jobs',
        href: 'https://creative-desk.vercel.app/download-jobs/Hashid',
      },
    },
    {
      title: 'Performance partner (Araby Ads) — campaign & commercial',
      status: V('Campaign resuming this week'),
      position:
        'Two separate things, and they move at different speeds. DELIVERY resumes: Araby Ads restart the campaign this week, and low-hanging BAU ads are renewed once Hashid joins and shares the creative assets. The COMMERCIAL discussion does not move — no billing-term confirmations and no new commitments while I am away; that still waits for my return.',
    },
    {
      title: 'Board growth report',
      status: V('Live at the board link'),
      position:
        'Remaining data fills are marked pending on the page itself. I complete them on return unless the figures are supplied earlier.',
    },
    {
      title: 'Voice agent R&D',
      status: V('In progress — Zavis to report back'),
      position:
        'Not paused. Core infrastructure is built and functional and the work continues; Zavis come back with the status. Nothing here needs a decision from our side while I am away.',
    },
  ],

  /**
   * Access map — WHO HOLDS ACCESS, never what the secret is.
   * Adding a password, key or recovery detail to this list is a spec violation.
   */
  accessMap: [
    {
      system: 'Performance Dashboard (admin)',
      holders: V('Mr. Akbar manages · Gautam and Dr Luvi each have their own view'),
    },
    { system: 'Meta Business Manager', holders: V('Gautam · Dr Luvi · Zavis — admin view') },
    { system: 'Google Ads', holders: V('Gautam · Dr Luvi · Zavis — admin view') },
    { system: 'Google Search Console', holders: V('Gautam · Dr Luvi · Zavis — admin view') },
    { system: 'WhatsApp / Marketing OS admin', holders: V('Zavis — admin view') },
    {
      system: 'Website deploy (Vercel / Supabase) — incl. Dr Tosun and Al Maher sites',
      holders: V('Zavis — admin view'),
    },
  ],

  /** First week back. */
  onReturn: [
    'Away-period reconciliation — spend, leads, and anything the automated rules paused.',
    'Pick up Hashid’s onboarding from wherever Gautam and Syed have taken it.',
    'Lane B / D / E — check whether the assets landed and the simultaneous launch went out.',
    'Complete the board report data fills.',
    'Resume campaign scaling on the winners.',
    'Restart the partner commercial discussion — delivery will have resumed; the billing terms are what waited.',
    'Voice agent — pick up Zavis’s status report and decide the next step.',
  ],
} as const;

/** Count of everything still to confirm — drives the "N items to confirm" chip. */
export function pendingCount(): number {
  let n = 0;
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.value === 'string' && o.pending === true) {
        n += 1;
        return;
      }
      Object.values(o).forEach(walk);
    }
  };
  walk(HANDOVER);
  return n;
}
