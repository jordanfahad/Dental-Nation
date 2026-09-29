import 'server-only';
import type { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Daily Meta leads analysis (26 Sep, for Dr Luvi; Mr Akbar and Ms Shadi copied).
 * Built from the data the dashboard already syncs: Meta ad-level insights
 * (lane_e.meta_ad_insights_raw — spend and leads per ad per day) and the
 * In-House Lead Tracker (lane_e.raw_lead_tracker — what the team logged and
 * followed up). Since 26 Sep it is a section of each person's 09:00 morning
 * briefing (lib/smileclub/alerts.ts) rather than an email of its own; the
 * ContentOS leads page is linked for the individual leads.
 *
 * Counts only — never patient names or phone numbers.
 */

type Sb = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

import { CONTENTOS_LEADS } from '@/lib/ops/contentosLeads';
import { classifyPlatform, PLATFORM_DEFS, type PlatformKey } from '@/lib/bookings/platforms';
import { getWidgetEnquiries } from '@/lib/bookings/widgetEnquiries';
export { CONTENTOS_LEADS };

/**
 * Meta's own lead figure (the synced `leads` column) adds several overlapping
 * events together: lead, chat started, messaging contact. One person who starts
 * a WhatsApp chat from an ad is counted up to four times. That sum is reported
 * as the GROSS figure; the actual figure is the number of people (the larger
 * of Meta's lead count and chats started), and new leads are Meta's "new
 * messaging contacts" (first time this person messaged Dental Nation).
 */
type Actions = { action_type: string; value: string }[] | undefined;
const act = (a: Actions, t: string) => (Array.isArray(a) ? a.filter((x) => x.action_type === t).reduce((n, x) => n + (Number(x.value) || 0), 0) : 0);
export function metaPeople(actions: Actions): { actual: number; fresh: number } {
  const chats = act(actions, 'onsite_conversion.messaging_conversation_started_7d');
  const actual = Math.max(act(actions, 'lead'), chats);
  return { actual, fresh: chats > 0 ? Math.min(actual, act(actions, 'onsite_conversion.messaging_first_reply')) : actual };
}

/** Tracker rows that are not patients: job seekers, agencies, suppliers, spam. */
const NOT_PATIENT = /applicant|vacanc|\bjob\b|hiring|career|nursing opportunit|agency|videograph|photograph|social media management|collaborat|blogger|supplier|vendor|partnership|spam|wrong number|blank msg|supermarket|bank statement|not looking for dental/i;
/** Tracker rows marked as someone already a Dental Nation patient. */
const EXISTING = /existing|regular patient|active patient|old patient|'s patient|recall|review appointment|follow[- ]?up visit/i;

const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const label = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`; };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;

/** Tracker dates arrive as 25.9.2026, 19.09.2026 or 19/09/2026. */
function trackerDate(v: unknown): string | null {
  const m = String(v ?? '').trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
const isMetaRow = (r: Record<string, unknown>) => /facebook|instagram|lead ?form/i.test(`${r['Source Type'] ?? ''} ${r['Inquiry Platform'] ?? ''}`);
const followed = (r: Record<string, unknown>) => String(r['1st Follow up'] ?? '').trim() !== '';
const converted = (r: Record<string, unknown>) => {
  const t = `${r['Conversion'] ?? ''} ${r['Lead Stage'] ?? ''}`.toLowerCase();
  return !/not converted/.test(t) && /converted|booked|\byes\b/.test(t);
};

export interface MetaLeadsDigest {
  /** Yesterday, e.g. "Fri 25 Sep". */
  day: string;
  /** "18 actual leads · AED 375 · AED 21 per actual lead (Meta reports 71 gross)". */
  headline: string;
  /** Leads by platform: total enquiries, gross, actual, actual new. */
  platformsHtml: string;
  /** Red flags as HTML, most serious first. */
  flags: string[];
  statsHtml: string;
  campaignsHtml: string;
  sourcesHtml: string;
}

export async function buildMetaLeadsDigest(sb: Sb, today: string): Promise<MetaLeadsDigest | null> {
  const y = addDays(today, -1);
  const d2 = addDays(today, -2);
  const from = addDays(today, -9);
  const [{ data: ads }, { data: rows }] = await Promise.all([
    sb.from('meta_ad_insights_raw').select('date,campaign_name,ad_name,spend,leads,data,fetched_at').gte('date', from).lte('date', y),
    sb.from('raw_lead_tracker').select('data,synced_at'),
  ]);
  // `leads` below is the ACTUAL number of people; `gross` is Meta's summed figure.
  const meta = (ads ?? []).map((a) => {
    const p = metaPeople((a.data as { actions?: Actions } | null)?.actions);
    return { date: a.date as string, campaign: (a.campaign_name as string) ?? '—', ad: (a.ad_name as string) ?? '—', spend: Number(a.spend ?? 0), leads: p.actual, fresh: p.fresh, gross: Number(a.leads ?? 0), fetched: a.fetched_at as string };
  });
  if (!meta.length) return null;

  const dayTot = (iso: string) => meta.filter((m) => m.date === iso).reduce((a, m) => ({ spend: a.spend + m.spend, leads: a.leads + m.leads, gross: a.gross + m.gross }), { spend: 0, leads: 0, gross: 0 });
  const yT = dayTot(y);
  const week = Array.from({ length: 7 }, (_, i) => dayTot(addDays(y, -1 - i)));
  const avgLeads = week.reduce((a, w) => a + w.leads, 0) / 7;
  const wkSpend = week.reduce((a, w) => a + w.spend, 0);
  const wkLeads = week.reduce((a, w) => a + w.leads, 0);
  const cplY = yT.leads ? yT.spend / yT.leads : null;
  const cpl7 = wkLeads ? wkSpend / wkLeads : null;

  const tr = (rows ?? []).map((r) => ({ d: trackerDate((r.data as Record<string, unknown>)?.['Date']), row: r.data as Record<string, unknown> })).filter((x) => x.d);
  const logged = (iso: string) => tr.filter((x) => x.d === iso && isMetaRow(x.row));
  const loggedY = logged(y);
  const loggedD2 = logged(d2);
  const d2Meta = dayTot(d2).leads;
  const last3 = tr.filter((x) => x.d! >= addDays(y, -2) && x.d! <= y && isMetaRow(x.row));
  const noFollow = last3.filter((x) => !followed(x.row)).length;
  const last7 = tr.filter((x) => x.d! >= addDays(y, -6) && x.d! <= y && isMetaRow(x.row));
  const conv7 = last7.filter((x) => converted(x.row)).length;
  const lastSync = (rows ?? []).reduce((a, r) => ((r.synced_at as string) > a ? (r.synced_at as string) : a), '');
  const lastFetch = meta.reduce((a, m) => (m.fetched > a ? m.fetched : a), '');

  // Per ad, last 3 days; per campaign, yesterday vs the 7 days before.
  const byAd = new Map<string, { campaign: string; ad: string; spend: number; leads: number }>();
  for (const m of meta.filter((m) => m.date >= addDays(y, -2))) {
    const k = `${m.campaign}|${m.ad}`;
    const cur = byAd.get(k) ?? { campaign: m.campaign, ad: m.ad, spend: 0, leads: 0 };
    cur.spend += m.spend; cur.leads += m.leads; byAd.set(k, cur);
  }
  const wasted = [...byAd.values()].filter((a) => a.spend >= 50 && a.leads === 0).sort((a, b) => b.spend - a.spend);
  const camps = [...new Set(meta.map((m) => m.campaign))].map((c) => {
    const yc = meta.filter((m) => m.campaign === c && m.date === y);
    const wc = meta.filter((m) => m.campaign === c && m.date < y && m.date >= addDays(y, -7));
    const ys = yc.reduce((a, m) => a + m.spend, 0), yl = yc.reduce((a, m) => a + m.leads, 0);
    const ws = wc.reduce((a, m) => a + m.spend, 0), wl = wc.reduce((a, m) => a + m.leads, 0);
    return { c, ys, yl, ycpl: yl ? ys / yl : null, ws, wl, wcpl: wl ? ws / wl : null };
  }).filter((x) => x.ys > 0 || x.ws > 0).sort((a, b) => b.ys - a.ys);
  const spikes = camps.filter((x) => x.ys >= 30 && x.wcpl && (x.ycpl === null ? x.ys >= 60 : x.ycpl > 2 * x.wcpl));

  // Red flags, most serious first.
  const flags: string[] = [];
  if (d2Meta >= 5 && loggedD2.length < 0.5 * d2Meta) flags.push(`<b>Leads not logged:</b> ${d2Meta} people started a chat from a Meta ad on ${label(d2)} but only ${loggedD2.length} are in the In-House Lead Tracker, so ${d2Meta - loggedD2.length} may not have been contacted.`);
  if (noFollow) flags.push(`<b>No first follow-up:</b> ${noFollow} Meta lead${noFollow === 1 ? '' : 's'} logged in the last 3 days have no first follow-up recorded.`);
  if (wasted.length) flags.push(`<b>Spend with no leads:</b> ${wasted.map((w) => `${esc(w.ad)} (${esc(w.campaign.replace(/^Leads \| WhatsApp \| /, '').replace(/ \| Dubai.*$/, ''))}) — ${aed(w.spend)} over 3 days, 0 leads`).join('; ')}.`);
  if (spikes.length) flags.push(`<b>Cost per lead jumped:</b> ${spikes.map((s) => `${esc(s.c.replace(/^Leads \| WhatsApp \| /, '').replace(/ \| Dubai.*$/, ''))} — ${s.ycpl === null ? `${aed(s.ys)} spent, 0 leads` : `${aed(s.ycpl)} per lead`} yesterday vs ${aed(s.wcpl!)} the week before`).join('; ')}.`);
  if (avgLeads >= 6 && yT.leads < 0.5 * avgLeads) flags.push(`<b>Lead volume dropped:</b> ${yT.leads} actual leads from Meta yesterday vs a daily average of ${Math.round(avgLeads)} over the previous 7 days.`);
  if (last7.length >= 20 && conv7 === 0) flags.push(`<b>No conversions recorded:</b> ${last7.length} Meta leads logged in the last 7 days, none marked converted or booked in the tracker — either nothing converted or the “Conversion” column is not being filled.`);
  if (lastFetch && Date.now() - Date.parse(lastFetch) > 26 * 3600_000) flags.push(`<b>Meta data is stale:</b> last fetched ${esc(lastFetch.slice(0, 16).replace('T', ' '))} UTC.`);
  if (!loggedY.length && !loggedD2.length) flags.push('<b>Tracker not updated:</b> no Meta leads logged for the last two days.');

  const row = (k: string, v: string) => `<tr><td style="padding:4px 8px;color:#767769">${k}</td><td style="padding:4px 8px;font-weight:bold">${v}</td></tr>`;
  const statsHtml = `<table style="border-collapse:collapse;font-size:13px;margin:6px 0 12px">
${row(`Meta actual leads · ${label(y)}`, `${yT.leads} <span style="font-weight:normal;color:#767769">(Meta reports ${yT.gross} gross · 7-day daily average ${Math.round(avgLeads)} actual)</span>`)}
${row('Meta spend', `${aed(yT.spend)} <span style="font-weight:normal;color:#767769">(7 days: ${aed(wkSpend)})</span>`)}
${row('Cost per actual lead', `${cplY === null ? '—' : aed(cplY)} <span style="font-weight:normal;color:#767769">(7-day ${cpl7 === null ? '—' : aed(cpl7)})</span>`)}
${row(`Logged in the tracker · ${label(d2)}`, `${loggedD2.length} (Meta actual leads: ${d2Meta})`)}
${row(`Logged so far · ${label(y)}`, `${loggedY.length} (Meta actual leads: ${yT.leads})`)}
${row('Converted / booked · last 7 days', `${conv7} of ${last7.length} logged`)}
</table>`;
  const campaignsHtml = `<table style="border-collapse:collapse;width:100%;font-size:13px"><tr>${['Campaign · yesterday', 'Spend', 'Actual leads', 'Cost/actual lead', '7-day cost/actual lead'].map((h) => `<th style="text-align:left;background:#F1F1EA;color:#767769;font-size:11px;text-transform:uppercase;padding:6px">${h}</th>`).join('')}</tr>
${camps.map((x) => `<tr>${[esc(x.c.replace(/^Leads \| WhatsApp \| /, '').replace(/ \| Dubai.*$/, '')), aed(x.ys), String(x.yl), x.ycpl === null ? '—' : aed(x.ycpl), x.wcpl === null ? '—' : aed(x.wcpl)].map((c) => `<td style="border-top:1px solid #E6E6DA;padding:6px">${c}</td>`).join('')}</tr>`).join('')}</table>`;
  const sourcesHtml = `<p style="color:#767769;font-size:12px">Sources: Meta ad data (fetched ${esc(lastFetch.slice(0, 16).replace('T', ' '))} UTC) and the In-House Lead Tracker (synced ${esc(lastSync.slice(0, 16).replace('T', ' '))} UTC). Counts only — no patient details. <a href="${CONTENTOS_LEADS}" style="color:#5793A3;font-weight:bold">Open the Meta leads list in ContentOS</a> to see and action individual leads.</p>`;
  const headline = `${yT.leads} actual leads from Meta · ${aed(yT.spend)} · ${cplY === null ? 'no leads' : `${aed(cplY)} per actual lead`} (Meta reports ${yT.gross} gross)`;
  const platformsHtml = await buildPlatformsHtml(sb, y, meta.filter((m) => m.date === y), tr.filter((x) => x.d === y).map((x) => x.row));
  return { day: label(y), headline, platformsHtml, flags, statsHtml, campaignsHtml, sourcesHtml };
}

/**
 * Yesterday's leads by platform for the morning briefing (Mr Akbar asked for
 * actual and actual new leads per platform next to gross leads and total
 * enquiries). Sources: Meta platform breakdown (Facebook / Instagram), Google
 * Ads conversions, the website booking form and the In-House Lead Tracker.
 * Counts only.
 */
async function buildPlatformsHtml(sb: Sb, y: string, _metaY: { leads: number }[], trackerY: Record<string, unknown>[]): Promise<string> {
  type Row = { total: number | null; gross: number | null; actual: number | null; fresh: number | null };
  const rows = new Map<PlatformKey | 'google', Row>();
  const get = (k: PlatformKey | 'google') => { const r = rows.get(k) ?? { total: null, gross: null, actual: null, fresh: null }; rows.set(k, r); return r; };
  const add = (r: Row, f: keyof Row, n: number) => { r[f] = (r[f] ?? 0) + n; };

  const [{ data: plat }, { data: gads }, web] = await Promise.all([
    sb.from('meta_platform_insights_raw').select('platform,leads,data').eq('date', y),
    sb.from('google_ads_insights_raw').select('conversions,spend').eq('date', y),
    getWidgetEnquiries({ from: y, to: y }).catch(() => null),
  ]);

  // In-House Lead Tracker: everything the team logged, by platform.
  for (const r of trackerY) {
    const cs = String(r['Inquiry Platform'] ?? '').trim();
    const md = String(r['Source Type'] ?? '').trim();
    const svc = String(r['Service / Inquiry Type'] ?? '');
    if ((/^(n\/a)?$/i.test(cs)) && /^(n\/a)?$/i.test(svc.trim())) continue; // "no enquiry today" marker rows
    const k = /^webs/i.test(cs) ? 'website' : classifyPlatform(cs, md);
    if (!k) continue;
    const row = get(k);
    add(row, 'total', 1);
    if (k === 'facebook' || k === 'instagram' || k === 'website') continue; // actual figures for these come from Meta and the website form
    const text = `${md} ${svc} ${r['Notes / Remarks'] ?? ''} ${r['Conversion'] ?? ''} ${r['Lead Stage'] ?? ''}`;
    if (NOT_PATIENT.test(text)) continue;
    add(row, 'actual', 1);
    if (!EXISTING.test(text)) add(row, 'fresh', 1);
  }
  // Meta ads, split Facebook / Instagram.
  for (const p of plat ?? []) {
    const k: PlatformKey = p.platform === 'instagram' ? 'instagram' : 'facebook';
    const gross = Number(p.leads ?? 0);
    const ppl = metaPeople((p.data as { actions?: Actions } | null)?.actions);
    if (!gross && !ppl.actual) continue;
    const row = get(k);
    add(row, 'gross', gross); add(row, 'actual', ppl.actual); add(row, 'fresh', ppl.fresh);
  }
  // Google Ads: conversions as Google reports them (it does not say who, so no actual count).
  const gconv = (gads ?? []).reduce((n, g) => n + Number(g.conversions ?? 0), 0);
  if ((gads ?? []).some((g) => Number(g.spend ?? 0) > 0) || gconv) add(get('google'), 'gross', Math.round(gconv));
  // Website booking form: submissions, and unique people.
  if (web && web.total) {
    const row = get('website');
    add(row, 'actual', new Set(web.enquiries.map((e) => (e.phone ?? '').replace(/\D/g, '').slice(-9) || e.key)).size);
    if (row.total === null || row.total < web.total) row.total = web.total;
  }

  const order: (PlatformKey | 'google')[] = ['facebook', 'instagram', 'google', 'website', 'whatsapp', 'telephone', 'walkin', 'zavis', 'telegram', 'tiktok', 'other'];
  const labelOf = (k: PlatformKey | 'google') => (k === 'google' ? 'Google Ads' : k === 'facebook' ? 'Facebook' : k === 'instagram' ? 'Instagram' : PLATFORM_DEFS.find((d) => d.key === k)?.label ?? k);
  const shown = order.filter((k) => rows.has(k));
  if (!shown.length) return '';
  const cell = (n: number | null) => (n === null ? '<span style="color:#9AA6B2">·</span>' : String(n));
  const sum = (f: keyof Row) => shown.reduce((n, k) => n + (rows.get(k)![f] ?? 0), 0);
  const logged = sum('total');
  const th = (h: string) => `<th style="text-align:left;background:#F1F1EA;color:#767769;font-size:11px;text-transform:uppercase;padding:6px">${h}</th>`;
  const td = (c: string, b = false) => `<td style="border-top:1px solid #E6E6DA;padding:6px${b ? ';font-weight:bold' : ''}">${c}</td>`;
  return `<h4 style="margin:14px 0 4px;color:#244260">Leads by platform · ${esc(label(y))}</h4>
<table style="border-collapse:collapse;width:100%;font-size:13px"><tr>${['Platform', 'Actual leads', 'Actual new leads', 'Gross leads', 'Total enquiries'].map(th).join('')}</tr>
${shown.map((k) => { const r = rows.get(k)!; return `<tr>${td(esc(labelOf(k)))}${td(cell(r.actual), true)}${td(cell(r.fresh), true)}${td(cell(r.gross))}${td(cell(r.total))}</tr>`; }).join('\n')}
<tr>${td('<b>All platforms</b>')}${td(String(sum('actual')), true)}${td(String(sum('fresh')), true)}${td(String(sum('gross')))}${td(logged ? String(logged) : cell(null))}</tr></table>
${logged ? '' : `<p style="color:#7a6420;font-size:12px;margin:4px 0">The team has not logged ${esc(label(y))}’s enquiries in the In-House Lead Tracker yet, so total enquiries are not available this morning.</p>`}
<p style="color:#767769;font-size:12px;margin:4px 0 12px"><b>Actual leads:</b> real people who contacted us (Meta: people who started a chat or sent a form; website: people who sent the booking form; other platforms: enquiries about treatment logged by the team, without job seekers, agencies or spam). <b>Actual new leads:</b> of those, people contacting Dental Nation for the first time (Meta: new messaging contacts; logged enquiries: not marked as an existing patient). <b>Gross leads:</b> the number the ad platform reports; Meta adds several events together, so one person can count up to four times. <b>Total enquiries:</b> everything the team logged in the In-House Lead Tracker for the day, for any reason (still being filled in at 09:00). A dot means the source does not give that figure.</p>`;
}

/** The Meta section of a morning briefing: intro, red flags, ContentOS figures, ad figures, campaigns, sources. */
export function metaSectionHtml(m: MetaLeadsDigest | null, intro: string, flags: string[], contentosHtml: string): string {
  return `<p>${intro}</p>
${m?.platformsHtml ?? ''}
${flags.length ? `<ol style="margin:4px 0 12px;padding-left:18px">${flags.map((f) => `<li style="margin-bottom:6px">${f}</li>`).join('')}</ol>` : '<p style="color:#2C5E3F"><b>No red flags.</b></p>'}
${contentosHtml}
${m ? `${m.statsHtml}\n${m.campaignsHtml}\n${m.sourcesHtml}` : `<p style="color:#767769;font-size:12px"><a href="${CONTENTOS_LEADS}" style="color:#5793A3;font-weight:bold">Open the Lead Analysis in ContentOS</a> for the ranked call list.</p>`}`;
}
