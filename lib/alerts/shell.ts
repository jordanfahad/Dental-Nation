/**
 * Email layout for the 09:00 alert emails (approved templates, 24 Oct 2026).
 * Inline styles and tables only, so it renders the same in Outlook desktop,
 * Outlook web and Gmail. Every helper returns escaped HTML; raw text never
 * reaches the page unescaped.
 */
const NAVY = '#244260', TEAL = '#5793A3', OFF = '#F7F5EF', LINE = '#DDE5E0', INK = '#2C3233', GREY = '#6B7280';
const RED = '#B42318', AMBER = '#B54708', GREEN = '#2E7D32';
const FONT = 'font-family:Arial,Helvetica,sans-serif';

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[–—]/g, '-').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Formats a count or amount; null means the dashboard cannot show it yet. */
export const fmt = (n: number | null | undefined, dp = 0) =>
  n == null || !Number.isFinite(n) ? null : n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const NOT_YET = `<span style="color:${GREY}">not yet</span>`;

/** A figure that links to its proof view. Null value renders "not yet" (no link). */
export function num(value: string | number | null | undefined, href?: string): string {
  const v = typeof value === 'number' ? fmt(value) : value;
  if (v == null || v === '') return NOT_YET;
  if (!href) return esc(v);
  return `<a href="${esc(href)}" style="color:${INK};text-decoration:none;border-bottom:1px dotted ${TEAL}">${esc(v)}</a>`;
}

export const proof = (href: string, label = 'Proof') =>
  `<a href="${esc(href)}" style="color:${TEAL};text-decoration:none;font-weight:bold;font-size:11px;white-space:nowrap">${esc(label)}&nbsp;&#8599;</a>`;

export const text = (s: string) => esc(s);
export const bold = (s: string) => `<b>${esc(s)}</b>`;
export const tone = (s: string, kind: 'up' | 'down' | 'watch' | 'plain' = 'plain') =>
  `<span style="color:${kind === 'up' ? GREEN : kind === 'down' ? RED : kind === 'watch' ? AMBER : GREY};font-weight:${kind === 'plain' ? 'normal' : 'bold'}">${esc(s)}</span>`;

export const h2 = (t: string) =>
  `<h2 style="${FONT};font-size:14px;color:${NAVY};margin:18px 0 6px;padding-bottom:4px;border-bottom:2px solid ${LINE}">${esc(t)}</h2>`;
export const note = (t: string) => `<p style="${FONT};font-size:11px;color:${GREY};margin:4px 0">${esc(t)}</p>`;
export const banner = (html: string) =>
  `<p style="${FONT};font-size:11.5px;color:${INK};background:${OFF};padding:7px 10px;margin:8px 0;border-radius:4px">${html}</p>`;
export const gap = (t: string) =>
  `<p style="${FONT};font-size:11px;color:${INK};background:#FEF3F2;border-left:3px solid ${RED};padding:6px 9px;margin:6px 0">${esc(t)}</p>`;
export const list = (items: string[]) =>
  `<ul style="${FONT};font-size:12.5px;color:${INK};margin:4px 0 4px 18px;padding:0">${items.map((i) => `<li style="margin:3px 0">${i}</li>`).join('')}</ul>`;

export interface Tile { label: string; value: string | number | null; href?: string; sub?: string; subTone?: 'up' | 'down' | 'watch' | 'plain'; extra?: string }
/** Up to four headline figures in one row (table-based for Outlook). */
export function tiles(items: Tile[]): string {
  const cells = items.map((t) => `<td valign="top" style="width:${Math.floor(100 / items.length)}%;padding:4px">
<div style="border:1px solid ${LINE};border-radius:6px;background:${OFF};padding:8px 10px;${FONT}">
<div style="font-size:10px;color:${GREY};text-transform:uppercase;letter-spacing:.05em">${esc(t.label)}</div>
<div style="font-size:20px;font-weight:bold;color:${NAVY};margin:2px 0">${num(t.value, t.href)}</div>
${t.sub ? `<div style="font-size:11px">${tone(t.sub, t.subTone ?? 'plain')}</div>` : ''}
${t.extra ?? ''}${t.href && t.value != null ? `<div>${proof(t.href)}</div>` : ''}</div></td>`).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse"><tr>${cells}</tr></table>`;
}

