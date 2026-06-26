import type { LeaveDashboard, LeaveEmployee, ApprovalItem, AwayItem } from './data';

/** Server-side HTML fragment builders for the live /Leave-Calendar tokens. */

const PALETTE = ['#15233C', '#2C5FCB', '#3567C9', '#2E9D5B', '#2E9D7E', '#6A5CC4', '#C28A2E', '#CB4747', '#5F6E8A'];
const TITLE = /^(mr|mrs|ms|dr|miss|prof)\.?$/i;

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((w) => !TITLE.test(w));
  const use = parts.length ? parts : name.trim().split(/\s+/);
  const s = use.length >= 2 ? use[0][0] + use[1][0] : (use[0] || '?').slice(0, 2);
  return s.toUpperCase();
}
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function num(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}
function typeChip(code: string, label: string): string {
  const cls = code === 'annual' ? 'c-blue' : code === 'sick' ? 'c-watch' : code === 'unpaid' ? 'c-neutral' : 'c-neutral';
  return `<span class="chip ${cls}"><span class="pip"></span>${esc(label)}</span>`;
}
function tenure(join: string | null): string {
  if (!join) return '—';
  const y = (Date.now() - new Date(join).getTime()) / (365.25 * 864e5);
  return y < 0.1 ? 'new' : `${y.toFixed(1)}y`;
}

