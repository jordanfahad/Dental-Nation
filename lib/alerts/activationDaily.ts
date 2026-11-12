/**
 * Clinic Activation daily 09:00 email (Dr Luvi's daily report).
 * To Mr Akbar, Ms Shadi and Dr Luvi; copied to Fahad. Gated: it goes to them
 * only once CLINIC_ACTIVATION_LIVE_FROM (lib/alerts/registry.ts) is set; until
 * then only the preview to Fahad renders it.
 *
 * The same five sections as /next/activation, in compact form, from the same
 * read (readClinicActivation) and the same view model (buildActivation), so
 * the email and the page can never disagree. Every figure links to the page
 * pinned to the same dates (yesterday's figures sit in the page's yesterday
 * column of the month-to-date view), except where the page's drawer opens an
 * existing detail view that proves the figure exactly: Practo billed links
 * the Executive view as the morning performance email does, and the DN Ortho
 * figures link the views the DN Ortho email uses. A null is "not yet", never 0.
 */
import type { AdminClient } from '@/lib/supabase/server';
import { readClinicActivation, type ClinicActivation } from '@/lib/activation/read';
import { amcMonthFileLine, buildActivation, CONVERTED_RULE, DOCTOR_RULE, GMB_NO_COPY, SNAPSHOT_NOTE, TOSUN_LEADS_NOTE, type ActivationData } from '@/lib/overview/activation';
import { activationLink, type ActivationSection } from './links';
import {
  bold, dayLabel, emailHtml, finishEmail, fmt, gap, h2, note, NOT_YET, num, proof, rangeLabel, table, text, tiles,
} from './shell';

export type ActivationDailyData = ClinicActivation;
export const ACTIVATION_DAILY_RECIPIENTS = 'To Mr Akbar and Dr Luvi; copied to Fahad.';

/** The default read: yesterday and the 1st of yesterday's month to yesterday. Never throws per source. */
export const readActivationDaily = (db: AdminClient, today: string): Promise<ClinicActivation> => readClinicActivation(db, today);

const aed = (v: number | null) => (v == null ? null : `AED ${fmt(v)}`);
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;
/** A linked count with its noun ("1 video", "6 photos"); null is "not yet" with the plural noun. */
const counted = (v: number | null, one: string, many: string, href: string) => `${num(v, href)} ${text(v === 1 ? one : many)}`;

