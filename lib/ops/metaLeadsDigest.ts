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
 * Meta's synced `leads` column adds several overlapping events together (lead,
 * chat started, messaging contact), so one person who starts a WhatsApp chat
 * from an ad is counted up to four times. That figure is never reported. Per
 * row we count PEOPLE instead:
 *  - gross: people who contacted us (the largest of Meta's lead count, chats
 *    started and messaging contacts, which all describe the same people);
 *  - net: people who had a real conversation, i.e. sent at least a second
 *    message after the ad's automatic first one (lead forms count as net);
 *  - fresh: people messaging Dental Nation for the first time (Meta's "new
 *    messaging contacts").
 */
type Actions = { action_type: string; value: string }[] | undefined;
const act = (a: Actions, t: string) => (Array.isArray(a) ? a.filter((x) => x.action_type === t).reduce((n, x) => n + (Number(x.value) || 0), 0) : 0);
export function metaPeople(actions: Actions): { gross: number; net: number; fresh: number } {
  const chats = act(actions, 'onsite_conversion.messaging_conversation_started_7d');
  const gross = Math.max(act(actions, 'lead'), chats, act(actions, 'onsite_conversion.total_messaging_connection'));
  if (!chats) return { gross, net: gross, fresh: gross };
  return {
    gross,
    net: Math.min(gross, act(actions, 'onsite_conversion.messaging_user_depth_2_message_send')),
    fresh: Math.min(gross, act(actions, 'onsite_conversion.messaging_first_reply')),
  };
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
  /** "19 leads from Meta (8 net) · AED 375 · AED 20 per lead, AED 47 per net lead". */
  headline: string;
  /** Leads by platform: gross, net, new, total enquiries logged. */
  platformsHtml: string;
  /** Practo revenue for the day by channel, and month to date. */
  revenueHtml: string;
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
  // `leads` = people who contacted us (gross, counted once each); `net` = people who had a real conversation.
  const meta = (ads ?? []).map((a) => {
    const p = metaPeople((a.data as { actions?: Actions } | null)?.actions);
    return { date: a.date as string, campaign: (a.campaign_name as string) ?? '—', ad: (a.ad_name as string) ?? '—', spend: Number(a.spend ?? 0), leads: p.gross, net: p.net, fresh: p.fresh, fetched: a.fetched_at as string };
  });
  if (!meta.length) return null;

  const dayTot = (iso: string) => meta.filter((m) => m.date === iso).reduce((a, m) => ({ spend: a.spend + m.spend, leads: a.leads + m.leads, net: a.net + m.net }), { spend: 0, leads: 0, net: 0 });
  const yT = dayTot(y);
  const week = Array.from({ length: 7 }, (_, i) => dayTot(addDays(y, -1 - i)));
  const avgLeads = week.reduce((a, w) => a + w.leads, 0) / 7;
  const wkSpend = week.reduce((a, w) => a + w.spend, 0);
  const wkLeads = week.reduce((a, w) => a + w.leads, 0);
  const cplY = yT.leads ? yT.spend / yT.leads : null;
  const cpnY = yT.net ? yT.spend / yT.net : null;
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
    const ys = yc.reduce((a, m) => a + m.spend, 0), yl = yc.reduce((a, m) => a + m.leads, 0), yn = yc.reduce((a, m) => a + m.net, 0);
    const ws = wc.reduce((a, m) => a + m.spend, 0), wl = wc.reduce((a, m) => a + m.leads, 0);
    return { c, ys, yl, yn, ycpl: yl ? ys / yl : null, ycpn: yn ? ys / yn : null, ws, wl, wcpl: wl ? ws / wl : null };
  }).filter((x) => x.ys > 0 || x.ws > 0).sort((a, b) => b.ys - a.ys);
  const spikes = camps.filter((x) => x.ys >= 30 && x.wcpl && (x.ycpl === null ? x.ys >= 60 : x.ycpl > 2 * x.wcpl));

  // Red flags, most serious first.
  const flags: string[] = [];
  if (d2Meta >= 5 && loggedD2.length < 0.5 * d2Meta) flags.push(`<b>Leads not logged:</b> ${d2Meta} people started a chat from a Meta ad on ${label(d2)} but only ${loggedD2.length} are in the In-House Lead Tracker, so ${d2Meta - loggedD2.length} may not have been contacted.`);
  if (noFollow) flags.push(`<b>No first follow-up:</b> ${noFollow} Meta lead${noFollow === 1 ? '' : 's'} logged in the last 3 days have no first follow-up recorded.`);
  if (wasted.length) flags.push(`<b>Spend with no leads:</b> ${wasted.map((w) => `${esc(w.ad)} (${esc(w.campaign.replace(/^Leads \| WhatsApp \| /, '').replace(/ \| Dubai.*$/, ''))}) — ${aed(w.spend)} over 3 days, 0 leads`).join('; ')}.`);
  if (spikes.length) flags.push(`<b>Cost per lead jumped:</b> ${spikes.map((s) => `${esc(s.c.replace(/^Leads \| WhatsApp \| /, '').replace(/ \| Dubai.*$/, ''))} — ${s.ycpl === null ? `${aed(s.ys)} spent, 0 leads` : `${aed(s.ycpl)} per lead`} yesterday vs ${aed(s.wcpl!)} the week before`).join('; ')}.`);
  if (avgLeads >= 6 && yT.leads < 0.5 * avgLeads) flags.push(`<b>Lead volume dropped:</b> ${yT.leads} leads from Meta yesterday vs a daily average of ${Math.round(avgLeads)} over the previous 7 days.`);
  if (last7.length >= 20 && conv7 === 0) flags.push(`<b>No conversions recorded:</b> ${last7.length} Meta leads logged in the last 7 days, none marked converted or booked in the tracker — either nothing converted or the “Conversion” column is not being filled.`);
  if (lastFetch && Date.now() - Date.parse(lastFetch) > 26 * 3600_000) flags.push(`<b>Meta data is stale:</b> last fetched ${esc(lastFetch.slice(0, 16).replace('T', ' '))} UTC.`);
  if (!loggedY.length && !loggedD2.length) flags.push('<b>Tracker not updated:</b> no Meta leads logged for the last two days.');

  const row = (k: string, v: string) => `<tr><td style="padding:4px 8px;color:#767769">${k}</td><td style="padding:4px 8px;font-weight:bold">${v}</td></tr>`;
  const statsHtml = `<table style="border-collapse:collapse;font-size:13px;margin:6px 0 12px">
${row(`Meta leads · ${label(y)}`, `${yT.leads} gross · ${yT.net} net <span style="font-weight:normal;color:#767769">(7-day daily average ${Math.round(avgLeads)} gross)</span>`)}
${row('Meta spend', `${aed(yT.spend)} <span style="font-weight:normal;color:#767769">(7 days: ${aed(wkSpend)})</span>`)}
${row('Cost per lead', `${cplY === null ? '—' : aed(cplY)} gross · ${cpnY === null ? '—' : aed(cpnY)} net <span style="font-weight:normal;color:#767769">(7-day ${cpl7 === null ? '—' : aed(cpl7)} gross)</span>`)}
${row(`Logged in the tracker · ${label(d2)}`, `${loggedD2.length} (Meta leads: ${d2Meta})`)}
${row(`Logged so far · ${label(y)}`, `${loggedY.length} (Meta leads: ${yT.leads})`)}
${row('Converted / booked · last 7 days', `${conv7} of ${last7.length} logged`)}
</table>`;
  const campaignsHtml = `<table style="border-collapse:collapse;width:100%;font-size:13px"><tr>${['Campaign · yesterday', 'Spend', 'Leads (gross · net)', 'Cost per lead (gross · net)', '7-day cost per lead'].map((h) => `<th style="text-align:left;background:#F1F1EA;color:#767769;font-size:11px;text-transform:uppercase;padding:6px">${h}</th>`).join('')}</tr>
${camps.map((x) => `<tr>${[esc(x.c.replace(/^Leads \| WhatsApp \| /, '').replace(/ \| Dubai.*$/, '')), aed(x.ys), `${x.yl} · ${x.yn}`, `${x.ycpl === null ? '—' : aed(x.ycpl)} · ${x.ycpn === null ? '—' : aed(x.ycpn)}`, x.wcpl === null ? '—' : aed(x.wcpl)].map((c) => `<td style="border-top:1px solid #E6E6DA;padding:6px">${c}</td>`).join('')}</tr>`).join('')}</table>`;
  const sourcesHtml = `<p style="color:#767769;font-size:12px">Sources: Meta ad data (fetched ${esc(lastFetch.slice(0, 16).replace('T', ' '))} UTC) and the In-House Lead Tracker (synced ${esc(lastSync.slice(0, 16).replace('T', ' '))} UTC). Counts only — no patient details. <a href="${CONTENTOS_LEADS}" style="color:#5793A3;font-weight:bold">Open the Meta leads list in ContentOS</a> to see and action individual leads.</p>`;
  const headline = `${yT.leads} leads from Meta (${yT.net} net) · ${aed(yT.spend)} · ${cplY === null ? 'no leads' : `${aed(cplY)} per lead, ${cpnY === null ? 'no net leads' : `${aed(cpnY)} per net lead`}`}`;
  const [platformsHtml, revenueHtml] = await Promise.all([
    buildPlatformsHtml(sb, y, tr.filter((x) => x.d === y).map((x) => x.row)),
    buildRevenueHtml(sb, y).catch(() => `<p style="color:#767769;font-size:12px">Practo revenue could not be read this morning.</p>`),
  ]);
  return { day: label(y), headline, platformsHtml, revenueHtml, flags, statsHtml, campaignsHtml, sourcesHtml };
}

