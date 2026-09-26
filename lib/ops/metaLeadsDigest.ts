import 'server-only';
import type { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Daily Meta leads analysis (26 Sep, for Dr Luvi; Mr Akbar and Ms Shadi copied).
 * Built from the data the dashboard already syncs: Meta ad-level insights
 * (lane_e.meta_ad_insights_raw — spend and leads per ad per day) and the
 * In-House Lead Tracker (lane_e.raw_lead_tracker — what the team logged and
 * followed up). The ContentOS leads page (Zavis) shows the same Meta leads
 * but sits behind Zavis's login, so the email links to it rather than reading it.
 *
 * The email carries counts only — never patient names or phone numbers.
 */

type Sb = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

export const CONTENTOS_LEADS = 'https://contentos.dentalnation.com/ads/meta/leads';

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

export interface MetaLeadsDigest { subject: string; body: string; flags: number }

export async function buildMetaLeadsDigest(sb: Sb, today: string): Promise<MetaLeadsDigest | null> {
  const y = addDays(today, -1);
  const d2 = addDays(today, -2);
  const from = addDays(today, -9);
  const [{ data: ads }, { data: rows }] = await Promise.all([
    sb.from('meta_ad_insights_raw').select('date,campaign_name,ad_name,spend,leads,fetched_at').gte('date', from).lte('date', y),
    sb.from('raw_lead_tracker').select('data,synced_at'),
  ]);
  const meta = (ads ?? []).map((a) => ({ date: a.date as string, campaign: (a.campaign_name as string) ?? '—', ad: (a.ad_name as string) ?? '—', spend: Number(a.spend ?? 0), leads: Number(a.leads ?? 0), fetched: a.fetched_at as string }));
  if (!meta.length) return null;

  const dayTot = (iso: string) => meta.filter((m) => m.date === iso).reduce((a, m) => ({ spend: a.spend + m.spend, leads: a.leads + m.leads }), { spend: 0, leads: 0 });
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
  if (d2Meta >= 5 && loggedD2.length < 0.5 * d2Meta) flags.push(`<b>Leads not logged:</b> Meta reported ${d2Meta} leads on ${label(d2)} but only ${loggedD2.length} are in the In-House Lead Tracker — ${d2Meta - loggedD2.length} may not have been contacted. (Meta counts every WhatsApp conversation started, so some will be low intent — but a gap this size needs checking.)`);
  if (noFollow) flags.push(`<b>No first follow-up:</b> ${noFollow} Meta lead${noFollow === 1 ? '' : 's'} logged in the last 3 days have no first follow-up recorded.`);
  if (wasted.length) flags.push(`<b>Spend with no leads:</b> ${wasted.map((w) => `${esc(w.ad)} (${esc(w.campaign.replace(/^Leads \| WhatsApp \| /, '').replace(/ \| Dubai.*$/, ''))}) — ${aed(w.spend)} over 3 days, 0 leads`).join('; ')}.`);
  if (spikes.length) flags.push(`<b>Cost per lead jumped:</b> ${spikes.map((s) => `${esc(s.c.replace(/^Leads \| WhatsApp \| /, '').replace(/ \| Dubai.*$/, ''))} — ${s.ycpl === null ? `${aed(s.ys)} spent, 0 leads` : `${aed(s.ycpl)} per lead`} yesterday vs ${aed(s.wcpl!)} the week before`).join('; ')}.`);
  if (avgLeads >= 10 && yT.leads < 0.5 * avgLeads) flags.push(`<b>Lead volume dropped:</b> ${yT.leads} leads yesterday vs a daily average of ${Math.round(avgLeads)} over the previous 7 days.`);
  if (last7.length >= 20 && conv7 === 0) flags.push(`<b>No conversions recorded:</b> ${last7.length} Meta leads logged in the last 7 days, none marked converted or booked in the tracker — either nothing converted or the “Conversion” column is not being filled.`);
  if (lastFetch && Date.now() - Date.parse(lastFetch) > 26 * 3600_000) flags.push(`<b>Meta data is stale:</b> last fetched ${esc(lastFetch.slice(0, 16).replace('T', ' '))} UTC.`);
  if (!loggedY.length && !loggedD2.length) flags.push('<b>Tracker not updated:</b> no Meta leads logged for the last two days.');

  const row = (k: string, v: string) => `<tr><td style="padding:4px 8px;color:#767769">${k}</td><td style="padding:4px 8px;font-weight:bold">${v}</td></tr>`;
  const body = `<p>Good morning Dr Luvi,</p>
<p>Here is yesterday’s Meta (Facebook / Instagram) lead analysis${flags.length ? `, with <b style="color:#a04a38">${flags.length} red flag${flags.length === 1 ? '' : 's'}</b> for your attention` : ' — no red flags'}.</p>
<table style="border-collapse:collapse;font-size:13px;margin:6px 0 12px">
${row(`Leads · ${label(y)}`, `${yT.leads} <span style="font-weight:normal;color:#767769">(7-day daily average ${Math.round(avgLeads)})</span>`)}
${row('Spend', `${aed(yT.spend)} <span style="font-weight:normal;color:#767769">(7 days: ${aed(wkSpend)})</span>`)}
${row('Cost per lead', `${cplY === null ? '—' : aed(cplY)} <span style="font-weight:normal;color:#767769">(7-day ${cpl7 === null ? '—' : aed(cpl7)})</span>`)}
${row(`Logged in the tracker · ${label(d2)}`, `${loggedD2.length} of ${d2Meta} Meta leads`)}
${row(`Logged so far · ${label(y)}`, `${loggedY.length} of ${yT.leads}`)}
${row('Converted / booked · last 7 days', `${conv7} of ${last7.length} logged`)}
</table>
${flags.length ? `<h3 style="font-size:14px;margin:12px 0 4px;color:#a04a38">Red flags</h3><ol style="margin:4px 0 12px;padding-left:18px">${flags.map((f) => `<li style="margin-bottom:6px">${f}</li>`).join('')}</ol>` : ''}
<h3 style="font-size:14px;margin:12px 0 4px">By campaign — yesterday vs the 7 days before</h3>
<table style="border-collapse:collapse;width:100%;font-size:13px"><tr>${['Campaign', 'Spend', 'Leads', 'Cost/lead', '7-day cost/lead'].map((h) => `<th style="text-align:left;background:#F1F1EA;color:#767769;font-size:11px;text-transform:uppercase;padding:6px">${h}</th>`).join('')}</tr>
${camps.map((x) => `<tr>${[esc(x.c.replace(/^Leads \| WhatsApp \| /, '').replace(/ \| Dubai.*$/, '')), aed(x.ys), String(x.yl), x.ycpl === null ? '—' : aed(x.ycpl), x.wcpl === null ? '—' : aed(x.wcpl)].map((c) => `<td style="border-top:1px solid #E6E6DA;padding:6px">${c}</td>`).join('')}</tr>`).join('')}</table>
<p style="margin-top:12px"><a href="${CONTENTOS_LEADS}" style="color:#5793A3;font-weight:bold">Open the Meta leads list in ContentOS</a> to see and action individual leads.</p>
<p style="color:#767769;font-size:12px">Sources: Meta ad data (fetched ${esc(lastFetch.slice(0, 16).replace('T', ' '))} UTC) and the In-House Lead Tracker (synced ${esc(lastSync.slice(0, 16).replace('T', ' '))} UTC). Counts only — no patient details. Copied: Mr Akbar, Ms Shadi, Fahad.</p>`;
  const subject = `Meta leads — ${label(y)}: ${yT.leads} leads · ${aed(yT.spend)} · ${cplY === null ? 'no leads' : `${aed(cplY)}/lead`}${flags.length ? ` · ${flags.length} red flag${flags.length === 1 ? '' : 's'}` : ''}`;
  return { subject, body, flags: flags.length };
}
