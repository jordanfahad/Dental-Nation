import 'server-only';
import { OPS_ALERT_FROM } from '@/config/ops';
import { emailConfigured, sendEmail } from '@/lib/notify/email';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { BRANCH_LABEL, LANES, LANG_LABEL, laneFor, langsFor } from '@/lib/smileclub/scripts';
import { SHOOT_PLAN, WARDROBE, dentistById, hoursOn, nextClinicDays, shootLoad } from '@/lib/smileclub/shoots';
import { reviewFor } from '@/lib/smileclub/review';
import { loadCorp, loadReviews } from '@/lib/smileclub/tracker';
import { OWNER_LABEL, TASK_BY_KEY, TEAM_TASKS, TOTAL_WEIGHT, TRACKER_SOURCE, externalIdFor, type Person, type TeamTask } from '@/lib/smileclub/team';

/**
 * Smile Club scheduled email alerts (24 Sep). Run from the 15-minute sync
 * cron; each alert goes at most once per Dubai day (lane_e.sc_alert_log).
 *
 *   17:00  Tomorrow's shoot schedule → MJ; cc Dr Luvi, Mr Akbar, Ms Shadi,
 *          Gautam, Fahad (+ Mohan). Only when there is a shoot tomorrow.
 *   09:00  Personal status digests (Mon–Sat; Sunday only if something is due
 *          that day) → Gautam, Dr Luvi, Mohan; cc Mr Akbar and Fahad. Skipped
 *          when the person has nothing due, overdue, blocked or waiting.
 *   Event  A task flagged "blocked" → Fahad and the owners it waits on; cc owner.
 *
 * Addresses are env-overridable: SC_EMAIL_<KEY> (KEY = FAHAD, AKBAR, LUVI,
 * GAUTAM, SHADI, MJ, MOHAN). Ms Shadi's and Mohan's are not on record yet.
 */

type Who = 'fahad' | 'akbar' | 'luvi' | 'gautam' | 'shadi' | 'mj' | 'mohan';

const DEFAULTS: Record<Who, string> = {
  fahad: 'fa.siddiqui@dentalnation.com',
  akbar: 'am@dentalnation.com',
  luvi: 'lu.kaprani@dentalnation.com',
  gautam: 'gautam.n@dentalnation.com',
  mj: 'mj.torreta@dentalnation.com',
  shadi: '',
  mohan: '',
};
const NAME: Record<Who, string> = { fahad: 'Fahad', akbar: 'Mr Akbar', luvi: 'Dr Luvi', gautam: 'Gautam', shadi: 'Ms Shadi', mj: 'MJ', mohan: 'Mohan' };

export function emailOf(w: Who): string | null {
  const k = w.toUpperCase();
  return process.env[`SC_EMAIL_${k}`]?.trim() || process.env[`SC_REVIEW_EMAIL_${k}`]?.trim() || DEFAULTS[w] || null;
}

const PERSON_WHO: Partial<Record<Person, Who>> = { fahad: 'fahad', gautam: 'gautam', luvi: 'luvi', mohan: 'mohan' };

const LINK = 'https://reports.dentalnation.com/?tab=smileclub';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const dubai = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(d);
const dubaiHour = (d = new Date()) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', hour12: false }).format(d));
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const fmtDay = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`; };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

const shell = (title: string, body: string) => `<div style="font-family:Arial,sans-serif;font-size:14px;color:#244260;line-height:1.5;max-width:720px">
<p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#B45F53;font-weight:bold;margin:0">Smile Club · Dental Nation</p>
<h2 style="margin:4px 0 10px;font-size:18px">${esc(title)}</h2>${body}
<p style="margin-top:16px"><a href="${LINK}" style="color:#5793A3;font-weight:bold">Open the Smile Club plan → Team task calendar</a></p>
<p style="color:#767769;font-size:12px">Automatic alert from the Dental Nation performance dashboard.</p></div>`;
const table = (head: string[], rows: string[][]) => `<table style="border-collapse:collapse;width:100%;font-size:13px;margin:6px 0 12px"><tr>${head.map((h) => `<th style="text-align:left;background:#F1F1EA;color:#767769;font-size:11px;text-transform:uppercase;padding:6px">${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td style="border-top:1px solid #E6E6DA;padding:6px;vertical-align:top">${c}</td>`).join('')}</tr>`).join('')}</table>`;