/** Pure: no IO. */
export function buildActivationDaily(
  raw: ClinicActivation,
  today: string,
  opts: { preview?: string; recipients?: string } = {},
): { subject: string; html: string } {
  const d: ActivationData = buildActivation(raw);
  const { yesterday, window } = d;
  const page = (s?: ActivationSection) => activationLink(window, s);
  const muted = (s: string) => `<span style="color:#6B7280">${text(s)}</span>`;

  /* a. Leads */
  const leadTotal = d.leads.lines.find((l) => l.key === 'total')!;
  const leadsHref = page('leads');
  const leadRows = d.leads.lines.map((l) => [
    l.key === 'total' ? bold(l.name) : text(l.name),
    num(l.yesterday.leads, leadsHref), num(l.window.leads, leadsHref), num(l.window.converted, leadsHref),
    !d.leads.read ? NOT_YET : l.platforms.length
      ? l.platforms.map((p) => `${text(p.label)} ${num(p.count, leadsHref)}`).join(', ')
      : muted('none'),
  ]);

  /* b. Smile Club */
  const smileHref = page('smile-club');
  const smileRows = d.smileClub.lines.map((l) => [
    l.key === 'total' ? bold(l.name) : text(l.name),
    num(l.yesterday.enquiries, smileHref), num(l.window.enquiries, smileHref),
    num(l.window.followedUp, smileHref), num(l.window.converted, smileHref),
  ]);

  /* c. Google Business Profile (front office) */
  const gbpHref = page('gbp');
  const gbpRows = d.gbp.lines.filter((l) => l.key !== 'total').map((l) => {
    const s = l.latest;
    const w = l.window;
    const latest = !d.gbp.read
      ? [NOT_YET, NOT_YET, NOT_YET, NOT_YET, NOT_YET]
      : s
        ? [text(s.foName ?? 'not entered'), num(s.reviewsToday, gbpHref), num(s.reviewsTotal, gbpHref), num(s.photos, gbpHref), num(s.videos, gbpHref)]
        : [muted(GMB_NO_COPY), '', '', '', ''];
    const sums = !d.gbp.read
      ? [NOT_YET]
      : w.days === 0
        ? [muted(GMB_NO_COPY)]
        : [[counted(w.reviewsToday, 'review', 'reviews', gbpHref), counted(w.photos, 'photo', 'photos', gbpHref),
          counted(w.videos, 'video', 'videos', gbpHref), counted(w.days, 'day copied', 'days copied', gbpHref)].join(' · ')];
    return [text(l.name), ...latest, ...sums];
  });

  const CLINIC_LABEL: Record<string, string> = { 'dental-nation': 'Al Wasl', 'dr-tosun': 'Dr Tosun', 'al-maher': 'Al Maher' };
  /* c2. Front office, per person */
  const foRows = d.gbp.frontOffice.map((f) => [
    bold(f.foName), text(CLINIC_LABEL[f.clinic]),
    num(f.reviewsToday, gbpHref), num(f.photos, gbpHref), num(f.videos, gbpHref), num(f.days, gbpHref),
  ]);

  /* d. Revenue: the same measures for every clinic, each row with its source */
  const revRows = d.revenue.rows.map((r) => [
    r.key === 'total' ? bold(r.name) : text(r.name),
    num(aed(r.yesterday), r.urlYesterday), num(aed(r.window), r.urlWindow), num(r.billsWindow, r.urlWindow),
    `${muted(r.source)} ${r.window != null ? proof(r.sourceUrl, 'Source') : ''}`,
  ]);
  const docRows = (d.revenue.doctors ?? []).map((l) => [
    text(l.doctor), text(l.clinicName), num(aed(l.yesterday), l.sourceUrl), num(aed(l.window), l.sourceUrl), num(l.billsWindow, l.sourceUrl),
    muted(l.source),
  ]);

  const totalRev = d.revenue.rows.find((r) => r.key === 'total')!;
  const amc = d.revenue.amc;
  const missing = amc.missingDays;
  const amcDaysLine = amc.daysReported == null
    ? 'AMC daily sheet: could not be read.'
    : `AMC daily sheet: ${plural(amc.daysReported, 'day', 'days')} reported in ${rangeLabel(window.from, window.to)}; ${missing && missing.length ? `${plural(missing.length, 'day', 'days')} missing` : 'no days missing'}.${amc.monthFile ? ` ${amcMonthFileLine(amc.monthFile)}` : ''}`;

  /* e. DN Ortho */
  const o = d.ortho;
  const campaignRow = [
    text('Google Search: DN Ortho'),
    !o.read ? NOT_YET : o.live ? text('Live') : text('Not live yet'),
    o.live ? `${num(aed(o.spend.yesterday), o.campaignUrlYesterday)} · ${num(o.clicks.yesterday, o.campaignUrlYesterday)} clicks` : NOT_YET,
    o.live ? `${num(aed(o.spend.window), o.campaignUrlWindow)} · ${num(o.clicks.window, o.campaignUrlWindow)} clicks` : NOT_YET,
    proof(o.campaignUrlWindow),
  ];
  const orthoRows = o.doctors.map((doc) => [
    text(doc.name), text(doc.clinicLabel), num(aed(doc.billed), doc.url), doc.billed == null ? '' : proof(doc.url),
  ]);

  const body = [
    h2('1. Leads'),
    tiles([
      { label: 'Leads · yesterday', value: leadTotal.yesterday.leads, href: leadsHref },
      { label: 'Leads · month to date', value: leadTotal.window.leads, href: leadsHref },
      { label: 'Converted · month to date', value: leadTotal.window.converted, href: leadsHref },
    ]),
    table(['Clinic', 'Yesterday', 'Month to date', 'Converted', 'Top platforms'], leadRows, [1, 2, 3]),
    note(`Source: the lead tracker lead tabs (Smile Club, GMB and website tabs left out), by enquiry date. ${CONVERTED_RULE} ${TOSUN_LEADS_NOTE}`),
    note(SNAPSHOT_NOTE),

    h2('2. Smile Club'),
    table(['Clinic', 'Enquiries yesterday', 'Enquiries month to date', 'Followed up', 'Converted'], smileRows, [1, 2, 3, 4]),
    note('Source: the lead tracker’s Smile Club tab. Followed up and converted are month to date.'),

    h2('3. Google Business Profile (front office)'),
    note('As entered by the front office in the lead tracker GMB tab, snapshotted daily.'),
    table(['Clinic', 'Front office', 'Reviews today', 'Reviews total', 'Photos', 'Videos', 'Month to date'], gbpRows, [2, 3, 4, 5]),
    note(`Front office entries, not Google’s own figures.`),
    foRows.length ? table(['Front office', 'Clinic', 'Reviews collected', 'Photos', 'Videos', 'Days reported'], foRows, [2, 3, 4, 5]) : '',
    foRows.length ? note('Month to date, per person, from the same GMB tab.') : '',
    `<p style="margin:2px 0">${proof(d.gbp.googleUrl, 'Google’s own review count')}</p>`,

    h2('4. Revenue'),
    table(['Clinic', 'Billed yesterday', 'Billed month to date', 'Bills month to date', 'Source'], revRows, [1, 2, 3]),
    note(amcDaysLine),
    h2('4b. Revenue by doctor (month to date)'),
    docRows.length ? table(['Doctor', 'Clinic', 'Yesterday', 'Month to date', 'Bills', 'Source'], docRows, [2, 3, 4])
      : note('Doctor revenue could not be read this morning.'),
    note(DOCTOR_RULE),

    h2('5. DN Ortho'),
    table(['Campaign', 'Status', 'Yesterday', 'Month to date', ''], [campaignRow], [2, 3]),
    table(['Orthodontist', 'Clinic', 'Billed month to date', ''], orthoRows, [2]),
    gap('Orthodontist billing above uses Practo’s treating-doctor field, which is rarely filled; the doctor table in section 4b uses the appointment match instead.'),
  ].join('\n');

  const leadsPart = leadTotal.yesterday.leads == null ? 'leads not yet' : plural(leadTotal.yesterday.leads, 'lead', 'leads');
  const practoY = d.revenue.practo.find((p) => p.key === 'together')?.yesterday ?? null;
  const billedPart = totalRev.yesterday != null
    ? `AED ${fmt(totalRev.yesterday)} billed yesterday`
    : practoY != null ? `AED ${fmt(practoY)} billed yesterday (AMC tab not in yet)` : 'billed yesterday not yet';
  const subject = `Clinic Activation · ${dayLabel(today)} · ${leadsPart}, ${billedPart}`;

  return finishEmail(subject, emailHtml({
    kicker: 'CLINIC ACTIVATION · DAILY 9 AM',
    title: 'Clinic Activation: leads, Smile Club, Google profile, revenue and DN Ortho',
    subtitle: `${dayLabel(yesterday.from)} (yesterday) and ${rangeLabel(window.from, window.to)} (month to date)`,
    body,
    landing: { href: page(), label: 'Open the Clinic Activation report' },
    sources: 'Sources: Inhouse Lead Tracker (lead tabs, Smile Club tab, GMB tab copied daily from 29 Oct 2026), Practo bills, Dr Luvi’s Revenue AMC sheet, Google Ads.',
    recipients: opts.recipients ?? ACTIVATION_DAILY_RECIPIENTS,
    preview: opts.preview,
  }));
}
