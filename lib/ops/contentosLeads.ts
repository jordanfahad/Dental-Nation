import 'server-only';

/**
 * ContentOS "Lead Analysis" page (Zavis, open link) — read at send time for the
 * 09:00 morning briefing. The page is server-rendered: KPI tiles, the ads table
 * (spend, Meta chats, cost per chat, chats reaching the Zavis CRM), lead
 * quality, stage, blockers and recommended next steps, re-scored every 30
 * minutes. It carries chat numbers only; this reader takes the counts, never
 * the call list rows.
 */

export const CONTENTOS_LEADS = 'https://contentos.dentalnation.com/ads/meta/leads';

export interface ContentosCampaign { name: string; spend: number | null; chats: number; cpc: number; crm: number }
export interface ContentosLeads {
  asOf: string | null;
  leads: number; highQuality: number; ready: number; booked: number; quiet: number; replyHours: number | null;
  campaigns: ContentosCampaign[];
  total: { spend: number | null; chats: number | null; cpc: number | null; crm: number | null };
  blockers: [string, number][];
  nextSteps: [string, number][];
  callNow: number;
}

const strip = (h: string) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<tbody[\s\S]*?<\/tbody>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
const num = (s: string | undefined) => (s === undefined ? null : Number(s.replace(/[,\s]/g, '')));
const between = (t: string, a: string, b: string) => { const i = t.indexOf(a); if (i < 0) return ''; const j = t.indexOf(b, i + a.length); return t.slice(i + a.length, j < 0 ? undefined : j); };