async function send(to: Who[], cc: Who[], subject: string, html: string) {
  const toE = [...new Set(to.map(emailOf).filter((x): x is string => !!x))];
  const ccE = [...new Set(cc.map(emailOf).filter((x): x is string => !!x))].filter((x) => !toE.includes(x));
  const missing = [...to, ...cc].filter((w) => !emailOf(w)).map((w) => NAME[w]);
  const all = [...toE, ...ccE];
  if (!emailConfigured()) return { ok: false, recipients: all, note: 'email transport not configured' };
  if (!all.length) return { ok: false, recipients: all, note: 'no recipients on record' };
  // The shared sender takes one list; everyone is addressed directly (the "cc" people are named in the body).
  const r = await sendEmail({ to: all, subject, html, from: OPS_ALERT_FROM });
  return { ok: r.ok, recipients: all, note: r.ok ? (missing.length ? `sent; no address for ${missing.join(', ')}` : 'sent') : r.error ?? 'failed' };
}

type Sb = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

async function alreadySent(sb: Sb, kind: string, day: string) {
  const { data } = await sb.from('sc_alert_log').select('id').eq('kind', kind).eq('day', day).limit(1);
  return !!data?.length;
}
async function logSent(sb: Sb, kind: string, day: string, r: { ok: boolean; recipients: string[]; note: string }) {
  await sb.from('sc_alert_log').upsert({ kind, day, ok: r.ok, recipients: r.recipients, note: r.note, sent_at: new Date().toISOString() }, { onConflict: 'kind,day' });
}

async function loadProgress(sb: Sb) {
  const { data } = await sb.from('tasks').select('id,external_id,status,raw').eq('source', TRACKER_SOURCE);
  const progress: Record<string, { stage: number; status: string; id: string }> = {};
  for (const r of data ?? []) {
    const key = (r.external_id as string).replace(/^sc-team:/, '');
    progress[key] = { stage: Number((r.raw as { stage?: number } | null)?.stage ?? 0), status: (r.status as string) ?? 'open', id: r.id as string };
  }
  return progress;
}

type Prog = Awaited<ReturnType<typeof loadProgress>>;
const isDone = (t: TeamTask, p: Prog) => (p[t.key]?.stage ?? 0) >= t.steps.length || p[t.key]?.status === 'done';
const frac = (t: TeamTask, p: Prog) => Math.min(1, (p[t.key]?.stage ?? 0) / t.steps.length);
const notDoneNeeds = (t: TeamTask, p: Prog) => (t.needs ?? []).map((k) => TASK_BY_KEY[k]).filter((n): n is TeamTask => !!n && !isDone(n, p));

/* ── 17:00 — tomorrow's shoot schedule ── */

export async function buildShootEmail(sb: Sb, today: string) {
  const tomorrow = addDays(today, 1);
  const day = SHOOT_PLAN.find((d) => d.iso === tomorrow);
  if (!day) return null;
  const reviews = await loadReviews(sb);
  const rows: string[][] = [];
  const notFinal: string[] = [];
  for (const st of day.stops) for (const sl of st.slots) {
    const d = dentistById(sl.id);
    const r = reviewFor(d, reviews);
    const load = shootLoad(d, sl.only);
    if (!r.final) notFinal.push(`${d.name} (backup: ${nextClinicDays(d.id, day.iso).join(' or ') || 'to agree'})`);
    rows.push([
      `<b style="color:#B45F53">${esc(sl.time)}</b>`,
      `<b>${esc(d.name)}</b><br><span style="color:#767769">${esc(d.title)}</span>`,
      esc(BRANCH_LABEL[st.branch]),
      esc(hoursOn(d.id, day.iso) ?? '—'),
      `${esc(sl.only ? `Campaign video only — ${LANES[laneFor(d)].name}` : `Smile Club + ${LANES[laneFor(d)].name}`)}<br><span style="color:#767769">${esc(langsFor(d).map((l) => LANG_LABEL[l].split(' · ').pop()!).join(' + '))} · ≈${load.minutes} min</span>`,
      r.final ? '<b style="color:#2C5E3F">Approved ✓</b>' : '<b style="color:#a04a38">Not yet approved</b>',
    ]);
  }
  const n = rows.length;
  const where = day.stops.map((s) => BRANCH_LABEL[s.branch]).join(' → ');
  const subject = `Tomorrow’s Smile Club shoot — ${day.label} · ${where} · ${n} dentist${n === 1 ? '' : 's'}${notFinal.length ? ` · ${notFinal.length} not yet approved` : ''}`;
  const body = `<p>Hi MJ,</p><p>Here is tomorrow’s Smile Club filming schedule. Please make sure each dentist’s slot is blocked in their diary and the branch desk knows Mohan is coming. Mohan should arrive 15 minutes before the first slot.</p>
${table(['Time', 'Dentist', 'Clinic', 'In clinic', 'What is filmed', 'Scripts'], rows)}
${notFinal.length ? `<p style="background:#FBEFEC;padding:8px;border-radius:6px"><b>Not yet approved:</b> ${esc(notFinal.join('; '))}. Ms Shadi, Dr Luvi and Gautam — please approve tonight on the dashboard; otherwise the dentist is filmed on the backup day.</p>` : '<p style="color:#2C5E3F"><b>All scripts for tomorrow are approved.</b></p>'}
${tomorrow < WARDROBE.arrives ? `<p style="background:#FDF9EC;padding:8px;border-radius:6px"><b>Wardrobe:</b> ${esc(WARDROBE.note)}</p>` : '<p><b>Wardrobe:</b> well-fitting DN scrubs or the DN-branded lab coat.</p>'}
<p style="color:#767769">Copied: Dr Luvi, Mr Akbar, Ms Shadi, Gautam, Fahad${emailOf('mohan') ? ', Mohan' : ''}.</p>`;
  return { subject, html: shell(`Tomorrow’s shoot — ${day.label}`, body) };
}