/**
 * Yesterday's leads by platform for the morning briefing (Mr Akbar asked for
 * accurate gross, net and new leads per platform, and total enquiries). Sources: Meta platform breakdown (Facebook / Instagram), Google
 * Ads conversions, the website booking form and the In-House Lead Tracker.
 * Counts only.
 */
async function buildPlatformsHtml(sb: Sb, y: string, trackerY: Record<string, unknown>[]): Promise<string> {
  type Row = { total: number | null; gross: number | null; net: number | null; fresh: number | null };
  const rows = new Map<PlatformKey | 'google', Row>();
  const get = (k: PlatformKey | 'google') => { const r = rows.get(k) ?? { total: null, gross: null, net: null, fresh: null }; rows.set(k, r); return r; };
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
    if (k === 'facebook' || k === 'instagram' || k === 'website') continue; // lead figures for these come from Meta and the website form
    const text = `${md} ${svc} ${r['Notes / Remarks'] ?? ''} ${r['Conversion'] ?? ''} ${r['Lead Stage'] ?? ''}`;
    if (NOT_PATIENT.test(text)) continue;
    add(row, 'gross', 1); add(row, 'net', 1);
    if (!EXISTING.test(text)) add(row, 'fresh', 1);
  }
  // Meta ads, split Facebook / Instagram.
  for (const p of plat ?? []) {
    const k: PlatformKey = p.platform === 'instagram' ? 'instagram' : 'facebook';
    const ppl = metaPeople((p.data as { actions?: Actions } | null)?.actions);
    if (!ppl.gross) continue;
    const row = get(k);
    add(row, 'gross', ppl.gross); add(row, 'net', ppl.net); add(row, 'fresh', ppl.fresh);
  }
  // Google Ads: conversions (calls and forms) as Google reports them; it does not say who, so no net count.
  const gconv = (gads ?? []).reduce((n, g) => n + Number(g.conversions ?? 0), 0);
  if ((gads ?? []).some((g) => Number(g.spend ?? 0) > 0) || gconv) add(get('google'), 'gross', Math.round(gconv));
  // Website booking form: people who sent it (one per phone number); test entries are already removed.
  if (web && web.total) {
    const row = get('website');
    const people = new Set(web.enquiries.map((e) => (e.phone ?? '').replace(/\D/g, '').slice(-9) || e.key)).size;
    add(row, 'gross', people); add(row, 'net', people);
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
<table style="border-collapse:collapse;width:100%;font-size:13px"><tr>${['Platform', 'Gross leads', 'Net leads', 'New leads', 'Total enquiries logged'].map(th).join('')}</tr>
${shown.map((k) => { const r = rows.get(k)!; return `<tr>${td(esc(labelOf(k)))}${td(cell(r.gross), true)}${td(cell(r.net), true)}${td(cell(r.fresh))}${td(cell(r.total))}</tr>`; }).join('\n')}
<tr>${td('<b>All platforms</b>')}${td(String(sum('gross')), true)}${td(String(sum('net')), true)}${td(String(sum('fresh')))}${td(logged ? String(logged) : cell(null))}</tr></table>
${logged ? '' : `<p style="color:#7a6420;font-size:12px;margin:4px 0">The team has not logged ${esc(label(y))}’s enquiries in the In-House Lead Tracker yet, so total enquiries are not available this morning.</p>`}
<p style="color:#767769;font-size:12px;margin:4px 0 12px"><b>Gross leads:</b> people who contacted us, each counted once (Meta: people who started a chat or sent a form; Google Ads: conversions as Google reports them; website: people who sent the booking form; other platforms: treatment enquiries logged by the team, without job seekers, agencies or spam). <b>Net leads:</b> of those, people who had a real conversation (Meta: sent at least a second message after the ad’s automatic first one). <b>New leads:</b> people contacting Dental Nation for the first time (Meta: new messaging contacts; logged enquiries: not marked as an existing patient). <b>Total enquiries logged:</b> everything the team logged in the In-House Lead Tracker for the day, for any reason (still being filled in at 09:00). Meta’s own lead figure counts one person up to four times, so it is not used anywhere in this email. A dot means the source does not give that figure.</p>`;
}

/** The Meta section of a morning briefing: intro, red flags, ContentOS figures, ad figures, campaigns, sources. */
export function metaSectionHtml(m: MetaLeadsDigest | null, intro: string, flags: string[], contentosHtml: string): string {
  return `<p>${intro}</p>
${m?.platformsHtml ?? ''}
${m?.revenueHtml ?? ''}
${flags.length ? `<ol style="margin:4px 0 12px;padding-left:18px">${flags.map((f) => `<li style="margin-bottom:6px">${f}</li>`).join('')}</ol>` : '<p style="color:#2C5E3F"><b>No red flags.</b></p>'}
${contentosHtml}
${m ? `${m.statsHtml}\n${m.campaignsHtml}\n${m.sourcesHtml}` : `<p style="color:#767769;font-size:12px"><a href="${CONTENTOS_LEADS}" style="color:#5793A3;font-weight:bold">Open the Lead Analysis in ContentOS</a> for the ranked call list.</p>`}`;
}


/**
 * Yesterday's revenue from Practo, by the channel that brought each billed
 * patient (the same attribution as the Growth page: every bill joins back to
 * the patient file, so a channel is only credited with money actually billed),
 * plus the Practo total for the day and month to date as the check.
 */
async function buildRevenueHtml(sb: Sb, y: string): Promise<string> {
  const { getChannelPerformance } = await import('@/lib/growth/channelPerformance');
  const monthStart = `${y.slice(0, 8)}01`;
  const [perf, { data: bills }] = await Promise.all([
    getChannelPerformance({ from: y, to: y }),
    sb.from('practo_bills_raw').select('bill_date,amount,fetched_at').gte('bill_date', monthStart).lte('bill_date', y),
  ]);
  const b = (bills ?? []).map((r) => ({ d: r.bill_date as string, amt: Number(r.amount ?? 0), f: r.fetched_at as string }));
  const dayBills = b.filter((r) => r.d === y);
  const dayTotal = dayBills.reduce((n, r) => n + r.amt, 0);
  const mtd = b.reduce((n, r) => n + r.amt, 0);
  const lastFetch = b.reduce((a, r) => (r.f > a ? r.f : a), '');
  const rowsC = perf.channels.filter((c) => c.revenue > 0 || c.booked > 0 || c.treated > 0).sort((a, c) => c.revenue - a.revenue || c.booked - a.booked);
  const th = (h: string) => `<th style="text-align:left;background:#F1F1EA;color:#767769;font-size:11px;text-transform:uppercase;padding:6px">${h}</th>`;
  const td = (c: string, bold = false) => `<td style="border-top:1px solid #E6E6DA;padding:6px${bold ? ';font-weight:bold' : ''}">${c}</td>`;
  const name = (l: string) => esc(l.replace(/\s+—\s+/g, ': '));
  const body = rowsC.map((c) => `<tr>${td(name(c.label))}${td(String(c.booked))}${td(String(c.showed))}${td(String(c.treated))}${td(aed(c.revenue), true)}</tr>`).join('\n');
  const gap = Math.round(dayTotal - rowsC.reduce((n, c) => n + c.revenue, 0) - perf.unattributedRevenue);
  const unGap = Math.abs(gap) >= 1 ? `<tr>${td('<span style="color:#767769">Other bills (not in the channel view)</span>')}${td('·')}${td('·')}${td('·')}${td(aed(gap), true)}</tr>` : '';
  const un = perf.unattributedRevenue > 0 ? `<tr>${td('<span style="color:#767769">Not traced to a channel</span>')}${td('·')}${td('·')}${td(String(perf.unattributedPatients))}${td(aed(perf.unattributedRevenue), true)}</tr>` : '';
  return `<h4 style="margin:14px 0 4px;color:#244260">Revenue from Practo · ${esc(label(y))}</h4>
${rowsC.length || un || dayBills.length ? `<table style="border-collapse:collapse;width:100%;font-size:13px"><tr>${['Channel', 'Booked', 'Showed', 'Patients billed', 'Revenue'].map(th).join('')}</tr>
${body}
${un}
${unGap}
<tr>${td('<b>Total billed in Practo</b>')}${td(String(perf.totals.booked), true)}${td(String(perf.totals.showed), true)}${td(String(dayBills.length ? perf.totals.treated + perf.unattributedPatients : 0), true)}${td(aed(dayTotal), true)}</tr></table>` : `<p>No bills in Practo for ${esc(label(y))} yet.</p>`}
<p style="color:#767769;font-size:12px;margin:4px 0 12px"><b>Month to date:</b> ${aed(mtd)} billed in Practo (${b.length} bills, 1 to ${esc(label(y))}). Revenue is what Practo billed that day; each bill is credited to the channel that brought the patient, using the same matching as the Growth page. Practo last read ${esc(lastFetch.slice(0, 16).replace('T', ' '))} UTC.</p>`;
}