/** A data table. Cells are pre-built HTML (use num/text/proof); `numeric` columns are right-aligned. */
export function table(head: string[], rows: string[][], numeric: number[] = []): string {
  const th = head.map((h, i) => `<th style="text-align:${numeric.includes(i) ? 'right' : 'left'};background:${OFF};color:${GREY};font-weight:bold;font-size:10px;text-transform:uppercase;padding:5px 6px;border-bottom:1px solid ${LINE}">${esc(h)}</th>`).join('');
  const tr = rows.map((r) => `<tr>${r.map((c, i) => `<td style="padding:5px 6px;border-bottom:1px solid ${LINE};vertical-align:top;text-align:${numeric.includes(i) ? 'right' : 'left'};white-space:${numeric.includes(i) ? 'nowrap' : 'normal'}">${c}</td>`).join('')}</tr>`).join('');
  return `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;${FONT};font-size:12px;color:${INK};margin:4px 0">${th ? `<tr>${th}</tr>` : ''}${tr}</table>`;
}

export interface EmailParts {
  kicker: string;          // e.g. "SMILE CLUB · DAILY 9 AM"
  title: string;
  subtitle: string;        // dates covered
  body: string;            // HTML from the helpers above
  landing: { href: string; label: string };
  sources: string;         // plain-text footer line
  recipients: string;      // plain text, e.g. "To Mr Akbar and Ms Shadi; copied to Fahad."
  preview?: string;        // plain text shown in a yellow band on preview copies
}

export function emailHtml(p: EmailParts): string {
  return `<div style="background:#EEF1F4;padding:12px 0"><table role="presentation" align="center" cellpadding="0" cellspacing="0" style="max-width:700px;width:100%;margin:0 auto;background:#ffffff;border:1px solid ${LINE};border-collapse:collapse">
${p.preview ? `<tr><td style="background:#FFF4E5;color:${AMBER};${FONT};font-size:11.5px;font-weight:bold;text-align:center;padding:6px">${esc(p.preview)}</td></tr>` : ''}
<tr><td style="background:${NAVY};color:#ffffff;padding:16px 18px;${FONT}">
<div style="font-size:10.5px;letter-spacing:.12em;opacity:.85">${esc(p.kicker)}</div>
<div style="font-size:19px;font-weight:bold;margin:4px 0 2px">${esc(p.title)}</div>
<div style="font-size:12px;opacity:.85">${esc(p.subtitle)}</div></td></tr>
<tr><td style="padding:12px 18px;${FONT};font-size:13px;color:${INK}">${p.body}
<div style="text-align:center;margin:18px 0 6px"><a href="${esc(p.landing.href)}" style="display:inline-block;background:${NAVY};color:#ffffff;text-decoration:none;padding:9px 16px;border-radius:5px;font-weight:bold;font-size:12.5px;${FONT}">${esc(p.landing.label)}&nbsp;&#8599;</a></div>
<p style="${FONT};font-size:11px;color:${GREY};text-align:center;margin:4px 0">Every figure is a link. Click a number or "Proof" to open the exact report view (same dates, same clinic) on reports.dentalnation.com. Links ask for your dashboard login the first time.</p>
</td></tr>
<tr><td style="background:${OFF};padding:12px 18px;${FONT};font-size:11px;color:${GREY};border-top:1px solid ${LINE}">${esc(p.sources)}<br>${esc(p.recipients)} Sent automatically at 09:00 Dubai time. Questions: Fahad Siddiqui.</td></tr>
</table></div>`;
}

/** Final subject/html pair; strips dashes the house style does not use. */
export const finishEmail = (subject: string, html: string) => ({ subject: subject.replace(/[–—]/g, '-'), html });

/** "Sat 24 Oct" from YYYY-MM-DD. */
export const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));
/** "1 to 23 Oct" for a range in one month. */
export const rangeLabel = (from: string, to: string) =>
  `${Number(from.slice(8))} to ${new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${to}T12:00:00Z`))}`;