/* ── 09:00 — personal status digests ── */

const PERSON_SCOPE: Record<'gautam' | 'luvi' | 'mohan', Person[]> = { gautam: ['gautam'], luvi: ['luvi', 'reception', 'doctors'], mohan: ['mohan'] };

export async function buildDigest(sb: Sb, who: 'gautam' | 'luvi' | 'mohan', today: string) {
  const p = await loadProgress(sb);
  const own = TEAM_TASKS.filter((t) => t.who === who);
  const scope = TEAM_TASKS.filter((t) => PERSON_SCOPE[who].includes(t.who));
  const w = own.reduce((a, t) => a + t.weight, 0);
  const score = w ? Math.round((own.reduce((a, t) => a + t.weight * frac(t, p), 0) / w) * 100) : 0;
  const planned = w ? Math.round((own.filter((t) => t.dueIso <= today).reduce((a, t) => a + t.weight, 0) / w) * 100) : 0;
  const share = Math.round((w / TOTAL_WEIGHT) * 100);
  const done = own.filter((t) => isDone(t, p)).length;
  const open = scope.filter((t) => !isDone(t, p));
  const dueToday = open.filter((t) => t.dueIso === today);
  const overdue = open.filter((t) => t.dueIso < today).sort((a, b) => a.dueIso.localeCompare(b.dueIso));
  const blocked = open.filter((t) => p[t.key]?.status === 'blocked');
  const waitingOnOthers = open.filter((t) => t.dueIso <= addDays(today, 7)).map((t) => ({ t, n: notDoneNeeds(t, p).filter((x) => !PERSON_SCOPE[who].includes(x.who)) })).filter((x) => x.n.length);
  const othersWaiting = TEAM_TASKS.filter((t) => !isDone(t, p) && !PERSON_SCOPE[who].includes(t.who) && t.dueIso <= addDays(today, 7))
    .map((t) => ({ t, n: notDoneNeeds(t, p).filter((x) => PERSON_SCOPE[who].includes(x.who)) })).filter((x) => x.n.length);
  const next = open.filter((t) => t.dueIso > today && t.dueIso <= addDays(today, 3));

  const sunday = dow(today) === 0;
  if (!dueToday.length && !overdue.length && !blocked.length && !othersWaiting.length && (sunday || !next.length)) return null;
  if (sunday && !dueToday.length) return null;

  const step = (t: TeamTask) => { const s = p[t.key]?.stage ?? 0; return s >= t.steps.length ? 'done' : `step ${s + 1} of ${t.steps.length}: ${t.steps[s].s}`; };
  const who2 = (t: TeamTask) => (t.who === who ? '' : ` <span style="color:#767769">(${esc(OWNER_LABEL[t.who])})</span>`);
  const list = (ts: TeamTask[], extra?: (t: TeamTask) => string) => ts.length ? `<ul style="margin:4px 0 12px">${ts.map((t) => `<li><b>${esc(t.task)}</b>${who2(t)} — due ${esc(t.due)} · <span style="color:#767769">${esc(step(t))}</span>${extra ? extra(t) : ''}</li>`).join('')}</ul>` : '<p style="color:#767769">None.</p>';

  let extra = '';
  if (who === 'gautam') {
    const corp = await loadCorp(sb);
    const todays = corp.events.filter((e) => dubai(new Date(e.startsAt)) === today);
    const byStage = (s: string) => corp.companies.filter((c) => c.stage === s).length;
    extra = `<h3 style="font-size:14px;margin:12px 0 4px">Companies</h3><p>${corp.companies.length} in the pipeline · ${byStage('contacted')} contacted · ${byStage('meeting')} meetings · ${byStage('proposal')} proposals · ${byStage('signed')} signed · ${corp.companies.reduce((a, c) => a + c.members, 0)} members (target 24).${todays.length ? `<br><b>In today’s calendar:</b> ${esc(todays.map((e) => `${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' }).format(new Date(e.startsAt))} ${e.company ?? e.title}`).join(' · '))}` : ''}${corp.lastUpload ? '' : '<br><b>No calendar uploaded yet</b> — upload it on the Team tab so follow-ups are tracked.'}</p>`;
  }
  if (who === 'mohan') {
    const shootsToday = SHOOT_PLAN.filter((d) => d.iso === today || d.iso === addDays(today, 1));
    const ids = Object.fromEntries(own.map((t) => [p[t.key]?.id, t]).filter(([id]) => id));
    const since = new Date(Date.now() - 36 * 3600_000).toISOString();
    const { data: ev } = Object.keys(ids).length ? await sb.from('task_events').select('task_id,actor,note,at').eq('status', 'comment').gte('at', since).in('task_id', Object.keys(ids)) : { data: [] };
    extra = `<h3 style="font-size:14px;margin:12px 0 4px">Shoots</h3>${shootsToday.length ? shootsToday.map((d) => `<p><b>${esc(d.label)}</b> — ${esc(d.stops.map((s) => `${BRANCH_LABEL[s.branch]}: ${s.slots.map((x) => `${x.time} ${dentistById(x.id).name}`).join(', ')}`).join('; '))}</p>`).join('') : '<p style="color:#767769">No shoot today or tomorrow.</p>'}
${(ev ?? []).length ? `<h3 style="font-size:14px;margin:12px 0 4px">New review comments on your tasks</h3><ul>${(ev ?? []).map((e) => `<li><b>${esc(e.actor as string)}</b> on <i>${esc((ids[e.task_id as string] as TeamTask).task)}</i>: ${esc((e.note as string) ?? '')}</li>`).join('')}</ul>` : ''}`;
  }

  const name = NAME[who];
  const subject = `${name} — Smile Club status ${fmtDay(today)}: ${score}% done (plan ${planned}%) · ${dueToday.length} due today · ${overdue.length} overdue${othersWaiting.length ? ` · ${othersWaiting.length} waiting on you` : ''}`;
  const body = `<p>Good morning ${esc(name)},</p>
<p style="font-size:15px"><b>Completion score: ${score}%</b> <span style="color:#767769">(planned by today: ${planned}% · ${done} of ${own.length} tasks done · your tasks are ${share}% of the programme)</span></p>
<h3 style="font-size:14px;margin:12px 0 4px;color:#B45F53">Due today</h3>${list(dueToday)}
<h3 style="font-size:14px;margin:12px 0 4px;color:#a04a38">Overdue</h3>${list(overdue, (t) => ` · <b style="color:#a04a38">${daysBetween(t.dueIso, today)} day${daysBetween(t.dueIso, today) === 1 ? '' : 's'} late</b>`)}
${blocked.length ? `<h3 style="font-size:14px;margin:12px 0 4px">Flagged blocked</h3>${list(blocked)}` : ''}
<h3 style="font-size:14px;margin:12px 0 4px">Others waiting on you</h3>${othersWaiting.length ? `<ul>${othersWaiting.map((x) => `<li><b>${esc(OWNER_LABEL[x.t.who])}</b> — <i>${esc(x.t.task)}</i> (due ${esc(x.t.due)}) needs: ${esc(x.n.map((n) => n.task).join('; '))}</li>`).join('')}</ul>` : '<p style="color:#767769">Nobody.</p>'}
<h3 style="font-size:14px;margin:12px 0 4px">You are waiting on</h3>${waitingOnOthers.length ? `<ul>${waitingOnOthers.map((x) => `<li><i>${esc(x.t.task)}</i> (due ${esc(x.t.due)}) needs ${x.n.map((n) => `${esc(OWNER_LABEL[n.who])}: ${esc(n.task)} — ${n.dueIso < today ? `<b style="color:#a04a38">overdue, chase today</b>` : `due ${esc(n.due)}`}`).join('; ')}</li>`).join('')}</ul>` : '<p style="color:#767769">Nothing.</p>'}
<h3 style="font-size:14px;margin:12px 0 4px">Next 3 days</h3>${list(next)}
${extra}
<p style="color:#767769">Update your steps on the Team task calendar as you finish them — this email is built from it. Copied: Mr Akbar, Fahad.</p>`;
  return { subject, html: shell(`${name} — today’s Smile Club status`, body) };
}

