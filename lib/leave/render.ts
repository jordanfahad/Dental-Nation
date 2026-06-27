import type {
  LeaveDashboard, LeaveEmployee, ApprovalItem, AwayItem,
  LeaveBoard, Approval, Balance,
} from './data';

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

// ===================== Apply =====================
function applyTypeOptions(b: LeaveBoard): string {
  const balByCode: Record<string, Balance> = {};
  for (const x of b.my_balances) balByCode[x.code] = x;
  return b.leave_types.map((t) => {
    const bal = balByCode[t.code];
    let note = '';
    if (bal) note = ` — ${num(bal.remaining)} of ${num(bal.entitled)} days left`;
    else if (t.requires_cert) note = ' — DHA certificate for 3+ days';
    else if (!t.paid) note = ' — unpaid';
    else if (t.default_days != null) note = ` — ${num(t.default_days)} days`;
    return `<option value="${esc(t.code)}">${esc(t.name)}${esc(note)}</option>`;
  }).join('');
}
function applyLadder(b: LeaveBoard, d: LeaveDashboard | null): string {
  const me = d?.employees.find((e) => e.name === b.viewer.name);
  const ceo = d?.employees.find((e) => e.is_ceo);
  const rung = (cls: string, n: number | string, stage: string, who: string, when?: string) =>
    `<div class="rung ${cls}"><div class="spine"><div class="node">${n}</div>${cls !== 'last' ? '<div class="line"></div>' : ''}</div><div class="body"><div class="stage">${esc(stage)}</div><div class="who2">${esc(who)}</div>${when ? `<div class="when">${esc(when)}</div>` : ''}</div></div>`;
  if (!me || !me.manager) {
    return `<div class="rung current"><div class="spine"><div class="node">1</div></div><div class="body"><div class="stage">You submit</div><div class="who2">${esc(b.viewer.name)}</div><div class="when">Top of the organisation — auto-approved</div></div></div>`;
  }
  const rungs = [
    rung('current', 1, 'You submit', b.viewer.name),
    rung('pending', 2, 'Manager approves', me.manager),
  ];
  if (ceo && me.manager !== ceo.name) {
    rungs.push(rung('pending', 3, 'CEO — only if over 5 days / unpaid', ceo.name));
  }
  return rungs.join('');
}
function applyBalances(b: LeaveBoard): string {
  const colorByCode: Record<string, [string, string]> = {
    annual: ['c-blue', 'var(--blue)'], sick: ['c-watch', 'var(--amber)'],
    maternity: ['c-violet', 'var(--violet)'], parental: ['c-violet', 'var(--violet)'],
  };
  const show = b.my_balances.filter((x) => ['annual', 'sick', 'parental', 'maternity'].includes(x.code));
  const list = show.length ? show : b.my_balances.slice(0, 3);
  if (!list.length) return '<p class="hint">No balances set for this year yet.</p>';
  return list.map((x) => {
    const [chip, bar] = colorByCode[x.code] || ['c-neutral', 'var(--slate)'];
    const pct = x.entitled > 0 ? Math.max(0, Math.min(100, (x.remaining / x.entitled) * 100)) : 0;
    return `<div class="balcard"><div class="bt"><div class="bname"><span class="chip ${chip}" style="padding:2px 6px"><span class="pip"></span></span>${esc(x.name)}</div><div class="bnum">${num(x.remaining)} / ${num(x.entitled)}</div></div><div class="bar"><span style="width:${pct.toFixed(0)}%;background:${bar}"></span></div></div>`;
  }).join('');
}

