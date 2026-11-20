/**
 * Exit handover: content source for /next/handover (Fahad resigned 22 Oct
 * 2026; two months' notice, last day around 22 December 2026).
 *
 * Content lives here (not in JSX) so the wording can be corrected without
 * touching layout. Same two hard rules as config/handover.ts:
 *  1. NO credentials. Access is described by WHO HOLDS IT, never by what the
 *     secret is. No passwords, keys, tokens, recovery codes or account numbers.
 *  2. NO patient data and no personal contact details.
 *
 * `P()` marks anything not yet agreed with management: it renders as an amber
 * "to confirm" chip, so nothing looks settled before it is.
 */
import { P, V, type Slot } from './handover';

export { P, V, type Slot };

export interface HandoverItem { title: string; body: string; owner?: Slot; link?: { label: string; href: string } }

export const EXIT_HANDOVER = {
  cover: {
    title: 'Digital Marketing: Exit Handover',
    author: 'Fahad Siddiqui, Head of Digital Marketing',
    audience: 'For Mr Akbar, Ms Shadi, Dr Luvi and Gautam',
    lastDay: P('Around 22 December 2026 (two months from the 22 October resignation)'),
    asOf: '19 November 2026',
    summary:
      'Everything I run, where it lives, who should own it after I leave, and what is still open. The dashboard and the 9am emails run on their own; the people-dependent parts are the task tracker updates, the Smile Club membership read, the ad accounts and the decisions listed under open items.',
  },

  /** The screens to use instead of asking for a report. */
  links: [
    { label: 'Projects (home)', href: '/next/projects', what: 'Every project on one screen: targets, activities and bottlenecks. Same figures as the 9am snapshot email to Ms Shadi.' },
    { label: 'Clinic Activation', href: '/next/projects/clinic-activation', what: 'Leads and billed revenue for Al Wasl, Dr Tosun and Al Maher against the 2026 targets, plus the distribution plan tasks.' },
    { label: 'DN Ortho', href: '/next/projects/ortho', what: 'Ortho funnel: spend, leads, appointments, attended, assessments and starts.' },
    { label: 'Google Business Profile', href: '/next/projects/gbp', what: "Ms Shadi's GBP plan clinic by clinic, with Google reviews against the 30-day targets. Filter by clinic at the top." },
    { label: 'Smile Club', href: '/next/projects/smile-club', what: 'Paying members and monthly revenue (from the membership admin), enquiries, and the Smile Club plan tasks.' },
    { label: 'Channels: CPL and CAC', href: '/next/channels#cpl-cac', what: 'Cost per lead gross and net, cost per booking and cost per attended patient, by channel. Leads matched to Practo within 60 days.' },
    { label: 'Content Calendar', href: '/next/calendar', what: 'Planned and published content.' },
    { label: 'Detailed dashboard', href: '/?tab=executive', what: 'The original full dashboard, including Clinical Operations (booking widget uptime).' },
  ],

  /** What runs by itself, and what it needs to keep running. */
  automation: [
    {
      title: 'Data sync every 15 minutes',
      body: 'Pulls the Google Sheets (Inhouse Lead Tracker, GBP Daily log, Revenue AMC daily reports, AMC Checklist, Social PR, website booking widget and others), Meta ads, Google Ads and Practo into the dashboard database. No action needed while the sheets keep their column names and stay shared with the dashboard service account.',
      owner: V('Runs automatically on Vercel'),
    },
    {
      title: '9am emails (Dubai time)',
      body: 'Sent from the alerts mailbox, one email per report, each linking to its page on reports.dentalnation.com. Recipients are listed in the next section. To add or remove a person, the recipient list in the dashboard code (lib/alerts/registry.ts) is changed and redeployed: a five-minute change for whoever maintains the code.',
      owner: P('Code maintenance after I leave: Zavis (Syed) or a developer named by Mr Akbar'),
    },
    {
      title: 'Zavis ad-lead alert',
      body: 'Every new lead from the WhatsApp and Facebook ads is emailed to Dr Luvi and MJ within a minute, so the front desk calls back the same day. Runs from the Zavis webhook; nothing to do day to day.',
      owner: V('Dr Luvi and MJ receive it; Zavis runs the webhook'),
    },
    {
      title: 'Booking widget and website uptime',
      body: 'Checked automatically and shown on the Clinical Operations tab of the detailed dashboard.',
      owner: V('Runs automatically'),
    },
  ] as HandoverItem[],

  /** The emails, who gets them, and the change needed when I leave. */
  emails: [
    { report: 'Daily snapshot (all projects)', to: 'Ms Shadi', when: 'Daily, 9am' },
    { report: 'Smile Club daily', to: 'Gautam, Dr Luvi, Ms Shadi, MJ', when: 'Daily, 9am' },
    { report: 'DN Ortho daily', to: 'Dr Luvi, MJ', when: 'Daily, 9am' },
    { report: 'DN Ortho weekly', to: 'Dr Luvi, Mr Akbar', when: 'Mondays, 9am' },
    { report: 'Google Business Profile daily', to: 'Mr Akbar, Dr Luvi', when: 'Daily, 9am' },
    { report: 'Clinic Activation daily', to: 'Mr Akbar, Dr Luvi', when: 'Daily, 9am' },
    { report: 'Daily and month to date performance', to: 'Mr Akbar', when: 'Daily, 9am' },
  ],
  emailsNote:
    'All of these copy me today, and the preview copies come to me. On my last day my copy and the previews need to move to my successor (or be dropped), otherwise they go to a mailbox nobody reads. I will make that change before I leave once the name is agreed.',

  /** Work that needs a person, and who should own it. */
  ownership: [
    {
      title: 'Project task tracker',
      body: "The activities on each project page (distribution plan, Ms Shadi's GBP plan, the Smile Club plan) are tracked in the dashboard's task list. Today only one of 98 tasks is marked done, because nobody records progress. Unless an owner updates the status weekly (Not started, In progress, Done, Blocked, On hold), the pages will keep showing everything as overdue.",
      owner: P('Each project lead updates their own tasks weekly; Dr Luvi to check'),
    },
    {
      title: 'Smile Club membership figures',
      body: 'The membership admin (smileclub.dentalnation.com/admin) has no export, so the paying members and monthly revenue on the dashboard are entered from a read of the admin page. Last read 17 November: 5 active members, AED 695 a month, 3 incomplete applications. Someone with admin access should send a fresh read weekly, or ask the site builder for an export.',
      owner: P('Gautam'),
    },
    {
      title: 'Meta and Google ad accounts',
      body: 'Campaigns are delivered by Zavis (Syed). Budgets, pauses and new campaigns need an internal decision maker once I leave.',
      owner: P('Decisions: Dr Luvi with Mr Akbar. Delivery: Zavis'),
    },
    {
      title: 'Monthly card receipts (Mamo)',
      body: 'Accounts asks each month for the receipts of the marketing card spend. October is done (Meta, Google, ChatGPT, Higgsfield). GoDaddy goes to Mr Emir; Adobe, Claude, Zoho and the other software are not mine.',
      owner: P('Whoever takes over the marketing card'),
    },
    {
      title: 'Lead tracker quality',
      body: 'The CPL and CAC figures are only as good as the Inhouse Lead Tracker: source, campaign and phone number on every row, and real dates (one row is dated July 2027 today). Reception and the call team fill it in.',
      owner: P('Dr Luvi (reception and call team)'),
    },
    {
      title: 'Google reviews and GBP activities',
      body: "Ms Shadi's GBP plan runs from 9 October with 31 activities across the three clinics. Reception records Google Maps as the patient source so new patients from Google can be counted.",
      owner: P('Clinic managers, with Mr Akbar'),
    },
  ] as HandoverItem[],

  /** Where things stand and what is waiting. */
  openItems: [
    {
      title: 'Google Ads: second account not connected',
      body: 'The Google Ads connection works; it shows no spend after 6 November because Search is paused. Only one of the two Google Ads accounts is connected, so the second account needs adding before Google CPL and CAC are complete.',
      owner: P('Zavis (Syed), before my last day'),
    },
    {
      title: 'Smile Club site: two fixes for whoever built it',
      body: 'The revenue tile in the admin is labelled wrongly, and the signed agreement PDFs sit at simple numbered web addresses that should be locked down. Both reported; not fixed yet.',
      owner: P('Smile Club site builder'),
    },
    {
      title: 'CPL and CAC so far',
      body: 'Meta, October: AED 10,225 spent, cost per lead AED 33 gross and AED 37 net, 7 booked and 2 attended (about AED 5,100 per attended patient). 1 to 16 November: AED 3,310, cost per lead AED 50 gross and AED 53 net, no bookings matched yet. Al Maher is not in Practo, so its patients are not matched.',
    },
    {
      title: 'Targets still missing',
      body: "DN Ortho and Smile Club have no monthly targets on the dashboard; they show \"No target set\" and are never marked behind. When Ms Shadi's targets are agreed they are added in one place (config/project-targets.ts).",
      owner: P('Ms Shadi'),
    },
    {
      title: 'Daily distribution update',
      body: 'I send a daily distribution update to the distribution team. It stops on my last day.',
      owner: P('Decide whether my successor continues it'),
    },
  ] as HandoverItem[],

  /** WHO HOLDS ACCESS, never what the secret is. */
  accessMap: [
    { system: 'Dashboard (reports.dentalnation.com)', holders: V('Mr Akbar manages the passwords; Dr Luvi and Gautam have their own logins') },
    { system: 'Dashboard code, hosting and database (GitHub, Vercel, Supabase)', holders: P('Held under my account today: to transfer to a Dental Nation owner named by Mr Akbar') },
    { system: 'Alerts mailbox (sends the 9am emails)', holders: P('Dental Nation Microsoft 365 admin') },
    { system: 'Meta Business Manager', holders: V('Zavis (Syed), Gautam, Dr Luvi') },
    { system: 'Google Ads (both accounts)', holders: V('Zavis (Syed), Gautam, Dr Luvi') },
    { system: 'Google Business Profiles (three clinics)', holders: P('To confirm with Mr Akbar') },
    { system: 'Smile Club membership admin', holders: P('To confirm: Gautam and the site builder') },
    { system: 'Inhouse Lead Tracker and GBP Plan sheets', holders: V('Shared Google Sheets: owners stay as they are; the dashboard reads them') },
  ],

  /** My plan for the remaining weeks. */
  plan: [
    'Agree the owners above with Mr Akbar and Ms Shadi, and update this page.',
    'Walk Dr Luvi and Gautam through the project pages and the task tracker (30 minutes).',
    'Get the second Google Ads account connected to the dashboard.',
    'Transfer ownership of the dashboard code, hosting and database to the named Dental Nation owner.',
    'On my last day: move my email copies and the previews to my successor, and stop my daily update.',
  ],
} as const;

export function exitPendingCount(): number {
  let n = 0;
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.value === 'string' && o.pending === true) { n += 1; return; }
      Object.values(o).forEach(walk);
    }
  };
  walk(EXIT_HANDOVER);
  return n;
}
