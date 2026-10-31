/**
 * Renders the daily 09:00 alert emails (the four live ones and the gated Clinic Activation email) (lib/alerts/registry.ts) from
 * synthetic fixture data, as preview copies, so the layout can be checked
 * against the approved templates without a database, network or email.
 *
 *   node --conditions=react-server --import tsx scripts/render-alert-previews.ts <outDir> [today]
 *
 * Writes <outDir>/<kind>.html for each email (kind without the "am:" prefix)
 * and prints each subject. `today` is the Dubai send day (default 2026-10-24,
 * the day the templates were approved). Fixture figures are the template's
 * sample figures, not real data. The --conditions flag is needed because some
 * builder imports are marked server-only.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// No credentials: nothing here reads a database or calls an API, and nothing can by accident.
for (const k of Object.keys(process.env)) {
  if (/SUPABASE|GOOGLE|GMB|META|SMTP|RESEND|SENDGRID|MAIL|PRACTO|SEARCH_CONSOLE|CRON_SECRET/i.test(k)) delete process.env[k];
}

type Kind = import('../lib/alerts/registry').DailyAlertKind;

async function main() {
  const [outArg, todayArg] = process.argv.slice(2);
  if (!outArg) {
    console.error('Usage: node --conditions=react-server --import tsx scripts/render-alert-previews.ts <outDir> [today YYYY-MM-DD]');
    process.exit(2);
  }
  const today = todayArg ?? '2026-10-24';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error('today must be YYYY-MM-DD');
  const outDir = resolve(outArg);

  const { ALL_ALERTS: DAILY_ALERTS, nextSendDay, previewNote, recipientsLine } = await import('../lib/alerts/registry');
  const { CHANNELS } = await import('../config/growth-channels');
  const { ORTHO_CHECKLIST } = await import('../config/ortho-checklist');
  const { ORTHO_GOOGLE_CAMPAIGN } = await import('../lib/alerts/orthoDaily');
  const { recentShootChanges } = await import('../lib/alerts/smileclubDaily');
  type SmileClubDailyData = import('../lib/alerts/smileclubDaily').SmileClubDailyData;
  type OrthoDailyData = import('../lib/alerts/orthoDaily').OrthoDailyData;
  type GbpDailyData = import('../lib/alerts/gbpDaily').GbpDailyData;
  type PerformanceDailyData = import('../lib/alerts/performanceDaily').PerformanceDailyData;
  type PerfChannel = import('../lib/alerts/performanceDaily').PerfChannel;
  type GrowthWindow = import('../lib/alerts/performanceDaily').GrowthWindow;

  /* ── 1 Smile Club (template 1 sample figures) ── */
  const smileClub: SmileClubDailyData = {
    growth: {
      all: { yesterday: { enquiries: 2, booked: 4, showed: 3 }, mtd: { enquiries: 38, booked: 61, showed: 47 } },
      'dn-alwasl': { yesterday: { enquiries: 1, booked: 2, showed: 2 }, mtd: { enquiries: 22, booked: 36, showed: 28 } },
      'dr-tosun': { yesterday: { enquiries: 1, booked: 2, showed: 1 }, mtd: { enquiries: 16, booked: 25, showed: 19 } },
      amc: { yesterday: { enquiries: 0, booked: 1, showed: 1 }, mtd: { enquiries: 0, booked: 6, showed: 4 } },
    },
    companies: {
      byStage: { target: 11, contacted: 8, meeting: 4, proposal: 3, signed: 2, launched: 1, lost: 2 },
      members: 9,
    },
    // The shoot plan log is a code constant (lib/smileclub/shoots.ts), not a feed.
    shootChanges: recentShootChanges(today),
    scriptsWaiting: { shadi: 1, luvi: 1, gautam: 0 },
    tasksDueToday: {
      gautam: ['Follow up the companies with a proposal sent'],
      mj: ['Confirm Dr Tosun’s shoot day and Dr Ghada’s new date'],
      luvi: [],
      shadi: [],
    },
  };

  /* ── 2 DN Ortho (template 2 sample figures; campaign not live) ── */
  const zero = { spend: 0, impressions: 0, clicks: 0, activeDays: 0 };
  const ortho: OrthoDailyData = {
    doctors: [
      { key: 'hasna', name: 'Dr Hasna Alsaeed', clinic: 'dental-nation', clinicLabel: 'Dental Nation Al Wasl', billedMtd: 38600 },
      { key: 'yasmin', name: 'Dr Yasmin Youssef', clinic: 'dental-nation', clinicLabel: 'Dental Nation Al Wasl', billedMtd: 21900 },
      { key: 'yahya', name: 'Dr Yahya Tosun', clinic: 'dr-tosun', clinicLabel: 'Dr. Tosun Dental Clinic', billedMtd: 47300 },
    ],
    googleSearch: { campaign: ORTHO_GOOGLE_CAMPAIGN, yesterday: { ...zero }, mtd: { ...zero } },
    checklist: ORTHO_CHECKLIST,
  };

  /* ── 3 Google Business Profile (template 3 sample figures, D = Tue 20 Oct) ── */
  const set = (calls: number, directions: number, websiteClicks: number, mapViews: number) => ({ calls, directions, websiteClicks, mapViews });
  const gbp: GbpDailyData = {
    latestDay: '2026-10-20',
    all: { day: set(18, 16, 27, 896), weekEarlier: set(14, 18, 25, 870) },
    branches: [
      { key: 'dental-nation', status: 'ok', latestDay: '2026-10-21', day: set(9, 7, 14, 412), mtd: set(144, 105, 238, 7828),
        reviews: { newYesterday: 0, total: 612, average: 4.8, unanswered: 0 } },
      { key: 'dr-tosun', status: 'ok', latestDay: '2026-10-21', day: set(6, 4, 9, 288), mtd: set(96, 60, 153, 5472),
        reviews: { newYesterday: 1, total: 344, average: 4.9, unanswered: 1 } },
      { key: 'al-maher', status: 'ok', latestDay: '2026-10-20', day: set(3, 5, 4, 196), mtd: set(48, 75, 68, 3724),
        reviews: { newYesterday: 0, total: 121, average: 4.6, unanswered: 0 } },
    ],
  };

  /* ── 4 Daily and month to date performance (template 4 sample figures) ── */
  const ch = (key: string, over: Partial<PerfChannel> = {}): PerfChannel =>
    ({ key, enquiries: 0, booked: 0, showed: 0, spend: null, costPerEnquiry: null, costIsEstimate: false, ...over });
  const win = (totals: { enquiries: number; booked: number; showed: number }, over: Record<string, Partial<PerfChannel>>): GrowthWindow =>
    ({ ...totals, channels: CHANNELS.map((c) => ch(c.key, over[c.key])) });
  const performance: PerformanceDailyData = {
    growth: {
      yesterday: win({ enquiries: 28, booked: 15, showed: 12 }, {
        'paid-search': { enquiries: 4 }, 'paid-social': { enquiries: 0 }, gmb: { enquiries: 6 }, website: { enquiries: 3 },
        whatsapp: { enquiries: 7 }, partnership: { enquiries: 2 }, 'direct-walkin': { enquiries: 6 },
      }),
      mtd: win({ enquiries: 416, booked: 245, showed: 203 }, {
        'paid-search': { enquiries: 61, booked: 22, spend: 9840, costPerEnquiry: 161, costIsEstimate: true },
        'paid-social': { enquiries: 0, booked: 0, spend: 0, costPerEnquiry: null },
        gmb: { enquiries: 92, booked: 51 }, website: { enquiries: 57, booked: 26 }, whatsapp: { enquiries: 96, booked: 58 },
        partnership: { enquiries: 38, booked: 61, showed: 47 }, 'direct-walkin': { enquiries: 72, booked: 67 },
      }),
      last7: win({ enquiries: 120, booked: 70, showed: 60 }, { whatsapp: { enquiries: 33 }, 'paid-search': { enquiries: 12 }, gmb: { enquiries: 20 } }),
      prior7: win({ enquiries: 118, booked: 71, showed: 61 }, { whatsapp: { enquiries: 28 }, 'paid-search': { enquiries: 17 }, gmb: { enquiries: 20 } }),
    },
    clinics: {
      'dental-nation': { yesterday: { booked: 9, showed: 7, billed: 18450 }, mtd: { booked: 148, showed: 121, billed: 402300 } },
      'dr-tosun': { yesterday: { booked: 6, showed: 5, billed: 12900 }, mtd: { booked: 97, showed: 82, billed: 268750 } },
      'al-maher': { yesterday: { booked: 0, showed: 0, billed: 0 }, mtd: { booked: 0, showed: 0, billed: 0 } },
      group: { yesterday: { booked: 15, showed: 12, billed: 31350 }, mtd: { booked: 245, showed: 203, billed: 671050 } },
    },
    adSpendMtd: 9840,
    orthoBillingMtd: 107800,
    smileClubMembers: 9,
    reviews: { total: 1077, average: 4.8 },
    brandSearches: 1900,
    brandedShare: { percent: 38, from: '2026-10-01', to: '2026-10-20' },
    instagram: { followers: 12480, reachMtd: 96300 },
  };

  /* ── 5 Clinic Activation (synthetic figures, built with the reader's own pure counters) ── */
  const { countLeads, countSmileClub, summariseAmc, summariseGmb } = await import('../lib/activation/read');
  const { periods, addDaysIso } = await import('../lib/alerts/links');
  type ClinicActivation = import('../lib/activation/read').ClinicActivation;
  type LeadRow = import('../lib/activation/read').LeadRow;
  const P = periods(today);
  const y = P.yesterday.to;
  const dayBefore = addDaysIso(y, -1);
  const leadRow = (tab: string, date: string, platform: string, clinic: string | null, booked = false): LeadRow => ({
    inquiry_date: date, booking_status: booked ? 'booked' : null, channel_source: platform, clinic, whatsapp_ref: null,
    raw_row: { _source_tab: tab, 'Inquiry Platform': platform },
  });
  const leadRows: LeadRow[] = [
    ...Array.from({ length: 5 }, (_, i) => leadRow('DN Campaign Leads  ❤', y, i < 3 ? 'Instagram' : 'WhatsApp', 'DN Al Wasl', i === 0)),
    ...Array.from({ length: 4 }, (_, i) => leadRow('TDC Campaign Leads', y, i < 2 ? 'Facebook' : 'Telephone', 'Tosun Clinic', i === 1)),
    ...Array.from({ length: 2 }, () => leadRow('AMC Campaign Leads  ❤', y, 'WhatsApp', 'AMC Branch')),
    leadRow('Leads', y, 'Walk in', 'Somewhere else'),
    ...Array.from({ length: 40 }, (_, i) => leadRow('DN Campaign Leads  ❤', `${y.slice(0, 7)}-${String(1 + (i % Math.max(1, Number(y.slice(8)) - 1))).padStart(2, '0')}`, ['Instagram', 'WhatsApp', 'Facebook', 'Google'][i % 4], ['DN Al Wasl', 'Tosun Clinic', 'AMC Branch'][i % 3], i % 5 === 0)),
  ];
  const sc = (date: string, clinic: string, follow: string, conversion: string) =>
    ({ data: { _source_tab: 'Smile Club', Date: `${date.slice(8)}.${date.slice(5, 7)}.${date.slice(0, 4)}`, 'Clinic / Branch': clinic, 'Follow up Remarks': follow, Conversion: conversion } });
  const smileRows = [
    sc(y, 'DN Al Wasl', 'called', 'CONVERTED'), sc(y, 'Tosun Clinic', '', ''), sc(dayBefore, 'DN Al Wasl', 'no answer', ''),
    sc(dayBefore, 'AMC Branch', 'called', 'booked'), sc(`${y.slice(0, 7)}-01`, 'Tosun Clinic', 'called', ''),
  ];
  const gmb = (day: string, clinic: string, fo: string, today: number, total: number, photos: number, videos: number | null) => ({
    snapshot_day: day, clinic, fo_name: fo, reviews_today: today, reviews_individual: null, reviews_total: total, photos, videos,
    month_title: 'Google My Business', synced_at: `${day}T10:00:00Z`,
  });
  // Al Maher has no copy yet, so the preview shows "Daily copies start 29 Oct 2026".
  const gmbRows = [
    gmb(y, 'dental-nation', 'Asha', 3, 618, 4, 1), gmb(dayBefore, 'dental-nation', 'Asha', 2, 615, 2, null),
    gmb(y, 'dr-tosun', 'Rina', 1, 349, 2, 0),
  ];
  const amcRow = (date: string, invoiced: string, appts: number) => ({
    report_date: date, total_appointments: appts, consulted: appts - 1, invoiced: appts - 1, non_invoiced: 1, cancelled: 1,
    patients_old: appts - 2, patients_new: 2, invoice_amount_total: invoiced, insurance_total: '2757.71', copay_total: '306.38',
    cash_total: '0', card_total: '889.50', advance_total: null, balance_total: null, invoice_count: appts - 1, doctors: {}, prepared_by: null,
  });
  const activation: ClinicActivation = {
    today, yesterday: P.yesterday, window: P.mtd,
    leads: countLeads(leadRows, P),
    smileClub: countSmileClub(smileRows, P),
    gmb: summariseGmb(gmbRows, P),
    revenue: {
      practo: { source: 'practo', byClinic: {
        all: { yesterday: 14320, window: 402180 },
        'dental-nation': { yesterday: 7240, window: 241900 },
        'dr-tosun': { yesterday: 4339, window: 148600 },
        'al-maher': { yesterday: 2741, window: 11680 },
      } },
      amc: summariseAmc([amcRow(y, '3914.12', 9), amcRow(dayBefore, '2210.00', 7)], P),
    },
    ortho,
  };

  // DN Ortho weekly: invented rows (no real figures), shaped like the synced tables.
  const { buildOrthoDashboard, funnelFor } = await import('../lib/ortho/dashboard');
  const { weeklyRanges } = await import('../lib/alerts/orthoWeekly');
  const wr = weeklyRanges(today);
  const dayIn = (r: { from: string }, n: number) => { const d = new Date(`${r.from}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const src = {
    google: [0, 1, 2, 3, 4].flatMap((n) => [
      { campaign_name: 'Search | DNO Ortho | EN | Dubai | 2026-10', date: dayIn(wr.lastWeek, n), spend: 52, impressions: 210, clicks: 6 },
      { campaign_name: 'Search | DNO Ortho | EN | Dubai | 2026-10', date: dayIn(wr.weekBefore, n), spend: 48, impressions: 190, clicks: 5 },
    ]),
    googleAds: [0, 1, 2].map((n) => ({ ad_name: ['Teeth Straightening in Dubai', 'Lost or Broken Retainer?', 'Braces for Kids and Teens'][n], day: dayIn(wr.lastWeek, n), spend: [120, 60, 30][n] })),
    meta: [0, 1, 2, 3].map((n) => ({ campaign_name: 'Leads | WhatsApp | New Angles', adset_name: n % 2 ? 'Ortho Everyday Experts | Arabic' : 'Ortho Everyday Experts | English', date: dayIn(wr.lastWeek, n), spend: 60,
      data: { actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '5' }, { action_type: 'onsite_conversion.messaging_user_depth_2_message_send', value: '2' }] } })),
    leads: Array.from({ length: 12 }, (_, n) => ({ inquiry_date: dayIn(wr.lastWeek, n % 7), raw_row: { _source_tab: 'Leads', 'Service / Inquiry Type': 'braces and clear aligners', Status: n < 2 ? 'Arrived' : n < 9 ? 'No answer' : 'Interested' } })),
    appts: Array.from({ length: 18 }, (_, n) => ({ appt_date: dayIn(wr.lastWeek, n % 6), status: n % 5 ? 'Completed' : 'Cancel', doctor: n % 2 ? 'Dr. Hasna Alsaeed' : 'Dr.Yahya Serif Tosun', mr_no: `P${n}` })),
    firstVisit: new Map(Array.from({ length: 18 }, (_, n) => [`P${n}`, n < 4 ? dayIn(wr.lastWeek, n % 6) : '2026-01-10'] as [string, string])),
    bills: [{ bill_date: dayIn(wr.lastWeek, 2), data: { charges: [{ description: 'Pre-Orthodontic Treatment Visit', amount: 550 }, { description: 'Comprehensive orthodontic treatment of the adult dentition,ceramic', amount: 18000 }, { description: 'Essix Retainer /Per Arch', amount: 700 }] } }],
  };
  const orthoWeekly = {
    today, ...wr,
    last: funnelFor(src, wr.lastWeek), before: funnelFor(src, wr.weekBefore),
    week: buildOrthoDashboard(src, wr.lastWeek), all: buildOrthoDashboard(src, wr.since),
  };

  const fixtures: Record<Kind, unknown> = {
    'am:sc-daily': smileClub,
    'am:ortho-daily': ortho,
    'am:gbp-daily': gbp,
    'am:akbar-perf': performance,
    'am:clinic-activation': activation,
    'am:ortho-weekly': orthoWeekly,
  };

  mkdirSync(outDir, { recursive: true });
  // The preview copy names the next live send day, as the cron's preview does at 09:00.
  const sendDay = nextSendDay(today, 9);
  for (const alert of DAILY_ALERTS) {
    const email = alert.build(fixtures[alert.kind], today, { preview: previewNote(alert, sendDay), recipients: recipientsLine(alert) });
    const file = join(outDir, `${alert.kind.replace(/^am:/, '')}.html`);
    const doc = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${email.subject.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)}</title></head><body style="margin:0;background:#EEF1F4">${email.html}</body></html>`;
    writeFileSync(file, doc);
    console.log(`${file}\n  [Preview] ${email.subject}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : 'render failed');
  process.exit(1);
});