function kpis(d: LeaveDashboard): string {
  const away = d.on_leave_today;
  const awayFoot = away === 0 ? 'Nobody scheduled off today' : byDept(d.whos_away);
  const pendFoot = d.pending_count === 0 ? 'Your queue is clear' : 'awaiting your sign-off';
  return `
    <div class="kpi k-navy"><div class="acc"></div><div class="lab">Active headcount</div><div class="val num">${d.headcount}</div><div class="foot">${d.dept_count} departments · live</div></div>
    <div class="kpi k-amber"><div class="acc"></div><div class="lab">On leave today</div><div class="val num">${away}</div><div class="foot">${esc(awayFoot)}</div></div>
    <div class="kpi k-blue"><div class="acc"></div><div class="lab">Pending your approval</div><div class="val num">${d.pending_count}</div><div class="foot">${esc(pendFoot)}</div></div>
    <div class="kpi k-green"><div class="acc"></div><div class="lab">Weekly hours met</div><div class="val num">—</div><div class="foot">Attendance not yet tracked</div></div>`;
}
function byDept(away: AwayItem[]): string {
  if (!away.length) return '';
  const counts: Record<string, number> = {};
  for (const a of away) { const k = a.department || 'Other'; counts[k] = (counts[k] || 0) + 1; }
  return Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(' · ');
}
function approvalQueue(items: ApprovalItem[]): string {
  if (!items.length) {
    return `<div class="reqitem" style="cursor:default"><div style="color:var(--muted);font-size:13px;padding:6px 2px">No requests are awaiting your sign-off — the queue is clear.</div></div>`;
  }
  return items.map((r) => `
    <div class="reqitem" onclick="go('approvals')">
      <div><div class="rl-top"><div class="person"><div class="avatar" style="background:${colorFor(r.name)}">${initials(r.name)}</div><div><div class="pn">${esc(r.name)}</div><div class="rl-type">${esc(r.designation || '')}${r.department ? ' · ' + esc(r.department) : ''}</div></div></div></div>
        <div class="rl-dates">${typeChip(r.type_code, r.type_name)} ${esc(r.range)} · <strong>${num(r.days)} days</strong></div></div>
      <div class="rl-right"><span class="chip c-watch"><span class="pip"></span>Awaiting you</span></div></div>`).join('');
}
function liability(d: LeaveDashboard): string {
  return `
    <div class="fl">Annual leave banked</div>
    <div class="fv num">${num(d.liability_days)} days</div>
    <div class="fd">Accrued, unused annual leave across all ${d.headcount} staff — the encashment exposure under UAE end-of-service rules. Add salary data to value it in AED.</div>
    <div style="margin-top:13px"><span class="chip" style="background:rgba(255,255,255,.1);color:#fff"><span class="pip" style="background:var(--gold)"></span>${d.headcount} staff · FY${d.year}</span></div>`;
}
function whosAway(d: LeaveDashboard): string {
  if (!d.whos_away.length) {
    return `<div style="color:var(--muted);font-size:13px">Everyone's in today — no approved leave covering ${esc(d.today_short)}.</div>`;
  }
  return d.whos_away.map((a) => `
    <div class="person"><div class="avatar" style="background:${colorFor(a.name)}">${initials(a.name)}</div><div style="flex:1"><div class="pn">${esc(a.name)}</div><div class="pr">${esc(a.department || '')} · back ${esc(a.back)}</div></div>${typeChip(a.type_code, a.type_name)}</div>`).join('');
}
function weeklyHours(): string {
  return `<div class="cpad" style="padding:18px 20px;color:var(--muted);font-size:13px">Attendance &amp; weekly-hours tracking isn't wired up yet — once punch data starts flowing in, per-department compliance will appear here.</div>`;
}
function dirRows(emps: LeaveEmployee[]): string {
  return emps.map((e) => `
    <tr><td><div class="person"><div class="avatar" style="background:${colorFor(e.name)}">${initials(e.name)}</div><div><div class="pn">${esc(e.name)}</div><div class="pr">${esc(e.designation || '')}</div></div></div></td><td>${esc(e.department || '—')}</td><td>${esc(e.manager || '—')}</td><td class="num">${num(e.annual_left)}</td><td class="num">${num(e.sick_left)}</td></tr>`).join('');
}
function dirProfile(emps: LeaveEmployee[]): string {
  const e = emps[0];
  if (!e) return '<div class="cpad">No employees yet.</div>';
  return `
    <div class="chead"><div class="chead-l"><div class="cchip">${initials(e.name)}</div><div><div class="ceyebrow">Employee profile</div><h3>${esc(e.name)}</h3></div></div><span class="chip c-blue"><span class="pip"></span>Active</span></div>
    <div class="cpad">
      <div class="stat-inline" style="margin-bottom:18px"><div class="si"><div class="v num">${num(e.annual_left)}</div><div class="l">Annual left</div></div><div class="si"><div class="v num">${num(e.sick_left)}</div><div class="l">Sick left</div></div><div class="si"><div class="v num">${tenure(e.join_date)}</div><div class="l">Tenure</div></div></div>
      <div class="section-title">Designation</div>
      <div style="font-size:13px;color:var(--text);margin-bottom:16px">${esc(e.designation || '—')}${e.department ? ' · ' + esc(e.department) : ''}</div>
      <div class="section-title">Reports to</div>
      <div class="person" style="margin-bottom:16px">${e.manager ? `<div class="avatar" style="background:${colorFor(e.manager)};width:28px;height:28px;font-size:10px">${initials(e.manager)}</div><div class="pn" style="font-size:13px">${esc(e.manager)}</div>` : '<div class="pn" style="font-size:13px;color:var(--muted)">— top of the organisation</div>'}</div>
      <div class="section-title">Recent leave</div>
      <div style="font-size:13px;color:var(--muted)">No leave taken yet this year.</div>
    </div>`;
}

/** Replace every live token in the static HTML. */
export function fillTokens(html: string, d: LeaveDashboard): string {
  const map: Record<string, string> = {
    '<!--TODAY-->': esc(d.today),
    '<!--TODAY_SHORT-->': esc(d.today_short),
    '<!--KPIS-->': kpis(d),
    '<!--APPROVAL_QUEUE-->': approvalQueue(d.approval_queue),
    '<!--LEAVE_LIABILITY-->': liability(d),
    '<!--WHOS_AWAY-->': whosAway(d),
    '<!--WEEKLY_HOURS-->': weeklyHours(),
    '<!--DIR_COUNT-->': `${d.headcount} active`,
    '<!--DIR_ROWS-->': dirRows(d.employees),
    '<!--DIR_PROFILE-->': dirProfile(d.employees),
  };
  let out = html;
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
  return out;
}
