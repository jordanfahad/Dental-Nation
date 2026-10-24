/**
 * Renders the four daily 09:00 alert emails (lib/alerts/registry.ts) from
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

type Kind = 'am:sc-daily' | 'am:ortho-daily' | 'am:gbp-daily' | 'am:akbar-perf';

async function main() {
  const [outArg, todayArg] = process.argv.slice(2);
  if (!outArg) {
    console.error('Usage: node --conditions=react-server --import tsx scripts/render-alert-previews.ts <outDir> [today YYYY-MM-DD]');
    process.exit(2);
  }
  const today = todayArg ?? '2026-10-24';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error('today must be YYYY-MM-DD');
  const outDir = resolve(outArg);

  const { DAILY_ALERTS, nextSendDay, previewNote, recipientsLine } = await import('../lib/alerts/registry');
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

  const fixtures: Record<Kind, unknown> = {
    'am:sc-daily': smileClub,
    'am:ortho-daily': ortho,
    'am:gbp-daily': gbp,
    'am:akbar-perf': performance,
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