// ===================== Approvals =====================
function approvalsQueue(items: Approval[]): string {
  if (!items.length) {
    return `<div class="reqitem" style="cursor:default"><div style="color:var(--muted);font-size:13px;padding:6px 2px">Nothing awaiting you — the queue is clear.</div></div>`;
  }
  return items.map((r, i) => `
    <div class="reqitem${i === 0 ? ' sel' : ''}" onclick="selectApproval(${i})">
      <div><div class="rl-top"><div class="person"><div class="avatar" style="background:${colorFor(r.name)}">${initials(r.name)}</div><div><div class="pn">${esc(r.name)}</div><div class="rl-type">${esc(r.designation || '')}${r.department ? ' · ' + esc(r.department) : ''}</div></div></div></div>
        <div class="rl-dates">${typeChip(r.type_code, r.type_name)} ${esc(r.start)} – ${esc(r.end)} · <strong>${num(r.days)} days</strong></div></div>
      <div class="rl-right"><span class="miniflag">${r.direct_report ? 'Direct → you' : 'In your queue'}</span><span class="chip c-watch"><span class="pip"></span>You</span></div></div>`).join('');
}
function ladderHtml(rungs: Approval['ladder']): string {
  if (!rungs || !rungs.length) return '';
  return rungs.map((a, idx) => {
    const cls = a.action === 'approved' ? 'done' : a.action === 'rejected' ? 'done' : (a.action === 'pending' ? 'current' : 'pending');
    const node = a.action === 'approved' ? '✓' : a.action === 'rejected' ? '✕' : (idx === rungs.length - 1 ? '★' : a.step);
    const last = idx === rungs.length - 1;
    return `<div class="rung ${cls}"><div class="spine"><div class="node">${node}</div>${last ? '' : '<div class="line"></div>'}</div><div class="body"><div class="stage">Step ${a.step}${a.action !== 'pending' ? ' · ' + esc(a.action) : ''}</div><div class="who2">${esc(a.name || '—')}</div></div></div>`;
  }).join('');
}

// ===================== Calendar =====================
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter((w) => !TITLE.test(w));
  const use = parts.length ? parts : name.split(/\s+/);
  return use.length >= 2 ? `${use[0]} ${use[1][0]}.` : use[0];
}
function blockColor(code: string): string {
  return code === 'annual' ? 'var(--blue)' : code === 'sick' ? 'var(--amber)' : code === 'unpaid' ? '#7A8699' : 'var(--violet)';
}
function calendarGrid(b: LeaveBoard): string {
  if (!b.calendar.length) {
    const m = new Date(b.year, b.month - 1, 1).toLocaleString('en', { month: 'long' });
    return `<div style="padding:34px 22px;text-align:center;color:var(--muted);font-size:13.5px">No leave is booked for ${m} ${b.year}.<br>Approved and pending requests will appear here as a timeline.</div>`;
  }
  const days = new Date(b.year, b.month, 0).getDate();
  const holiSet = new Set(b.holidays.map((h) => h.date));
  const names = Array.from(new Set(b.calendar.map((e) => e.name)));
  const cols = `160px repeat(${days}, minmax(30px,1fr))`;
  const iso = (d: number) => `${b.year}-${String(b.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const isWe = (d: number) => { const wd = new Date(b.year, b.month - 1, d).getDay(); return wd === 0 || wd === 6; };

  let head = `<div class="cal-h" style="background:var(--card)"></div>`;
  for (let d = 1; d <= days; d++) {
    head += `<div class="cal-h ${isWe(d) ? 'we' : ''} ${holiSet.has(iso(d)) ? 'cf' : ''}">${d}</div>`;
  }
  let rows = '';
  for (const nm of names) {
    rows += `<div class="cal-name"><div class="avatar" style="background:${colorFor(nm)};width:24px;height:24px;font-size:9px">${initials(nm)}</div>${esc(shortName(nm))}</div>`;
    for (let d = 1; d <= days; d++) {
      const date = iso(d);
      const ev = b.calendar.find((e) => e.name === nm && e.start <= date && e.end >= date);
      if (ev) {
        const pending = ev.status !== 'approved';
        const style = pending
          ? `background:#9AA4AE;opacity:.6;border:1px dashed #fff`
          : `background:${blockColor(ev.type_code)}`;
        rows += `<div class="cal-c ${isWe(d) ? 'we' : ''}"><div class="cal-blk" style="${style}">${ev.type_code[0].toUpperCase()}</div></div>`;
      } else {
        rows += `<div class="cal-c ${isWe(d) ? 'we' : ''}"></div>`;
      }
    }
  }
  return `<div class="cal-grid" style="grid-template-columns:${cols};min-width:${160 + days * 30}px">${head}${rows}</div>`;
}
function calTitle(b: LeaveBoard): string {
  return `${new Date(b.year, b.month - 1, 1).toLocaleString('en', { month: 'long' })} ${b.year}`;
}