/** Parse the page text (exported for tests). */
export function parseContentos(text: string): ContentosLeads | null {
  const n = (re: RegExp) => { const m = text.match(re); return m ? Number(m[1].replace(/,/g, '')) : null; };
  const leads = n(/(\d[\d,]*) new leads scored/);
  if (leads === null) return null;
  const table = between(text, 'Chats in CRM', 'Cost per chat by platform');
  const campaigns: ContentosCampaign[] = [];
  for (const m of table.matchAll(/([A-Z][A-Za-z&' -]+?) AED ([\d,.]+|\[num\]) ?(\d+)? AED ([\d.]+) (\d+)/g)) {
    if (/^Total/.test(m[1].trim())) continue;
    campaigns.push({ name: m[1].trim(), spend: /\d/.test(m[2]) ? num(m[2]) : null, chats: Number(m[3] ?? NaN), cpc: Number(m[4]), crm: Number(m[5]) });
  }
  const tot = table.match(/Total AED ([\d,.]+|\[num\]) ?(\d+)? AED ([\d.]+) (\d+)/);
  for (const c of campaigns) if (!Number.isFinite(c.chats) && c.spend !== null && c.cpc) c.chats = Math.round(c.spend / c.cpc);
  const pairs = (seg: string, re: RegExp) => [...seg.matchAll(re)].map((m) => [m[1].trim(), Number(m[2])] as [string, number]);
  const blockers = pairs(between(text, 'What stands in the way', 'Recommended next step'), /([A-Z][a-z ]+?) (\d+)/g);
  const nextSteps = pairs(between(text, 'Recommended next step', 'The loss'), /([A-Z][a-z ]+?) (\d+) of \d+/g);
  const asOf = text.match(/Last run ([^.(]+?Dubai)/)?.[1] ?? text.match(/pulled ([^()]+?Dubai)/)?.[1] ?? null;
  return {
    asOf,
    leads,
    highQuality: n(/(\d[\d,]*) high-quality leads/) ?? 0,
    ready: n(/(\d[\d,]*) ready to book/) ?? 0,
    booked: n(/(\d[\d,]*) appointments? booked/) ?? 0,
    quiet: n(/(\d[\d,]*) went quiet after first contact/) ?? 0,
    replyHours: n(/([\d.]+) h average first reply/),
    campaigns,
    total: { spend: tot && /\d/.test(tot[1]) ? num(tot[1]) : null, chats: tot?.[2] ? Number(tot[2]) : null, cpc: tot ? Number(tot[3]) : null, crm: tot ? Number(tot[4]) : null },
    blockers,
    nextSteps,
    callNow: nextSteps.find(([k]) => /call now/i.test(k))?.[1] ?? 0,
  };
}

export async function fetchContentos(): Promise<ContentosLeads | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 15_000);
  try {
    const r = await fetch(CONTENTOS_LEADS, { headers: { 'user-agent': 'Mozilla/5.0 (DentalNation reports)' }, cache: 'no-store', signal: ac.signal });
    if (!r.ok) return null;
    return parseContentos(strip(await r.text()));
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** Red flags from ContentOS, most serious first (HTML). */
export function contentosFlags(c: ContentosLeads): string[] {
  const f: string[] = [];
  if (c.leads >= 10 && c.quiet >= 0.5 * c.leads) f.push(`<b>Leads going quiet after first contact:</b> ${c.quiet} of ${c.leads} Meta WhatsApp leads (${pct(c.quiet, c.leads)}%) stopped replying once the clinic replied or called${c.replyHours !== null ? `, and the first reply from a person takes <b>${c.replyHours} h</b> on average` : ''}. The fix is speed: reply within minutes, clear the queue first thing every morning and cover evenings.`);
  else if (c.replyHours !== null && c.replyHours > 1) f.push(`<b>Slow first reply:</b> a person takes ${c.replyHours} h on average to reply to a new Meta lead — aim for minutes.`);
  if (c.callNow) f.push(`<b>Leads to call now:</b> ContentOS ranks <b>${c.callNow}</b> leads as “call now”${c.ready ? ` — ${c.ready} are ready to book` : ''}, but only ${c.booked} booking ${c.booked === 1 ? 'is' : 'are'} recorded. Work the call list today, top down.`);
  const gap = c.campaigns.filter((x) => Number.isFinite(x.chats) && x.chats >= 10 && x.crm < 0.5 * x.chats);
  if (gap.length) f.push(`<b>Chats not reaching the Zavis CRM:</b> ${gap.map((x) => `${esc(x.name)} — ${x.chats} chats on Meta, ${x.crm} in the CRM`).join('; ')}. Those people may never have been answered.`);
  if (c.total.cpc) {
    const dear = c.campaigns.filter((x) => Number.isFinite(x.chats) && x.chats >= 10 && x.cpc > 1.75 * c.total.cpc!);
    if (dear.length) f.push(`<b>Expensive chats:</b> ${dear.map((x) => `${esc(x.name)} AED ${x.cpc} per chat`).join('; ')} vs AED ${c.total.cpc} overall — review the creative or move budget.`);
  }
  if (c.leads >= 50 && c.booked <= 0.02 * c.leads) f.push(`<b>Bookings not recorded:</b> ${c.booked} of ${c.leads} leads marked booked. Record every chat’s outcome (booked, no-show, lost) in the CRM so the scoring can be measured.`);
  return f;
}

/** Headline figures (HTML table rows' content). */
export function contentosStatsHtml(c: ContentosLeads): string {
  const row = (k: string, v: string) => `<tr><td style="padding:4px 8px;color:#767769">${k}</td><td style="padding:4px 8px;font-weight:bold">${v}</td></tr>`;
  const top = c.blockers.slice(0, 3).map(([k, v]) => `${esc(k.toLowerCase())} ${v}`).join(' · ');
  return `<table style="border-collapse:collapse;font-size:13px;margin:6px 0 12px">
${row('New leads scored (since 16 Sep launch)', `${c.leads} · ${c.highQuality} high quality (${pct(c.highQuality, c.leads)}%)`)}
${row('Ready to book · booked', `${c.ready} · ${c.booked}`)}
${row('Went quiet after first contact', `${c.quiet} of ${c.leads}`)}
${c.replyHours !== null ? row('First reply from a person', `${c.replyHours} h average (last week)`) : ''}
${c.total.chats !== null && c.total.crm !== null ? row('Meta chats → in the Zavis CRM', `${c.total.chats} → ${c.total.crm}`) : ''}
${top ? row('What stands in the way', top) : ''}
</table>`;
}