/* ── the cron entry point ── */

export async function runSmileClubAlerts(): Promise<string[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return ['no db'];
  const now = new Date();
  const today = dubai(now);
  const hour = dubaiHour(now);
  const out: string[] = [];
  if (hour === 17 && !(await alreadySent(sb, 'shoot-tomorrow', today))) {
    const m = await buildShootEmail(sb, today);
    if (m) {
      const r = await send(['mj'], ['luvi', 'akbar', 'shadi', 'gautam', 'fahad', 'mohan'], m.subject, m.html);
      await logSent(sb, 'shoot-tomorrow', today, r);
      out.push(`shoot-tomorrow: ${r.note}`);
    } else {
      await logSent(sb, 'shoot-tomorrow', today, { ok: true, recipients: [], note: 'no shoot tomorrow — nothing sent' });
    }
  }
  if (hour === 9) {
    for (const who of ['gautam', 'luvi', 'mohan'] as const) {
      const kind = `digest-${who}`;
      if (await alreadySent(sb, kind, today)) continue;
      const m = await buildDigest(sb, who, today);
      if (!m) { await logSent(sb, kind, today, { ok: true, recipients: [], note: 'nothing due, overdue or waiting — nothing sent' }); continue; }
      const r = await send([who], ['akbar', 'fahad'], m.subject, m.html);
      await logSent(sb, kind, today, r);
      out.push(`${kind}: ${r.note}`);
    }
  }
  return out;
}