// ===================== Attendance (live + manual entry) =====================
function attKpis(b: LeaveBoard): string {
  const a = b.attendance;
  const withData = a.rows.filter((r) => r.days > 0);
  const avg = withData.length ? withData.reduce((s, r) => s + r.worked, 0) / withData.length : 0;
  const below = withData.filter((r) => r.worked < r.required).length;
  const k = (cls: string, lab: string, val: string, foot: string) =>
    `<div class="kpi ${cls}"><div class="acc"></div><div class="lab">${lab}</div><div class="val num">${val}</div><div class="foot">${esc(foot)}</div></div>`;
  return (
    k('k-blue', 'Logged today', String(a.logged_today), `of ${a.team_size} staff`) +
    k('k-navy', 'Hours this week', num(a.hours_week), a.week_label) +
    k('k-amber', 'Avg / person', withData.length ? num(avg) : '—', withData.length ? `over ${withData.length} with entries` : 'no entries yet') +
    k('k-amber', 'Below 48h', withData.length ? String(below) : '—', 'with entries this week')
  );
}
function attTable(b: LeaveBoard): string {
  const opts = b.team.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
  const entry = `<div class="cpad" style="padding:16px 20px;border-bottom:1px solid var(--line-2);display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;background:var(--line-2)">
    <div class="field" style="margin:0;min-width:170px"><label class="lab">Employee</label><select class="inp" id="atEmp">${opts}</select></div>
    <div class="field" style="margin:0;min-width:150px"><label class="lab">Date</label><input class="inp" id="atDate" type="date"></div>
    <div class="field" style="margin:0;width:110px"><label class="lab">Hours worked</label><input class="inp" id="atHours" type="number" min="0" max="24" step="0.5" placeholder="8"></div>
    <button class="btn btn-navy" type="button" id="atSave" onclick="recordAttendance()" style="margin-bottom:1px">Save entry</button>
  </div>`;
  const rows = b.attendance.rows.map((r) => {
    const pct = Math.max(0, Math.min(100, (r.worked / r.required) * 100));
    let chip: string; let bar: string;
    if (r.days === 0) { chip = `<span class="chip c-neutral"><span class="pip"></span>No entries</span>`; bar = 'var(--line)'; }
    else if (r.worked >= r.required) { chip = `<span class="chip c-good"><span class="pip"></span>Complete</span>`; bar = 'var(--green)'; }
    else { chip = `<span class="chip c-watch"><span class="pip"></span>${num(r.required - r.worked)}h short</span>`; bar = 'var(--amber)'; }
    return `<tr><td><div class="person"><div class="avatar" style="background:${colorFor(r.name)};width:30px;height:30px;font-size:11px">${initials(r.name)}</div><div><div class="pn">${esc(r.name)}</div><div class="pr">${esc(r.designation || '')}</div></div></div></td><td class="num">${r.days}</td><td class="num">${num(r.worked)}</td><td class="num">${r.required}</td><td><div class="bar"><span style="width:${pct.toFixed(0)}%;background:${bar}"></span></div></td><td>${chip}</td></tr>`;
  }).join('');
  return `${entry}<table><thead><tr><th>Employee</th><th>Days logged</th><th>Worked (h)</th><th>Required</th><th style="width:160px">Progress</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ===================== Payroll =====================
function payrollRows(b: LeaveBoard): string {
  if (!b.payroll.length) {
    return `<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--muted);font-size:13px">No payroll figures for your access level.</td></tr>`;
  }
  return b.payroll.map((p) => {
    const ded = p.unpaid > 0 ? `<span style="color:var(--red)">${num(p.unpaid)} unpaid day${p.unpaid === 1 ? '' : 's'}</span>` : '—';
    return `<tr><td><div class="person"><div class="avatar" style="background:${colorFor(p.name)}">${initials(p.name)}</div><div class="pn" style="font-size:13px">${esc(p.name)}</div></div></td><td class="num">${p.working_days}</td><td class="num">${p.present}</td><td class="num">${num(p.paid_leave)}</td><td class="num">${num(p.unpaid)}</td><td class="num">${num(p.worked_hours)}</td><td class="num">${ded}</td></tr>`;
  }).join('');
}

