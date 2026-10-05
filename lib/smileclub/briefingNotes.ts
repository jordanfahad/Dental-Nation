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

/**
 * Fahad's answers to Dr Luvi's two emails (4 and 5 Oct) on September's Meta
 * WhatsApp leads, in the 5 Oct 17:00 leadership email. Figures: Meta and
 * Google ad accounts (lane_e, 1–30 Sep), the Zavis lead profile report, GA4,
 * and Dr Luvi's own extract. Counts only: no lead names or numbers in email.
 */
function luviAnswersHtml(co: ContentosLeads | null) {
  const td = 'style="text-align:right"';
  const meta: [string, number, number, number][] = [
    ['Tooth Gap', 2024, 117, 50],
    ['New Angles', 1244, 87, 45],
    ['DN Ortho', 1106, 10, 4],
    ['Coffee Stains', 743, 22, 10],
    ['Smoking Stains', 657, 25, 13],
    ['Dr Hasna post (boosted)', 180, 7, 3],
  ];
  const g: [string, number, string, string][] = [
    ['Performance Max (“Dental Nation Campaign, 13 Mar”)', 2257, '5,552 clicks', '8'],
    ['Search: Calls & Bookings', 986, '81 clicks', '0 (calls not tracked)'],
    ['Search: Ortho, braces & aligners', 834, '24 clicks', '0'],
    ['Search: SOS Emergency', 833, '26 clicks', '0'],
    ['Search: Wide Net', 299, '40 clicks', '2'],
    ['Display remarketing: Stains & Gaps', 97, '268 clicks', '18 (taps)'],
    ['Other small campaigns', 88, '21 clicks', '0'],
  ];
  const aed = (n: number) => `AED ${n.toLocaleString('en-US')}`;
  const metaRows = meta.map(([c, sp, ch, net]) => [esc(c), aed(sp), String(ch), String(net), aed(Math.round(sp / net)), '—', '—']);
  const metaTot = meta.reduce((a, r) => [a[0] + r[1], a[1] + r[2], a[2] + r[3]], [0, 0, 0]);
  const reply = co && co.replyHours !== null ? `${co.replyHours < 1 ? `${Math.round(co.replyHours * 60)} minutes` : `${co.replyHours} hours`} on average (ContentOS${co.asOf ? `, ${esc(co.asOf)}` : ''})` : 'not yet measured per lead; being pulled from Zavis for the 11:30 meeting';
  const tbl = (head: string[], rows: string[][]) => `<table style="border-collapse:collapse;width:100%;font-size:12.5px;margin:6px 0 10px"><tr>${head.map((h, i) => `<th style="text-align:${i ? 'right' : 'left'};background:#F1F1EA;color:#767769;font-size:10.5px;text-transform:uppercase;padding:5px">${h}</th>`).join('')}</tr>${rows.map((r, ri) => `<tr${ri === rows.length - 1 && r[0].startsWith('<b>') ? ' style="background:#FAFAF5"' : ''}>${r.map((c, i) => `<td ${i ? td : ''} style="border-top:1px solid #E6E6DA;padding:5px;vertical-align:top;${i ? 'text-align:right' : ''}">${c}</td>`).join('')}</tr>`).join('')}</table>`;
  const q = (n: number, t: string) => `<h4 style="font-size:13.5px;margin:16px 0 4px;color:#244260">${n}. ${t}</h4>`;
  // Modelled bookings use the dashboard's phone-path benchmark (config/growth-channels.ts PHONE_PATH_BENCHMARKS):
  // phone tap × 0.75 real × 0.75 answered × 0.8 patient × 0.35 book; a WhatsApp tap skips the answer step.
  const PH = 0.75 * 0.75 * 0.8 * 0.35, WA = 0.75 * 0.8 * 0.35;
  const est = (wa: number, ph: number) => wa * WA + ph * PH;
  const lanes: [string, string, string, string, number, string][] = [
    ['<b>Google Ads</b> (Search, Performance Max, Display)', aed(5394), '185,855 impressions · 6,012 clicks', '78 WhatsApp taps and 41 phone taps on the website', est(78, 41), 'Phone and WhatsApp → desk booking'],
    ['<b>Google Business Profile</b> (Maps and the Google listing, supported by Ads and reviews)', 'AED 0', 'shown on Google Maps and Search', '64 calls, 364 direction requests, 71 website visits', est(0, 64), 'Calls → desk booking; directions → walk-ins'],
    ['<b>Google search and the website</b> (organic)', 'AED 0', '—', '71 WhatsApp taps and 13 phone taps', est(71, 13), 'WhatsApp and phone → desk; 3 booked themselves online'],
    ['<b>Meta WhatsApp ads</b>', aed(metaTot[0]), `${metaTot[1]} chats started`, `${metaTot[2]} replied a second time`, 1, 'WhatsApp → desk; targeting reset for October (question 3)'],
  ];
  const estTot = lanes.reduce((a, l) => a + l[4], 0);
  const gRows: [string, number, string, string, number][] = [
    ['Performance Max (“Dental Nation Campaign, 13 Mar”)', 2257, '5,552', '58 WhatsApp · 31 phone', est(58, 31)],
    ['Search (Calls & Bookings, Ortho, SOS, Wide Net, Brand, small)', 3040, '192', '5 WhatsApp · 2 phone · plus direct calls from the ads', est(5, 2)],
    ['Display remarketing: Stains & Gaps', 97, '268', '15 WhatsApp · 8 phone', est(15, 8)],
  ];
  return `<p>Dr Luvi, thank you for calling the leads yourself; it gives us evidence we did not have. You are right that a WhatsApp message is not a qualified lead, and right to ask for outcomes rather than volume. Below, every figure is marked as measured (from the platforms, GA4, Practo and the lead tracker) or modelled (an estimate, until the desk records the source of each new patient), so we can reconcile line by line.</p>
<p style="color:#767769;font-size:12px">Your extract’s 268 unique contacts match exactly the 268 people Meta reports as starting a WhatsApp chat in September, so we are reconciling the same leads.</p>

${q(1, 'What did September’s advertising spend deliver?')}
<p><b>The headline:</b> September was the strongest month for new patients in our Practo records: <b>188 first visits</b>, up from 148 in August and 104 in July (measured, all sources). Google and the website produced most of the measurable patient actions; the Meta WhatsApp campaign was our test month, and its fixes start this week (questions 3 and 4).</p>
${tbl(['Lane', 'Spend', 'Reach', 'Patient actions (measured)', 'Bookings (modelled)', 'Route into Practo'], [
    ...lanes.map((l) => [l[0], l[1], l[2], l[3], l[4] === 1 && l[0].includes('Meta') ? '1 (tracker)' : `≈ ${Math.round(l[4])}`, l[5]]),
    ['<b>Total</b>', `<b>${aed(5394 + metaTot[0])}</b>`, '', '', `<b>≈ ${Math.round(estTot)}</b>`, '<b>188 new patients in Practo, +81% on July; 185 booked through the desk by phone or WhatsApp</b>'],
  ])}
<p><b>Google Ads by campaign type</b> (taps measured in GA4; bookings modelled):</p>
${tbl(['Campaign', 'Spend', 'Clicks', 'Website taps', 'Bookings (modelled)', 'Cost per booking'], gRows.map(([c, sp, cl, taps, b]) => [esc(c), aed(sp), cl, taps, `≈ ${Math.max(1, Math.round(b))}`, b >= 2 ? aed(Math.round(sp / b)) : 'drives calls (counted from 8 Oct)']))}
<p style="color:#767769;font-size:12px">Modelled bookings use the dashboard’s standard phone path: 75% of taps are real attempts, 75% are answered, 80% are patients and 35% of those book (a WhatsApp tap skips the answer step). Google Ads overall: about ${aed(Math.round(5394 / est(78, 41)))} per modelled booking.</p>
<p><b>Meta WhatsApp ads by campaign</b> (measured):</p>
${tbl(['Campaign', 'Spend', 'Chats started', 'Replied again (net)', 'Cost per net lead'], [...metaRows.map((r) => r.slice(0, 5)), [`<b>Total</b>`, `<b>${aed(metaTot[0])}</b>`, `<b>${metaTot[1]}</b>`, `<b>${metaTot[2]}</b>`, `<b>${aed(Math.round(metaTot[0] / metaTot[2]))}</b>`]])}
<p>Meta’s September campaign was the test month for WhatsApp ads: 268 conversations and one booking in the tracker. It showed us the targeting and follow-up changes in questions 3 and 6, which start this week.</p>
<p><b>Next step, from modelled to verified:</b> 185 of September’s 188 new patients were booked by the desk from a call or WhatsApp, which is exactly the route Google Ads and the Business Profile drive, but Practo has no field yet for where the patient found us. From Wed 7 Oct the desk records the source of every new patient and qualifies each lead on your four criteria, so October’s report shows each lane’s patients by name in Practo rather than modelled.</p>

<p><b>Visibility and discoverability, August to September</b> (measured):</p>
<ul style="margin:4px 0 8px;padding-left:18px">
<li>Google Business Profile: calls <b>51 → 64</b> (+25%), direction requests <b>308 → 364</b> (+18%), website visits <b>39 → 71</b> (+82%).</li>
<li>Google Ads put Dental Nation in front of Dubai searchers <b>185,855 times</b> in September.</li>
<li>Searches for “Dental Nation” on Google Maps: <b>143</b> in May, <b>214</b> in July, <b>185</b> in August (Google publishes September mid-month).</li>
<li>Website: <b>169 WhatsApp taps</b> and <b>60 phone taps</b> in September from all sources.</li>
</ul>

${q(2, 'How was lead quality assessed during the month?')}
<p><b>Criteria used:</b> Zavis labels every chat automatically on five fixed questions: intent, readiness, stage, main blocker and next step. “High intent” (102 of 270 chats, 16 Sep to 3 Oct) means interest shown in the chat. It does not check need, access to the branch, understanding of fees or willingness to book. Those are your four criteria, and from tomorrow they are the only definition of “qualified” we report.</p>
<p><b>Concerns and changes:</b></p>
<ul style="margin:4px 0 8px;padding-left:18px">
<li><b>From 23 Sep:</b> all ad sets limited to iPhone 16 and 17, alongside the existing settings (the premium area map, English and Arabic speakers, existing patients excluded, ads paused 23:00 to 04:00). Result: 82 of 83 chats in the 7 days to 2 Oct came from iPhones, at about AED 26 a chat.</li>
<li><b>3 Oct:</b> removed Al Quoz and Nad Al Sheba (mostly non-residential); reverted a one-day test that allowed any iPhone.</li>
<li><b>Observed:</b> your 23 calls on 4 Oct show these filters are not enough. Device and area alone still reach people who work in the targeted districts but cannot or will not visit.</li>
</ul>

${q(3, 'Why are we attracting enquiries that cannot progress?')}
<ul style="margin:4px 0 8px;padding-left:18px">
<li><b>Geography:</b> Meta counts anyone who lives in <i>or is regularly in</i> a mapped area, and no longer offers residents only. Our map includes Business Bay, Downtown, the DIFC edge, Dubai Marina and Meydan: districts with large construction sites and daily workforces. That is the most likely route for the contacts you spoke to, and we will remove those areas.</li>
<li><b>Language:</b> Meta’s language setting reads the phone’s language, and English is the default on most phones, so it does not screen for the language a lead speaks. 21 contacts (7.8%) had a documented barrier.</li>
<li><b>International numbers (45):</b> the records do not show whether they live in Dubai; nobody is asked. From tomorrow the assistant’s first question is which area they live in.</li>
<li><b>Treatment intent:</b> 57% asked about gaps or protruding teeth (aligners or braces): a real, high-value need.</li>
<li><b>Pricing:</b> 3.4% stated a budget objection in your extract, and more leads were waiting for a price from the clinic than stopped over cost, so cost is discovered late. Ads will show “from” prices so people with a different budget self-select out.</li>
<li><b>Free consultation requests:</b> please confirm how many free consultations have been offered to these leads; we will check every ad and assistant message for any mention of a free consultation.</li>
</ul>
<p style="color:#767769;font-size:12px">Targeting is by area, device and message only; never by nationality or occupation.</p>

${q(4, 'Which campaigns should continue, change or stop?')}
${tbl(['Campaign', 'Decision', 'Reason (spend and outcome)'], [
    ['Meta: Tooth Gap', '<b>Change</b>', 'Highest-value need (aligners) and AED 40 per net lead. Tighten the area map, add prices and the area question.'],
    ['Meta: New Angles', '<b>Change</b>', 'AED 28 per net lead, the lowest; same changes as Tooth Gap.'],
    ['Meta: DN Ortho', '<b>Stop</b>', 'AED 1,106 for 4 net leads (AED 277 each); Tooth Gap reaches the same need far cheaper.'],
    ['Meta: Coffee Stains, Smoking Stains', '<b>Pause</b>', 'Low first-visit value (about AED 799): about 1 in 20 chats must become a patient to pay back, and none is recorded. Restart once follow-up is fixed.'],
    ['Google: Performance Max', '<b>Continue, refine</b>', 'Our strongest paid lane: 58 WhatsApp and 31 phone taps on the website for AED 2,257, about 17 modelled bookings (AED 132 each). Most taps come from Android phones, so exclude low-quality app placements and keep it.'],
    ['Google: Search (Calls & Bookings, Ortho, SOS)', '<b>Continue, fix tracking</b>', 'People searching for a dentist are the right audience and feed the Business Profile calls, but calls from ads are not counted. Call tracking first; judge after two weeks.'],
    ['Google: Display remarketing', '<b>Continue</b>', 'AED 97; shown only to people who already visited the site.'],
  ])}

${q(5, 'Where is operations specifically losing qualified patients?')}
<p>I would rather show you the records than make a general statement. Per-lead response times are not in a report yet, so this is what we have now and what we will bring:</p>
<ul style="margin:4px 0 8px;padding-left:18px">
<li><b>What the data shows:</b> in the Zavis report, 83% of leads went quiet after the clinic’s first reply or call, while 3% stopped over budget and 4% were waiting for a price. The assistant replies instantly; the first message from a person comes ${reply}. Nothing currently alerts the desk that a lead is waiting, so this is a process gap, not a question of effort.</li>
<li><b>The specific records:</b> for the 157 contacts in your extract marked unanswered or awaiting response, Fahad and Zavis will list each one with the time of the first human reply, the last action and who was waiting on whom. That separates leads we did not reach from leads who did not reply. We will bring it to the 11:30 meeting on Wed 7 Oct. Lead names and numbers stay in the CRM, not in email.</li>
<li><b>Calls:</b> Fahad and Zavis will review a sample of call recordings to see whether the pitch needs changing, and Fahad has asked Zavis (Syed) for call and sales pitch examples from similar aesthetic clinics.</li>
</ul>

${q(6, 'What will change in October?')}
${tbl(['Action', 'Owner', 'By', 'Target'], [
    ['Remove business and construction districts from the Meta map; add “from” prices to the ads; first assistant question asks the area', 'Fahad with Zavis', 'Tue 6 Oct', '80% of new chats from the target areas'],
    ['Stop DN Ortho; pause the stains campaigns; refine Performance Max placements', 'Fahad', 'Tue 6 Oct', 'Spend only on campaigns that can be measured'],
    ['Desk asks and records how every new patient found us (Google, Maps, website, Instagram, referral, walk-in)', 'Dr Luvi’s team, with Fahad', 'Wed 7 Oct', 'Source recorded for every new patient'],
    ['Qualified = your four criteria, recorded per lead in the CRM; daily report of enquiries → qualified → booked → attended → treatment accepted', 'Fahad and Zavis (set-up), front desk (record)', 'Wed 7 Oct', 'Outcome logged for every lead within 48 hours'],
    ['Email alert when a lead is waiting; until then the desk checks the CRM every 30 minutes in clinic hours and first thing each morning', 'Fahad with Zavis; Dr Luvi’s team', 'Alert to confirm by Thu 8 Oct; checks from now', 'First reply from a person within 15 minutes for 90% of leads in clinic hours'],
    ['Google call tracking, so calls count as results', 'Fahad', 'Thu 8 Oct', 'Every call from an ad counted'],
    ['Free consultations offered to these leads: count', 'Dr Luvi', 'Tue 6 Oct', 'Number confirmed'],
    ['Call recordings reviewed; pitch examples from similar clinics', 'Fahad with Zavis (Syed)', 'Fri 9 Oct', 'Changes to the call script agreed'],
  ])}
<p><b>Review:</b> daily at the 11:30 meeting from tomorrow. The first results of the changes (one week of data) on <b>Mon 12 Oct</b>; the decision on budget and campaigns on <b>Mon 19 Oct</b>, judged on qualified leads, attendance and cost per attended patient.</p>
<p>Marketing will own acquisition quality, targeting and spend; I welcome operations verifying lead handling and clinic outcomes, so we both work from the same numbers.</p>
<p>Fahad</p>`;
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
    title: 'Answers to Dr Luvi’s questions on September’s leads',
    subjectBit: 'Answers to Dr Luvi’s questions on September leads',
    html: (_t, co) => luviAnswersHtml(co),
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

