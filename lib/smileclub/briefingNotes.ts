import 'server-only';
import { createDecipheriv } from 'node:crypto';
import type { Attachment } from '@/lib/notify/email';
import type { ContentosLeads } from '@/lib/ops/contentosLeads';
import { BRANCH_LABEL, langsFor } from '@/lib/smileclub/scripts';
import { FILMED, REEDIT_FINAL, SHOOT_PLAN, deliveryFor, dentistById, shootLoad } from '@/lib/smileclub/shoots';

/**
 * One-off notes for a given morning's 09:00 briefing (added 5 Oct 2026): a
 * short section at the top of the email for the people named, optionally
 * with a file attached. Notes are dated, so each one goes out once.
 *
 * Attached files sit in this public repo ENCRYPTED (AES-256-GCM: 12-byte IV,
 * 16-byte tag, then the ciphertext). The key is lane_e.app_secrets
 * `briefing_file_key`, never in the repo, so the file is unreadable here.
 */

export interface BriefingFile { name: string; path: string }
export interface BriefingNote {
  day: string;
  to: string[];
  title: string;
  /** Words added to the email subject. */
  subjectBit: string;
  /** `co` is ContentOS Lead Analysis read at send time (null if it could not be read). */
  html: (today: string, co: ContentosLeads | null) => string;
  files?: BriefingFile[];
  /** 'am' (default): the 09:00 briefing. 'shoot': that evening's 17:00 shoot email to MJ with the team copied. */
  slot?: 'am' | 'shoot';
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmtDay = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`; };
const h4 = (t: string) => `<h4 style="font-size:13px;margin:12px 0 4px;color:#244260">${t}</h4>`;
const table = (head: string[], rows: string[][]) => `<table style="border-collapse:collapse;width:100%;font-size:13px;margin:6px 0 10px"><tr>${head.map((h) => `<th style="text-align:left;background:#F1F1EA;color:#767769;font-size:11px;text-transform:uppercase;padding:6px">${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td style="border-top:1px solid #E6E6DA;padding:6px;vertical-align:top">${c}</td>`).join('')}</tr>`).join('')}</table>`;
const short = (name: string) => name.replace(/^Dr\. (M )?/, 'Dr ').split(' ').slice(0, 2).join(' ');

/** Final cuts delivered for every video: full length, 15 s and 6 s. */
const CUTS = 3;

/** Mohan's shoots in the 7 days from `today`: per day the dentists, videos and delivery dates. */
export function weekShoots(today: string) {
  const days = SHOOT_PLAN.filter((d) => d.iso >= today && d.iso <= addDays(today, 6)).map((d) => {
    const slots = d.stops.flatMap((st) => st.slots.map((sl) => ({ d: dentistById(sl.id), only: sl.only, branch: BRANCH_LABEL[st.branch] })));
    const videos = slots.reduce((a, s) => a + shootLoad(s.d, s.only).takes, 0);
    return { iso: d.iso, label: d.label, slots, videos, delivery: deliveryFor(d.iso) };
  });
  const reedits = FILMED.map((f) => ({ d: dentistById(f.id), videos: langsFor(dentistById(f.id)).length }));
  const videos = days.reduce((a, d) => a + d.videos, 0);
  const reeditVideos = reedits.reduce((a, r) => a + r.videos, 0);
  return { days, reedits, videos, reeditVideos, dentists: new Set(days.flatMap((d) => d.slots.map((s) => s.d.id))).size };
}

function shootsHtml(today: string) {
  const w = weekShoots(today);
  const rows = w.days.map((d) => [
    `<b>${esc(d.label)}</b>`,
    esc([...new Set(d.slots.map((s) => s.branch))].join(' → ')),
    esc(d.slots.map((s) => `${short(s.d.name)}${s.only ? ' (2nd video)' : ''}`).join(', ')),
    `<b>${d.videos}</b> <span style="color:#767769">(${d.videos * CUTS} files)</span>`,
    `${esc(d.delivery.firstCutLabel)}<br><b>${esc(d.delivery.finalLabel)}</b>`,
  ]);
  const last = w.days[w.days.length - 1];
  return `<p>Mohan films <b>${w.dentists} dentists on ${w.days.length} days</b> this week. This week’s work gives <b>${w.videos + w.reeditVideos} videos</b>: ${w.reeditVideos} Smile Club videos already filmed, re-edited on the approved template (${esc(w.reedits.map((r) => short(r.d.name)).join(', '))}) by <b>${esc(fmtDay(REEDIT_FINAL))}</b>, and ${w.videos} new from this week’s shoots, finals between <b>${esc(w.days[0]?.delivery.finalLabel ?? '')} and ${esc(last?.delivery.finalLabel ?? '')}</b> (table). Each video comes as a full-length, 15 s and 6 s cut, so <b>${(w.videos + w.reeditVideos) * CUTS} ad-ready files</b>. A video here is one language version: a dentist filming in English and Arabic counts twice.</p>
${table(['Day', 'Clinic', 'Dentists', 'Videos', 'First cut / final'], rows)}
<p style="color:#767769;font-size:12px">Video counts include the Dr Tosun and AMC announcement videos, filmed only once their facts are approved. A dentist whose scripts are not approved by their slot moves to the backup day.</p>`;
}

function metaReportHtml() {
  return `<p>Zavis’s report on our Meta WhatsApp ads, <b>attached</b> (16 Sep to 3 Oct). The points that matter:</p>
<ul style="margin:4px 0 10px;padding-left:18px">
<li><b>270 chats started</b> from six treatment ad sets at <b>AED 265 a day</b>; AED 3,239 spent since 20 Sep, about <b>AED 18 a chat</b>. These are gross chats, not net leads.</li>
<li><b>57% asked about tooth gaps or protruding front teeth</b>, which means aligners or braces. One such patient (about AED 18,500) pays for all ad spend to date nearly three times over.</li>
<li><b>Cost is not the problem: only 3% stalled on budget.</b> 83% went quiet after the clinic’s first reply or call, and more leads were waiting for a price (4%) than stalled on cost.</li>
<li><b>No paying patient from these ads is logged in the CRM yet</b>, so the return cannot be confirmed. Recording each lead’s outcome (booked, not booked, not a fit) is what turns this into a profit figure.</li>
</ul>
<p><b>Actions:</b> reply to every ad lead within 15 minutes and log the outcome (Dr Luvi, front desk); decide whether the WhatsApp assistant may quote approved prices (Mr Akbar, Dr Luvi). Targeting stays as it is: iPhone 16 and 17, the premium neighbourhoods around the branches, English and Arabic, existing patients excluded.</p>`;
}

function launchHtml(today: string) {
  const w = weekShoots(today);
  const mon = w.days[0];
  const later = w.days.slice(1, 3);
  return `<p>All three start from approved material only, in this order:</p>
<ol style="margin:4px 0 10px;padding-left:18px">
<li style="margin-bottom:6px"><b>Google search, first (Fahad).</b> It needs no video. The three Smile Club search campaigns (brand, price searches, “dentist without insurance”), AED 2,000 a month, each with its own tracking. Today’s Day-14 review decides the held-back AED 3,500 (Google +1,500, Meta +2,000); it is released only if a paid online member costs AED 600 or less.</li>
<li style="margin-bottom:6px"><b>Meta Smile Club video ads (Fahad, with Zavis).</b> Start with the ${w.reeditVideos} re-edited Smile Club videos once Ms Shadi, Dr Luvi and Gautam approve them as a batch (finals ${esc(fmtDay(REEDIT_FINAL))}), on AED 1,500 to start, sending people to chat on WhatsApp. Each shoot day’s videos are added as their finals land${mon ? `: ${esc(mon.label)}’s shoot on ${esc(mon.delivery.finalLabel)}` : ''}${later.map((d) => `, ${esc(d.label)}’s on ${esc(d.delivery.finalLabel)}`).join('')}. The six treatment ad sets in the report keep running alongside.</li>
<li style="margin-bottom:6px"><b>WhatsApp to our patients (CRM-DN on Zavis; Gautam owns go-live).</b> Not a mass broadcast: the old mass test produced no members. Each dentist’s own message, with their approved video, goes only to their consent-checked patients, at most 20 a day per dentist. Opt-outs stop further messages, and replies go to the dentist’s branch. It starts with the dentists whose Smile Club videos are re-edited this week, the day after they are approved. Dr Tosun’s and the AMC dentists’ patients hear the announcement first. Automatic follow-ups on day 1 and day 3, to people who enquired but did not book, start once WhatsApp approves the message templates.</li>
</ol>
<p style="color:#767769;font-size:12px">Every launch is measured on the dashboard by net leads, bookings and Smile Club sign-ups per channel, not by chats or clicks.</p>`;
}

/**
 * Which phones the leads come from (GA4 by device, lane_e.ga4_device_daily,
 * read 5 Oct for 16 Sep to 4 Oct; Meta figures from the Zavis report).
 */
function devicesHtml() {
  return `<ul style="margin:4px 0 10px;padding-left:18px">
<li style="margin-bottom:4px"><b>Meta ad leads are iPhone users, as targeted.</b> In Meta’s own delivery report, 82 of 83 chats in the last 7 days came from iPhones, and all the spend went to iPhones. These ads open WhatsApp directly, so the leads never visit the website; Google Analytics cannot see them, and Meta’s report is the evidence.</li>
<li style="margin-bottom:4px"><b>Website leads are mostly Android, from Google Ads.</b> Of 182 lead actions on the website (booking starts, phone and WhatsApp taps), 127 came from Android phones (70%), 34 from iPhones (19%) and 21 from computers. 107 of the Android leads came from Google’s Performance Max and Display ads; iPhone website leads come mainly from Google search (19 of 34).</li>
<li style="margin-bottom:4px"><b>“(not set)” is not Apple.</b> Of the 997 website sessions with no source, 957 (96%) were Windows computers, 13 were iPhones and none became a lead. With the 10,019 “direct” Windows sessions that also produced no leads, about 6 in 10 website sessions in this period are very likely automated traffic, not people.</li>
</ul>
<p><b>So:</b> Meta reaches iPhone users on WhatsApp; Google reaches mostly Android users on the website. Booked patients from Google’s Android leads need checking, as one-tap phone and WhatsApp clicks from Display ads are often accidental.</p>`;
}

/**
 * Lead follow-up (5 Oct, from Fahad): where leads are lost and what is being
 * done. Framed as a hand-over gap between the WhatsApp assistant and the team,
 * with the evidence; the reply time is read live from ContentOS, never assumed.
 */
function followUpHtml(co: ContentosLeads | null) {
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const fmtWait = (h: number) => (h < 1 ? `${Math.round(h * 60)} minutes` : `${h.toFixed(1).replace(/\.0$/, '')} hours`);
  const measured = co && co.replyHours !== null
    ? `ContentOS measures the first message from a person at <b>${fmtWait(co.replyHours)} on average</b> after the lead writes in${co.asOf ? ` (${esc(co.asOf)})` : ''}.`
    : 'The exact time to the first message from a person is being confirmed with Zavis; ContentOS could not be read for this email.';
  const quiet = co && co.leads >= 10 ? ` In ContentOS today, ${co.quiet} of ${co.leads} Meta leads (${pct(co.quiet, co.leads)}%) went quiet after first contact.` : '';
  return `<p>The ads bring the right people; the leads that do not book are mostly lost in the gap between the WhatsApp assistant’s instant first reply and the first message from one of us. That is a hand-over gap in the process, not a question of effort: nothing currently tells the team a lead is waiting.</p>
<ul style="margin:4px 0 10px;padding-left:18px">
<li style="margin-bottom:4px"><b>Where leads stop:</b> in the Zavis report, 83% of leads went quiet after the clinic’s first reply or call, while only 3% stopped over budget and 4% were waiting for a price.${quiet}</li>
<li style="margin-bottom:4px"><b>Reply time:</b> ${measured} Published studies of online leads (Harvard Business Review, 2011) found leads contacted within an hour were about seven times more likely to turn into a real conversation than those contacted later.</li>
</ul>
<p><b>What happens next:</b></p>
<ol style="margin:4px 0 10px;padding-left:18px">
<li style="margin-bottom:4px"><b>An email alert when a lead is waiting</b> (Dr Luvi’s request). Fahad is checking with Zavis whether the CRM can send one. Until it is live, the team checks the Zavis CRM through the day, at least every 30 minutes in clinic hours and first thing each morning for overnight chats.</li>
<li style="margin-bottom:4px"><b>Free consultations:</b> Dr Luvi to confirm how many free consultations have been offered to these leads, and how many were booked.</li>
<li style="margin-bottom:4px"><b>Calls:</b> Fahad and Zavis will listen to a sample of call recordings to see whether the pitch needs changing. Fahad has asked Zavis (Syed) for call and sales pitch examples from similar aesthetic clinics to compare against.</li>
</ol>`;
}

export const BRIEFING_NOTES: BriefingNote[] = [
  {
    day: '2026-10-05',
    to: ['akbar', 'luvi', 'gautam', 'fahad'],
    title: 'This week: Meta lead report, Mohan’s shoots and how the launches start',
    subjectBit: 'Meta lead report attached · shoots and launch plan',
    html: (today) => `${h4('1. Meta lead profile report (attached)')}${metaReportHtml()}${h4('2. Mohan’s shoots this week and the videos he will deliver')}${shootsHtml(today)}${h4('3. How the WhatsApp, Meta and Google campaigns start')}${launchHtml(today)}`,
    files: [{ name: 'Dental Nation - Meta Lead Profile Report - Oct 2026.pdf', path: 'assets/briefing/meta-lead-profile-oct-2026.pdf.enc' }],
  },
  {
    day: '2026-10-05',
    slot: 'shoot',
    to: [],
    title: 'Leads note: which phones our leads come from',
    subjectBit: '',
    html: () => `<p style="color:#767769">Checked in Google Analytics for 16 Sep to 4 Oct.</p>${devicesHtml()}`,
  },
  {
    day: '2026-10-05',
    slot: 'shoot',
    to: [],
    title: 'Lead follow-up: where leads are lost and what we are doing',
    subjectBit: '',
    html: (_t, co) => followUpHtml(co),
  },
  {
    day: '2026-10-06',
    to: ['akbar', 'luvi', 'gautam', 'shadi', 'fahad'],
    title: 'Which phones our leads come from (Google Analytics, 16 Sep to 4 Oct)',
    subjectBit: 'leads by phone: Meta iPhone, Google Android',
    html: () => devicesHtml(),
  },
  {
    day: '2026-10-06',
    to: ['akbar', 'luvi', 'gautam', 'shadi', 'fahad'],
    title: 'Lead follow-up: where leads are lost and what we are doing',
    subjectBit: 'lead follow-up',
    html: (_t, co) => followUpHtml(co),
  },
];

export const notesFor = (today: string, who: string) => BRIEFING_NOTES.filter((n) => n.day === today && (n.slot ?? 'am') === 'am' && n.to.includes(who));
/** Notes for the 17:00 shoot email sent on `today` (everyone on it sees them). */
export const shootNotesFor = (today: string) => BRIEFING_NOTES.filter((n) => n.day === today && n.slot === 'shoot');

const RAW = 'https://raw.githubusercontent.com/jordanfahad/Dental-Nation/main/';
const cache = new Map<string, Attachment>();

/** Fetch and decrypt a note's file. Throws if it cannot be read, so the caller can retry on the next run. */
export async function loadBriefingFile(f: BriefingFile, key: string | null): Promise<Attachment> {
  const hit = cache.get(f.path);
  if (hit) return hit;
  if (!key || !/^[0-9a-f]{64}$/i.test(key)) throw new Error('briefing_file_key missing');
  const res = await fetch(RAW + f.path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`file fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const d = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  const pdf = Buffer.concat([d.update(buf.subarray(28)), d.final()]);
  const a: Attachment = { name: f.name, contentType: 'application/pdf', base64: pdf.toString('base64') };
  cache.set(f.path, a);
  return a;
}