// ===================== Viewer identity =====================
function personaOf(b: LeaveBoard): string {
  if (b.viewer.is_super || b.viewer.role === 'ceo') return 'ceo';
  if (b.viewer.role === 'manager' || b.viewer.role === 'team_lead') return 'lead';
  return 'employee';
}
function roleLabel(b: LeaveBoard): string {
  if (b.viewer.is_super) return 'Super Admin';
  switch (b.viewer.role) {
    case 'ceo': return 'CEO';
    case 'manager': return 'Department Head';
    case 'team_lead': return 'Team Lead';
    case 'hr_admin': return 'HR';
    case 'payroll': return 'Payroll';
    default: return 'Staff';
  }
}
function viewerIdentity(b: LeaveBoard): string {
  return `<span class="lbl" style="color:var(--slate)">Signed in as <b style="color:var(--ink)">${esc(b.viewer.name)}</b> · ${esc(roleLabel(b))}</span>
      <a class="btn btn-out btn-sm" href="/api/leave-auth" style="margin-left:10px">Sign out</a>`;
}

/** Replace every live token in the static HTML. Board may be null. */
export function fillTokens(html: string, d: LeaveDashboard | null, b: LeaveBoard | null): string {
  const map: Record<string, string> = {};
  if (d) {
    Object.assign(map, {
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
    });
  }
  if (b) {
    Object.assign(map, {
      '<!--PERSONA-->': personaOf(b),
      '<!--VIEWER_IDENTITY-->': viewerIdentity(b),
      '<!--APPLY_NAME-->': esc(b.viewer.name),
      '<!--APPLY_TYPE_OPTIONS-->': applyTypeOptions(b),
      '<!--APPLY_LADDER-->': applyLadder(b, d),
      '<!--APPLY_BALANCES-->': applyBalances(b),
      '<!--APPROVALS_QUEUE-->': approvalsQueue(b.approvals),
      '<!--APPROVALS_COUNT-->': String(b.approvals.length),
      '<!--APPROVALS_DATA-->': JSON.stringify(b.approvals.map((r) => ({
        id: r.request_id, name: r.name, type: r.type_name, days: r.days,
        range: `${r.start} – ${r.end}`, reason: r.reason || 'No reason given.',
        ladder: ladderHtml(r.ladder),
      }))).replace(/</g, '\\u003c'),
      '<!--CAL_TITLE-->': esc(calTitle(b)),
      '<!--CALENDAR-->': calendarGrid(b),
      '<!--ATT_KPIS-->': attKpis(b),
      '<!--ATT_TABLE-->': attTable(b),
      '<!--PAYROLL_PERIOD-->': esc(b.payroll_period),
      '<!--PAYROLL_ROWS-->': payrollRows(b),
    });
  } else {
    const unavailable = '<div style="padding:30px;text-align:center;color:var(--muted)">Unavailable — could not reach the server.</div>';
    Object.assign(map, {
      '<!--PERSONA-->': 'employee', '<!--VIEWER_IDENTITY-->': '',
      '<!--APPLY_NAME-->': '', '<!--APPLY_TYPE_OPTIONS-->': '', '<!--APPLY_LADDER-->': '',
      '<!--APPLY_BALANCES-->': '<p class="hint">Balances unavailable.</p>',
      '<!--APPROVALS_QUEUE-->': approvalsQueue([]), '<!--APPROVALS_COUNT-->': '0',
      '<!--APPROVALS_DATA-->': '[]',
      '<!--CAL_TITLE-->': '', '<!--CALENDAR-->': unavailable,
      '<!--ATT_KPIS-->': '', '<!--ATT_TABLE-->': unavailable,
      '<!--PAYROLL_PERIOD-->': '', '<!--PAYROLL_ROWS-->': '<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--muted)">Unavailable.</td></tr>',
    });
  }
  let out = html;
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
  return out;
}
