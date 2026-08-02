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
    responseWindow: P('Expected response window to confirm (e.g. within 24h)'),
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
      owner: P('Cover owner to confirm — this is my own area'),
      notes: 'Steady state only: the ramp continues on what is already live, no new activation until I return.',
    },
    {
      area: 'Paid campaigns',
      owner: P('Monitoring owner to confirm'),
      notes: 'Steady state only — see the decision rules below.',
    },
    {
      area: 'WhatsApp / Marketing OS',
      owner: V('Automated — escalate only if flows stop'),
      notes: 'The system runs itself. Escalate on outage, not on volume.',
    },
    {
      area: 'Website / organic',
      owner: V('No action needed'),
      notes: 'I review on return.',
    },
    {
      area: 'Lane E dashboard',
      owner: V('Runs automatically — 15-minute sync'),
      notes: 'Live throughout. The board report and this handover are served from it.',
    },
  ],

  /** Decision rules — so nobody has to make a judgement call in my absence. */
  decisionRules: {
    steadyState: [
      'Campaigns run steady state: no new campaigns, no scaling, budgets capped at current daily levels.',
      'No new vendor commitments, no billing-term confirmations, no contract signatures.',
    ],
    pauseRule: {
      text: 'If any ad set’s CPL breaches the agreed threshold for 3 consecutive days → pause it and note it for my return.',
      threshold: P('CPL pause threshold to confirm'),
    },
    escalate: [
      'Ad account disabled or billing failure.',
      'Facebook page or Google account restriction.',
      'Booking widget or WhatsApp flow outage lasting more than a few hours.',
    ],
    escalateNote:
      'These are the only "call Fahad" events. Everything else waits — and nothing is lost by waiting.',
  },

  /** Open items and where each one stands on 5 August. */
  openItems: [
    {
      title: 'Performance partner commercial discussion',
      status: P('Status line to confirm before 5 Aug'),
      position:
        'Holding position — no billing-term confirmations and no new commitments while I am away. It waits for my return.',
    },
    {
      title: 'Board growth report',
      status: V('Live at the board link'),
      position:
        'Remaining data fills are marked pending on the page itself. I complete them on return unless the figures are supplied earlier.',
    },
    {
      title: 'Voice agent R&D',
      status: P('Paused until return, or continuing — to confirm'),
      position: 'Core infrastructure is built and functional; this is the next-step decision, not a live dependency.',
    },
  ],

  /**
   * Access map — WHO HOLDS ACCESS, never what the secret is.
   * Adding a password, key or recovery detail to this list is a spec violation.
   */
  accessMap: [
    { system: 'Lane E dashboard (admin)', holders: P('Fahad + names to confirm') },
    { system: 'Meta Business Manager', holders: P('Names / roles to confirm') },
    { system: 'Google Ads', holders: P('Names / roles to confirm') },
    { system: 'Google Search Console', holders: P('Names to confirm') },
    { system: 'WhatsApp / Marketing OS admin', holders: P('Names to confirm') },
    { system: 'Website deploy (Vercel / Supabase)', holders: P('Fahad + names to confirm') },
  ],

  /** First week back. */
  onReturn: [
    'Away-period reconciliation — spend, leads, and anything that was paused.',
    'Complete the board report data fills.',
    'Resume campaign scaling on the winners.',
    'Restart the partner commercial discussion.',
    'Voice agent — decide and schedule the next step.',
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