/* ── event: a task flagged blocked ── */

export async function alertBlocked(task: TeamTask, note: string | null, actor: string) {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const p = await loadProgress(sb);
  const waits = notDoneNeeds(task, p);
  const to: Who[] = ['fahad', ...waits.map((n) => PERSON_WHO[n.who]).filter((x): x is Who => !!x)];
  const owner = PERSON_WHO[task.who];
  const html = shell(`Blocked: ${task.task}`, `<p><b>${esc(actor)}</b> flagged <b>${esc(task.task)}</b> (${esc(OWNER_LABEL[task.who])}, due ${esc(task.due)}) as blocked.</p>
${note ? `<blockquote style="border-left:3px solid #E1C96E;margin:8px 0;padding:4px 10px">${esc(note)}</blockquote>` : ''}
${waits.length ? `<p>It is waiting on: ${esc(waits.map((n) => `${OWNER_LABEL[n.who]} — ${n.task} (due ${n.due})`).join('; '))}.</p>` : ''}`);
  const r = await send(to, owner ? [owner] : [], `Blocked: ${task.task} — ${OWNER_LABEL[task.who]}`, html);
  await sb.from('sc_alert_log').insert({ kind: `blocked-${task.key}-${Date.now()}`, day: dubai(), ok: r.ok, recipients: r.recipients, note: r.note });
}

/** Preview any alert to Fahad only (admin button). */
export async function previewAlert(kind: 'shoot' | 'gautam' | 'luvi' | 'mohan'): Promise<string> {
  const sb = getSupabaseAdmin();
  if (!sb) return 'Tracking database unavailable.';
  const today = dubai();
  let m: { subject: string; html: string } | null = null;
  if (kind === 'shoot') {
    m = await buildShootEmail(sb, today);
    if (!m) {
      const nextDay = SHOOT_PLAN.find((d) => d.iso > today);
      if (nextDay) m = await buildShootEmail(sb, addDays(nextDay.iso, -1));
    }
  } else {
    m = await buildDigest(sb, kind, today);
  }
  if (!m) return 'Nothing to send today — this alert would be skipped.';
  const r = await send(['fahad'], [], `[Preview] ${m.subject}`, m.html);
  return r.ok ? 'Preview emailed to Fahad.' : `Not sent: ${r.note}.`;
}

