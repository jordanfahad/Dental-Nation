import 'server-only';
import { OPS_ALERT_FROM } from '@/config/ops';
import { emailConfigured, sendEmail } from '@/lib/notify/email';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { BRANCH_LABEL, DENTISTS, LANES, LANG_LABEL, laneFor, langsFor } from '@/lib/smileclub/scripts';
import { SHOOT_PLAN, SLOT_STATUS, WARDROBE, dentistById, hoursOn, nextClinicDays, shootLoad } from '@/lib/smileclub/shoots';
import { REVIEWERS, reviewFor, type ReviewEntry, type ReviewerId } from '@/lib/smileclub/review';
import { loadCorp, loadReviews } from '@/lib/smileclub/tracker';
import { video2 } from '@/lib/smileclub/creative';
import type { CorpState } from '@/lib/smileclub/corporate';
import { buildMetaLeadsDigest, metaSectionHtml, type MetaLeadsDigest } from '@/lib/ops/metaLeadsDigest';
import { CONTENTOS_LEADS, contentosFlags, contentosStatsHtml, fetchContentos, type ContentosLeads } from '@/lib/ops/contentosLeads';
import { OWNER_LABEL, TEAM_TASKS, TOTAL_WEIGHT, TRACKER_SOURCE, type Person, type TeamTask } from '@/lib/smileclub/team';

/**
 * Smile Club email alerts — at most TWO emails per person per day (26 Sep).
 * Run from the 15-minute sync cron. Nothing is emailed the moment it happens:
 * scripts sent for sign-off, approvals, change requests, final approvals,
 * tasks flagged "blocked" and review comments show on the dashboard at once
 * and go into the person's next email.
 *
 *   09:00  Morning briefing — ONE email per person with only what applies to
 *          them: Meta leads red flags from ContentOS Lead Analysis (read live
 *          at send time) plus the ad and tracker checks (Dr Luvi to act;
 *          Mr Akbar, Ms Shadi, Fahad aware); scripts waiting on their approval (Ms Shadi, Dr Luvi,
 *          Gautam); their tasks and completion score (Gautam, Dr Luvi, Mohan,
 *          Fahad); the whole team's status (Mr Akbar, Fahad); what happened
 *          since yesterday. Sent 09:00–10:59; skipped when there is nothing.
 *   17:00  Evening email — the evening before a shoot: tomorrow's schedule to
 *          MJ with the team copied, including who still has to approve which
 *          dentist and what happened since the morning. Other evenings: a
 *          short update only to someone with something new to act on since the
 *          morning. Sent 17:00–21:59; at most one per person.
 *
 * Hard cap: every send drops any address that already had that slot's email
 * or two alert emails today (lane_e.sc_alert_log), so re-runs, retries or a
 * future alert can never take anyone past two a day.
 *
 * Addresses: env SC_EMAIL_<KEY> (KEY = FAHAD, AKBAR, LUVI, GAUTAM, SHADI, MJ,
 * MOHAN), then lane_e.app_secrets `sc_email_<key>` (for personal addresses
 * that must not sit in this public repo), then the work defaults below.
 */

type Who = 'fahad' | 'akbar' | 'luvi' | 'gautam' | 'shadi' | 'mj' | 'mohan';

const DEFAULTS: Record<Who, string> = {
  fahad: 'fa.siddiqui@dentalnation.com',
  akbar: 'am@dentalnation.com',
  luvi: 'lu.kaprani@dentalnation.com',
  gautam: 'gautam.n@dentalnation.com',
  mj: 'mj.torreta@dentalnation.com',
  shadi: 'sh.gheitasi@dentalnation.com',
  mohan: '', // personal address kept out of this public repo — stored in lane_e.app_secrets (sc_email_mohan)
};
const NAME: Record<Who, string> = { fahad: 'Fahad', akbar: 'Mr Akbar', luvi: 'Dr Luvi', gautam: 'Gautam', shadi: 'Ms Shadi', mj: 'MJ', mohan: 'Mohan' };

/** Addresses stored in the database (loaded once per run). */
let STORED: Record<string, string> = {};
export async function loadStoredEmails(sb: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const { data } = await sb.from('app_secrets').select('key,value').like('key', 'sc_email_%');
  STORED = Object.fromEntries((data ?? []).map((r) => [(r.key as string).slice(9), (r.value as string).trim()]));
}

export function emailOf(w: Who): string | null {
  const k = w.toUpperCase();
  return process.env[`SC_EMAIL_${k}`]?.trim() || process.env[`SC_REVIEW_EMAIL_${k}`]?.trim() || STORED[w] || DEFAULTS[w] || null;
}

/** Who hears about a task owner's work (receptionists' and dentists' tasks are updated by Dr Luvi; CRM-DN's by Fahad). */
const WHO_OF: Record<Person, Who> = { fahad: 'fahad', gautam: 'gautam', luvi: 'luvi', mohan: 'mohan', reception: 'luvi', doctors: 'luvi', crm: 'fahad' };

type Owner = 'gautam' | 'luvi' | 'mohan' | 'fahad';
const OWNERS: Owner[] = ['gautam', 'luvi', 'mohan', 'fahad'];
const PERSON_SCOPE: Record<Owner, Person[]> = { gautam: ['gautam'], luvi: ['luvi', 'reception', 'doctors'], mohan: ['mohan'], fahad: ['fahad', 'crm'] };
const isOwner = (w: Who): w is Owner => (OWNERS as Who[]).includes(w);
const isReviewer = (w: Who): w is ReviewerId => w === 'shadi' || w === 'luvi' || w === 'gautam';

/** Who gets the Meta leads section (Dr Luvi acts; the others are aware). */
const META_READERS: Who[] = ['luvi', 'akbar', 'shadi', 'fahad'];
const MORNING: Who[] = ['akbar', 'luvi', 'shadi', 'gautam', 'mohan', 'fahad'];
const EVENING: Who[] = ['fahad', 'luvi', 'shadi', 'gautam', 'mohan'];
const SHOOT_CC: Who[] = ['luvi', 'akbar', 'shadi', 'gautam', 'fahad', 'mohan'];
const MAX_PER_DAY = 2;

const LINK = 'https://reports.dentalnation.com/?tab=smileclub';
const RED = '#a04a38';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const dubai = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(d);
const dubaiHour = (d = new Date()) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', hour12: false }).format(d));
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const fmtDay = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`; };
const fmtAt = (at: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(at));
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
/** A quoted note, without its own trailing full stop (the sentence adds one). */
const quote = (s: string, max = 280) => `“${esc(s.trim().replace(/[.。]+$/, '').slice(0, max))}${s.trim().length > max ? '…' : ''}”`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const CAP_NOTE = 'You get at most two Smile Club emails a day: the 09:00 morning briefing and, only when needed, one evening email (tomorrow’s shoot, or something new for you to act on). Sign-off decisions and blocked tasks no longer arrive as separate emails — they are on the dashboard at once and in your next email.';

const shell = (title: string, body: string) => `<div style="font-family:Arial,sans-serif;font-size:14px;color:#244260;line-height:1.5;max-width:720px">
<p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#B45F53;font-weight:bold;margin:0">Smile Club · Dental Nation</p>
<h2 style="margin:4px 0 10px;font-size:18px">${esc(title)}</h2>${body}
<p style="margin-top:16px"><a href="${LINK}" style="color:#5793A3;font-weight:bold">Open the Smile Club plan → Team task calendar</a></p>
<p style="color:#767769;font-size:12px">${CAP_NOTE}</p></div>`;
const table = (head: string[], rows: string[][]) => `<table style="border-collapse:collapse;width:100%;font-size:13px;margin:6px 0 12px"><tr>${head.map((h) => `<th style="text-align:left;background:#F1F1EA;color:#767769;font-size:11px;text-transform:uppercase;padding:6px">${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td style="border-top:1px solid #E6E6DA;padding:6px;vertical-align:top">${c}</td>`).join('')}</tr>`).join('')}</table>`;
const h3 = (t: string, color = '#244260') => `<h3 style="font-size:15px;margin:20px 0 6px;color:${color};border-bottom:1px solid #E6E6DA;padding-bottom:4px">${t}</h3>`;
const h4 = (t: string, color = '#244260') => `<h4 style="font-size:13px;margin:10px 0 4px;color:${color}">${t}</h4>`;

type Sb = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

/* ── today's log: which slot emails each address already had ── */

type Slot = 'am' | 'pm';
interface DayLog { kinds: Set<string>; slot: Record<Slot, Set<string>>; count: Map<string, number> }
const slotOf = (kind: string): Slot | null => (kind.startsWith('am:') ? 'am' : kind.startsWith('pm:') || kind === 'shoot-tomorrow' ? 'pm' : null);
function mark(log: DayLog, s: Slot, addr: string) {
  const a = addr.toLowerCase();
  log.slot[s].add(a);
  log.count.set(a, (log.count.get(a) ?? 0) + 1);
}
async function dayLog(sb: Sb, today: string): Promise<DayLog> {
  const { data } = await sb.from('sc_alert_log').select('kind,ok,recipients').eq('day', today);
  const log: DayLog = { kinds: new Set(), slot: { am: new Set(), pm: new Set() }, count: new Map() };
  for (const r of data ?? []) {
    const kind = r.kind as string;
    log.kinds.add(kind);
    const s = slotOf(kind);
    if (s && r.ok) for (const a of (r.recipients as string[] | null) ?? []) mark(log, s, a);
  }
  return log;
}

async function send(to: Who[], cc: Who[], subject: string, html: string, cap?: { log: DayLog; slot: Slot }) {
  const held: string[] = [];
  const allowed = (a: string) => {
    if (!cap) return true;
    const k = a.toLowerCase();
    const fine = !cap.log.slot[cap.slot].has(k) && (cap.log.count.get(k) ?? 0) < MAX_PER_DAY;
    if (!fine) held.push(a);
    return fine;
  };
  const toE = [...new Set(to.map(emailOf).filter((x): x is string => !!x))].filter(allowed);
  const ccE = [...new Set(cc.map(emailOf).filter((x): x is string => !!x))].filter((x) => !toE.includes(x)).filter(allowed);
  const missing = [...to, ...cc].filter((w) => !emailOf(w)).map((w) => NAME[w]);
  const all = [...toE, ...ccE];
  if (!emailConfigured()) return { ok: false, recipients: all, note: 'email transport not configured' };
  if (!all.length) return { ok: false, recipients: all, note: held.length ? 'not sent — already had today’s email for this slot (two-a-day cap)' : 'no recipients on record' };
  // The shared sender takes one list; everyone is addressed directly (the "cc" people are named in the body).
  const r = await sendEmail({ to: all, subject, html, from: OPS_ALERT_FROM });
  if (r.ok && cap) for (const a of all) mark(cap.log, cap.slot, a);
  const note = [r.ok ? 'sent' : r.error ?? 'failed', missing.length ? `no address for ${missing.join(', ')}` : '', held.length ? `${held.length} held back by the two-a-day cap` : ''].filter(Boolean).join('; ');
  return { ok: r.ok, recipients: all, note };
}

async function logSent(sb: Sb, kind: string, day: string, r: { ok: boolean; recipients: string[]; note: string }) {
  await sb.from('sc_alert_log').upsert({ kind, day, ok: r.ok, recipients: r.recipients, note: r.note, sent_at: new Date().toISOString() }, { onConflict: 'kind,day' });
}

/* ── what every email is built from ── */

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

interface TaskEv { task: TeamTask; actor: string; status: string; note: string | null; at: string; from: number | null; to: number | null }

interface Ctx {
  /** The Dubai day the email is for. */
  today: string;
  /** Start of the "what happened" window. */
  since: string;
  p: Prog;
  reviews: ReviewEntry[];
  events: TaskEv[];
  meta: MetaLeadsDigest | null;
  /** ContentOS Lead Analysis (lead quality, follow-up, CRM gaps), read at send time. */
  contentos: ContentosLeads | null;
  corp: CorpState | null;
}

async function loadCtx(sb: Sb, today: string, since: string, withMeta: boolean): Promise<Ctx> {
  const p = await loadProgress(sb);
  const byId: Record<string, TeamTask> = {};
  for (const t of TEAM_TASKS) if (p[t.key]) byId[p[t.key].id] = t;
  const [reviews, ev, meta, contentos, corp] = await Promise.all([
    loadReviews(sb),
    sb.from('task_events').select('task_id,actor,status,note,at,from_stage,to_stage').gte('at', since).order('at'),
    withMeta ? buildMetaLeadsDigest(sb, today).catch(() => null) : Promise.resolve(null),
    withMeta ? fetchContentos() : Promise.resolve(null),
    loadCorp(sb).catch(() => null),
  ]);
  const events = (ev.data ?? []).filter((e) => byId[e.task_id as string]).map((e) => ({
    task: byId[e.task_id as string], actor: (e.actor as string) ?? '', status: (e.status as string) ?? '', note: (e.note as string | null) ?? null,
    at: e.at as string, from: (e.from_stage as number | null) ?? null, to: (e.to_stage as number | null) ?? null,
  }));
  return { today, since, p, reviews, events, meta, contentos, corp };
}

const isDone = (t: TeamTask, p: Prog) => (p[t.key]?.stage ?? 0) >= t.steps.length || p[t.key]?.status === 'done';
const frac = (t: TeamTask, p: Prog) => Math.min(1, (p[t.key]?.stage ?? 0) / t.steps.length);
const notDoneNeeds = (t: TeamTask, p: Prog) => (t.needs ?? []).map((k) => TEAM_TASKS.find((x) => x.key === k)).filter((n): n is TeamTask => !!n && !isDone(n, p));

/** Dentists filming in the next 7 days → their first slot. */
function filmingSoon(today: string) {
  const soon = new Map<string, { iso: string; time: string; branch: string }>();
  for (const d of SHOOT_PLAN) {
    if (d.iso < today || d.iso > addDays(today, 7)) continue;
    for (const st of d.stops) for (const sl of st.slots) if (!soon.has(sl.id)) soon.set(sl.id, { iso: d.iso, time: sl.time, branch: BRANCH_LABEL[st.branch] });
  }
  return soon;
}
const whenFilm = (today: string, f: { iso: string; time: string; branch: string }) => `${f.iso === today ? '<b style="color:#a04a38">today</b>' : f.iso === addDays(today, 1) ? '<b style="color:#a04a38">tomorrow</b>' : esc(fmtDay(f.iso))} ${esc(f.time)} · ${esc(f.branch)}`;

/* ── things that happened: one line each, with who should hear and who has to act ── */

interface Happen { at: string; html: string; aud: Set<Who>; act: Set<Who>; shared: boolean }

function happenings(ctx: Ctx): Happen[] {
  const since = Date.parse(ctx.since);
  const out: Happen[] = [];
  const reviewersBut = (x?: string) => REVIEWERS.map((r) => r.id).filter((id) => id !== x) as Who[];
  const name = (id: string) => DENTISTS.find((d) => d.id === id)?.name ?? id;
  const recent = ctx.reviews.filter((e) => Date.parse(e.at) >= since);

  // Scripts sent for sign-off — one line per batch.
  const batches = new Map<string, ReviewEntry[]>();
  for (const e of recent.filter((x) => x.decision === 'sent')) {
    const k = `${e.at.slice(0, 16)}|${e.actor}`;
    batches.set(k, [...(batches.get(k) ?? []), e]);
  }
  for (const b of batches.values()) {
    const act = new Set<Who>();
    for (const e of b) {
      const d = DENTISTS.find((x) => x.id === e.dentistId);
      if (!d) continue;
      const st = reviewFor(d, ctx.reviews);
      for (const r of REVIEWERS) if (st.per[r.id].state === 'pending' || st.per[r.id].state === 'stale') act.add(r.id);
    }
    out.push({ at: b[0].at, html: `Fahad sent <b>${esc(b.map((e) => name(e.dentistId)).join(', '))}</b>’s scripts for final approval (Ms Shadi, Dr Luvi, Gautam).`, aud: new Set<Who>(['akbar', 'shadi', 'luvi', 'gautam']), act, shared: true });
  }
  // Decisions and inputs.
  for (const e of recent.filter((x) => x.decision !== 'sent')) {
    const who = e.reviewer === 'fahad' ? 'Fahad' : REVIEWERS.find((r) => r.id === e.reviewer)?.name ?? e.actor;
    const verb = e.decision === 'approved' ? 'approved' : e.decision === 'changes' ? 'asked for changes to' : 'added input on';
    const note = e.note && e.decision !== 'approved' ? `: ${quote(e.note)}` : '';
    const aud = new Set<Who>(['fahad', 'akbar', ...reviewersBut(e.reviewer)]);
    out.push({ at: e.at, html: `<b>${esc(who)}</b>${e.actor.includes('by email') ? ' (by email)' : ''} ${verb} <b>${esc(name(e.dentistId))}</b>’s scripts${note}.`, aud, act: new Set<Who>(['fahad']), shared: true });
  }
  // Final approvals (the approval that completed the set falls in the window).
  for (const d of DENTISTS) {
    const st = reviewFor(d, ctx.reviews);
    if (!st.final) continue;
    const last = Math.max(...REVIEWERS.map((r) => Date.parse(st.per[r.id].last?.at ?? '1970-01-01T00:00:00Z')));
    if (last < since) continue;
    out.push({ at: new Date(last).toISOString(), html: `<b style="color:#2C5E3F">FINAL</b> — <b>${esc(d.name)}</b>’s scripts are approved by Ms Shadi, Dr Luvi and Gautam: cleared to film and send.`, aud: new Set<Who>(['fahad', 'akbar', 'shadi', 'luvi', 'gautam', 'mohan']), act: new Set<Who>(['fahad']), shared: true });
  }
  // Tasks flagged blocked (still blocked now), completed, or commented on.
  const seenBlocked = new Set<string>();
  for (const e of ctx.events) {
    const t = e.task;
    const owner = WHO_OF[t.who];
    if (e.status === 'blocked' && ctx.p[t.key]?.status === 'blocked' && !seenBlocked.has(t.key)) {
      seenBlocked.add(t.key);
      const waits = notDoneNeeds(t, ctx.p);
      const waitWho = waits.map((n) => WHO_OF[n.who]);
      out.push({
        at: e.at,
        html: `<b>${esc(e.actor)}</b> flagged <b>${esc(t.task)}</b> (${esc(OWNER_LABEL[t.who])}, due ${esc(t.due)}) <b style="color:#a04a38">blocked</b>${e.note ? `: ${quote(e.note)}` : ''}${waits.length ? ` — waiting on ${esc(waits.map((n) => `${OWNER_LABEL[n.who]}: ${n.task}`).join('; '))}` : ''}.`,
        aud: new Set<Who>(['fahad', 'akbar', owner, ...waitWho]),
        act: new Set<Who>(['fahad', ...waitWho]),
        shared: true,
      });
    } else if (e.to !== null && e.to >= t.steps.length && (e.from ?? 0) < t.steps.length) {
      const unblocks = TEAM_TASKS.filter((x) => (x.needs ?? []).includes(t.key) && !isDone(x, ctx.p));
      out.push({
        at: e.at,
        html: `<b>${esc(e.actor)}</b> completed <b>${esc(t.task)}</b> (${esc(OWNER_LABEL[t.who])})${unblocks.length ? ` — unblocks ${esc(unblocks.map((x) => `${OWNER_LABEL[x.who]}: ${x.task}`).join('; '))}` : ''}.`,
        aud: new Set<Who>(['fahad', 'akbar', owner, ...unblocks.map((x) => WHO_OF[x.who])]),
        act: new Set<Who>(unblocks.map((x) => WHO_OF[x.who])),
        shared: true,
      });
    } else if (e.status === 'comment' && e.note) {
      out.push({
        at: e.at,
        html: `<b>${esc(e.actor)}</b> commented on <b>${esc(t.task)}</b>: ${quote(e.note, 400)}.`,
        aud: new Set<Who>([owner, 'fahad']),
        act: new Set<Who>([owner]),
        shared: false,
      });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

const happenList = (hs: Happen[], max = 14) => `<ul style="margin:4px 0 12px;padding-left:18px">${hs.slice(0, max).map((h) => `<li style="margin-bottom:4px"><span style="color:#767769">${esc(fmtAt(h.at))}</span> · ${h.html}</li>`).join('')}</ul>${hs.length > max ? `<p style="color:#767769">+ ${hs.length - max} more on the dashboard.</p>` : ''}`;

/* ── sections ── */

function approvalsWaiting(ctx: Ctx, r: ReviewerId) {
  const sentIds = new Set(ctx.reviews.filter((e) => e.decision === 'sent').map((e) => e.dentistId));
  const soon = filmingSoon(ctx.today);
  return DENTISTS.filter((d) => sentIds.has(d.id) || soon.has(d.id))
    .map((d) => ({ d, st: reviewFor(d, ctx.reviews), film: soon.get(d.id) }))
    .filter((x) => x.st.per[r].state === 'pending' || x.st.per[r].state === 'stale')
    .sort((a, b) => (a.film?.iso ?? '9999').localeCompare(b.film?.iso ?? '9999') || a.d.name.localeCompare(b.d.name));
}

function approvalsHtml(ctx: Ctx, r: ReviewerId, list: ReturnType<typeof approvalsWaiting>) {
  const others = REVIEWERS.filter((x) => x.id !== r);
  return `<p>These dentists’ scripts need your final check and approval — the dentists filming first are at the top:</p>
${table(['Dentist', 'Filming', 'You', ...others.map((o) => esc(o.name))], list.map((x) => [
    `<b>${esc(x.d.name)}</b>`,
    x.film ? whenFilm(ctx.today, x.film) : '<span style="color:#767769">not scheduled yet</span>',
    x.st.per[r].state === 'stale' ? '<b style="color:#7a6420">wording changed since you approved — re-check</b>' : '<b style="color:#a04a38">waiting on you</b>',
    ...others.map((o) => (x.st.per[o.id].state === 'approved' ? '<span style="color:#2C5E3F">✓</span>' : x.st.per[o.id].state === 'changes' ? '<span style="color:#a04a38">changes asked</span>' : '<span style="color:#767769">pending</span>')),
  ]))}
<p style="color:#767769">Approve on the dashboard: Smile Club → Dentist scripts → the dentist → <b>Approve (final)</b>. If a dentist is not approved before the slot, they are filmed on their backup day.</p>`;
}

function taskStatus(ctx: Ctx, who: Owner) {
  const { p, today } = ctx;
  const inScope = (t: TeamTask) => PERSON_SCOPE[who].includes(t.who);
  const own = TEAM_TASKS.filter((t) => t.who === who);
  const w = own.reduce((a, t) => a + t.weight, 0);
  const score = w ? Math.round((own.reduce((a, t) => a + t.weight * frac(t, p), 0) / w) * 100) : 0;
  const planned = w ? Math.round((own.filter((t) => t.dueIso <= today).reduce((a, t) => a + t.weight, 0) / w) * 100) : 0;
  const open = TEAM_TASKS.filter((t) => inScope(t) && !isDone(t, p));
  return {
    own, score, planned,
    share: Math.round((w / TOTAL_WEIGHT) * 100),
    done: own.filter((t) => isDone(t, p)).length,
    dueToday: open.filter((t) => t.dueIso === today),
    overdue: open.filter((t) => t.dueIso < today).sort((a, b) => a.dueIso.localeCompare(b.dueIso)),
    blocked: open.filter((t) => p[t.key]?.status === 'blocked'),
    waitingOnOthers: open.filter((t) => t.dueIso <= addDays(today, 7)).map((t) => ({ t, n: notDoneNeeds(t, p).filter((x) => !inScope(x)) })).filter((x) => x.n.length),
    othersWaiting: TEAM_TASKS.filter((t) => !isDone(t, p) && !inScope(t) && t.dueIso <= addDays(today, 7)).map((t) => ({ t, n: notDoneNeeds(t, p).filter(inScope) })).filter((x) => x.n.length),
    next: open.filter((t) => t.dueIso > today && t.dueIso <= addDays(today, 3)),
  };
}

function tasksHtml(ctx: Ctx, who: Owner) {
  const { p, today } = ctx;
  const s = taskStatus(ctx, who);
  const sunday = dow(today) === 0;
  if (!s.dueToday.length && !s.overdue.length && !s.blocked.length && !s.othersWaiting.length && (sunday || !s.next.length)) return null;
  if (sunday && !s.dueToday.length) return null;
  const step = (t: TeamTask) => { const st = p[t.key]?.stage ?? 0; return st >= t.steps.length ? 'done' : `step ${st + 1} of ${t.steps.length}: ${t.steps[st].s}`; };
  const whoTag = (t: TeamTask) => (t.who === who ? '' : ` <span style="color:#767769">(${esc(OWNER_LABEL[t.who])})</span>`);
  const list = (ts: TeamTask[], extra?: (t: TeamTask) => string) => ts.length ? `<ul style="margin:4px 0 12px">${ts.map((t) => `<li><b>${esc(t.task)}</b>${whoTag(t)} — due ${esc(t.due)} · <span style="color:#767769">${esc(step(t))}</span>${extra ? extra(t) : ''}</li>`).join('')}</ul>` : '<p style="color:#767769">None.</p>';
  let extra = '';
  if (who === 'gautam' && ctx.corp) {
    const corp = ctx.corp;
    const todays = corp.events.filter((e) => dubai(new Date(e.startsAt)) === today);
    const byStage = (st: string) => corp.companies.filter((c) => c.stage === st).length;
    extra = `${h4('Companies')}<p>${corp.companies.length} in the pipeline · ${byStage('contacted')} contacted · ${byStage('meeting')} meetings · ${byStage('proposal')} proposals · ${byStage('signed')} signed · ${corp.companies.reduce((a, c) => a + c.members, 0)} members (target 24).${todays.length ? `<br><b>In today’s calendar:</b> ${esc(todays.map((e) => `${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' }).format(new Date(e.startsAt))} ${e.company ?? e.title}`).join(' · '))}` : ''}${corp.lastUpload ? '' : '<br><b>No calendar uploaded yet</b> — upload it on the Team tab so follow-ups are tracked.'}</p>`;
  }
  if (who === 'mohan') {
    const shoots = SHOOT_PLAN.filter((d) => d.iso === today || d.iso === addDays(today, 1));
    extra = `${h4('Shoots')}${shoots.length ? shoots.map((d) => `<p><b>${esc(d.label)}</b> — ${esc(d.stops.map((st) => `${BRANCH_LABEL[st.branch]}: ${st.slots.map((x) => `${x.time} ${dentistById(x.id).name}`).join(', ')}`).join('; '))}</p>`).join('') : '<p style="color:#767769">No shoot today or tomorrow.</p>'}`;
  }
  return {
    s,
    html: `<p style="font-size:15px"><b>Completion score: ${s.score}%</b> <span style="color:#767769">(planned by today: ${s.planned}% · ${s.done} of ${s.own.length} tasks done · your tasks are ${s.share}% of the programme)</span></p>
${h4('Due today', '#B45F53')}${list(s.dueToday)}
${h4('Overdue', RED)}${list(s.overdue, (t) => ` · <b style="color:#a04a38">${plural(daysBetween(t.dueIso, today), 'day')} late</b>`)}
${s.blocked.length ? `${h4('Flagged blocked')}${list(s.blocked)}` : ''}
${h4('Others waiting on you')}${s.othersWaiting.length ? `<ul>${s.othersWaiting.map((x) => `<li><b>${esc(OWNER_LABEL[x.t.who])}</b> — <i>${esc(x.t.task)}</i> (due ${esc(x.t.due)}) needs: ${esc(x.n.map((n) => n.task).join('; '))}</li>`).join('')}</ul>` : '<p style="color:#767769">Nobody.</p>'}
${h4('You are waiting on')}${s.waitingOnOthers.length ? `<ul>${s.waitingOnOthers.map((x) => `<li><i>${esc(x.t.task)}</i> (due ${esc(x.t.due)}) needs ${x.n.map((n) => `${esc(OWNER_LABEL[n.who])}: ${esc(n.task)} — ${n.dueIso < today ? '<b style="color:#a04a38">overdue, chase today</b>' : `due ${esc(n.due)}`}`).join('; ')}</li>`).join('')}</ul>` : '<p style="color:#767769">Nothing.</p>'}
${h4('Next 3 days')}${list(s.next)}
${extra}`,
  };
}

function teamHtml(ctx: Ctx) {
  const { today } = ctx;
  let overdue = 0;
  const rows = OWNERS.map((who) => {
    const s = taskStatus(ctx, who);
    overdue += s.overdue.length;
    const behind = s.score < s.planned;
    return [
      `<b>${esc(NAME[who])}</b>${who === 'luvi' ? '<br><span style="color:#767769;font-size:11px">+ receptionists, dentists</span>' : ''}`,
      `<b style="color:${behind ? RED : '#2C5E3F'}">${s.score}%</b> <span style="color:#767769">(plan ${s.planned}%)</span>`,
      String(s.dueToday.length),
      s.overdue.length ? `<b style="color:#a04a38">${s.overdue.length}</b><br><span style="color:#767769;font-size:11px">${esc(s.overdue.slice(0, 2).map((t) => `${t.task} (${daysBetween(t.dueIso, today)}d)`).join('; '))}${s.overdue.length > 2 ? ' …' : ''}</span>` : '0',
      s.blocked.length ? `<b style="color:#a04a38">${s.blocked.length}</b>` : '0',
      String(s.othersWaiting.length),
    ];
  });
  const soon = filmingSoon(today);
  const sentIds = new Set(ctx.reviews.filter((e) => e.decision === 'sent').map((e) => e.dentistId));
  const all = DENTISTS.map((d) => ({ d, st: reviewFor(d, ctx.reviews) }));
  const final = all.filter((x) => x.st.final).length;
  const inPlay = all.filter((x) => sentIds.has(x.d.id) || soon.has(x.d.id));
  const pendingBy = REVIEWERS.map((r) => `${r.name} ${inPlay.filter((x) => x.st.per[r.id].state === 'pending' || x.st.per[r.id].state === 'stale').length}`).join(' · ');
  const changes = all.filter((x) => Object.values(x.st.per).some((v) => v.state === 'changes')).length;
  const next = SHOOT_PLAN.find((d) => d.iso >= today);
  const corp = ctx.corp;
  return {
    overdue,
    final,
    html: `${table(['Person', 'Score', 'Due today', 'Overdue', 'Blocked', 'Others waiting on them'], rows)}
<p><b>Script sign-off:</b> ${final} of ${DENTISTS.length} dentists final · waiting on ${esc(pendingBy)}${changes ? ` · <b style="color:#a04a38">${plural(changes, 'dentist')} with changes asked</b>` : ''}.</p>
${next ? `<p><b>${next.iso === today ? 'Today’s shoot' : 'Next shoot'}:</b> ${esc(next.label)} — ${esc(next.stops.map((st) => `${BRANCH_LABEL[st.branch]}: ${st.slots.map((x) => `${x.time.split('–')[0]} ${dentistById(x.id).name}`).join(', ')}`).join('; '))}.</p>` : ''}
${corp ? `<p><b>Companies (Gautam):</b> ${corp.companies.length} in the pipeline · ${corp.companies.filter((c) => c.stage === 'signed').length} signed · ${corp.companies.reduce((a, c) => a + c.members, 0)} members (target 24).</p>` : ''}`,
  };
}

/* ── 09:00 — the morning briefing, one per person ── */

export function buildBriefing(ctx: Ctx, who: Who): { subject: string; html: string } | null {
  const parts: string[] = [];
  const bits: string[] = [];

  if ((ctx.meta || ctx.contentos) && META_READERS.includes(who)) {
    const m = ctx.meta;
    const c = ctx.contentos;
    // ContentOS first (follow-up and lead quality), then the ad and tracker checks; its bookings flag replaces the tracker's conversions flag.
    const flags = [...(c ? contentosFlags(c) : []), ...(m?.flags ?? []).filter((f) => !(c && f.includes('No conversions recorded')))];
    const n = flags.length;
    const intro = `${m ? `Yesterday (${esc(m.day)}): <b>${esc(m.headline)}</b>. ` : ''}${n ? (who === 'luvi'
      ? `<b style="color:#a04a38">${plural(n, 'red flag')} for your action</b> — please take them up with the team today.`
      : `<b style="color:#a04a38">${plural(n, 'red flag')}</b> — Dr Luvi has these as her actions today; shown so you are aware.`) : ''}`;
    const coHtml = c
      ? `${h4(`From ContentOS Lead Analysis${c.asOf ? ` · ${esc(c.asOf)}` : ''}`)}${contentosStatsHtml(c)}<p style="color:#767769;font-size:12px"><a href="${CONTENTOS_LEADS}" style="color:#5793A3;font-weight:bold">Open the ranked call list in ContentOS</a> — chat numbers open in the Zavis CRM.</p>${h4('Ads and the In-House Lead Tracker')}`
      : '<p style="color:#767769;font-size:12px">ContentOS could not be read this morning — the flags below come from the Meta ad data and the In-House Lead Tracker.</p>';
    parts.push(h3(`Meta leads — ${n ? plural(n, 'red flag') : 'no red flags'}`, n ? RED : '#244260') + metaSectionHtml(m, intro, flags, coHtml));
    if (n) bits.push(plural(n, 'lead red flag'));
  }
  if (isReviewer(who)) {
    const list = approvalsWaiting(ctx, who);
    if (list.length) {
      const urgent = list.filter((x) => x.film && x.film.iso <= addDays(ctx.today, 1)).length;
      parts.push(h3(`Scripts waiting on your approval — ${list.length}${urgent ? ` (${urgent} filming today or tomorrow)` : ''}`, urgent ? RED : '#244260') + approvalsHtml(ctx, who, list));
      bits.push(`${plural(list.length, 'script set')} to approve`);
    }
  }
  if (isOwner(who)) {
    const t = tasksHtml(ctx, who);
    if (t) {
      parts.push(h3(`Your Smile Club tasks — ${t.s.score}% done (plan ${t.s.planned}%)`) + t.html);
      if (t.s.dueToday.length) bits.push(`${t.s.dueToday.length} due today`);
      if (t.s.overdue.length) bits.push(`${t.s.overdue.length} overdue`);
      if (t.s.othersWaiting.length) bits.push(`${t.s.othersWaiting.length} waiting on you`);
    }
  }
  if (who === 'akbar' || who === 'fahad') {
    const t = teamHtml(ctx);
    parts.push(h3('Team status — Gautam, Dr Luvi, Mohan, Fahad') + t.html);
    if (who === 'akbar') bits.push(`team: ${t.overdue} overdue`, `${t.final}/${DENTISTS.length} scripts final`);
  }
  const hs = happenings(ctx).filter((h) => h.aud.has(who));
  if (hs.length) parts.push(h3('Since yesterday’s briefing') + happenList(hs));
  if (!parts.length) return null;

  const accountable = isOwner(who) && who !== 'fahad' ? ' Mr Akbar and Fahad see your status in their briefing.' : '';
  const body = `<p>Good morning ${esc(NAME[who])},</p><p style="color:#767769">Your one Smile Club briefing for ${esc(fmtDay(ctx.today))} — everything for you in one email.${accountable}</p>${parts.join('\n')}`;
  return { subject: `Morning briefing ${fmtDay(ctx.today)} — ${bits.length ? bits.join(' · ') : 'all on track'}`, html: shell(`${NAME[who]} — morning briefing`, body) };
}

/* ── 17:00 — the evening before a shoot: tomorrow's schedule (MJ, team copied) ── */

export function buildShootEmail(ctx: Ctx): { subject: string; html: string } | null {
  const tomorrow = addDays(ctx.today, 1);
  const day = SHOOT_PLAN.find((d) => d.iso === tomorrow);
  if (!day) return null;
  const rows: string[][] = [];
  const pendingOn: Record<ReviewerId, string[]> = { shadi: [], luvi: [], gautam: [] };
  let notFinal = 0;
  for (const st of day.stops) for (const sl of st.slots) {
    const d = dentistById(sl.id);
    const r = reviewFor(d, ctx.reviews);
    const load = shootLoad(d, sl.only);
    const missing = REVIEWERS.filter((x) => r.per[x.id].state !== 'approved');
    if (!r.final) { notFinal++; for (const x of missing) pendingOn[x.id].push(d.name); }
    rows.push([
      `<b style="color:#B45F53">${esc(sl.time)}</b>${sl.status ? `<br><span style="font-size:11px;color:${sl.status === 'confirmed' ? '#2C5E3F' : '#7a6420'}">${esc(SLOT_STATUS[sl.status])}</span>` : ''}`,
      `<b>${esc(d.name)}</b><br><span style="color:#767769">${esc(d.title)}${sl.note ? ` · ${esc(sl.note)}` : ''}</span>`,
      esc(BRANCH_LABEL[st.branch]),
      esc(hoursOn(d.id, day.iso) ?? '—'),
      `${esc(sl.only ? `Video 2 only — ${video2(d.id)?.name ?? LANES[laneFor(d)].name}` : `Smile Club + ${video2(d.id)?.name ?? LANES[laneFor(d)].name}`)}<br><span style="color:#767769">${esc(langsFor(d).map((l) => LANG_LABEL[l].split(' · ').pop()!).join(' + '))} · ≈${load.minutes} min</span>`,
      r.final ? '<b style="color:#2C5E3F">Approved ✓</b>' : `<b style="color:#a04a38">Waiting on ${esc(missing.map((x) => x.name).join(', '))}</b><br><span style="color:#767769;font-size:11px">backup: ${esc(nextClinicDays(d.id, day.iso).join(' or ') || 'to agree')}</span>`,
    ]);
  }
  const n = rows.length;
  const where = day.stops.map((s) => BRANCH_LABEL[s.branch]).join(' → ');
  const approvals = notFinal
    ? `<p style="background:#FBEFEC;padding:8px;border-radius:6px"><b>Approvals still needed tonight:</b> ${esc(REVIEWERS.filter((x) => pendingOn[x.id].length).map((x) => `${x.name} — ${pendingOn[x.id].join(', ')}`).join(' · '))}. Please approve on the dashboard this evening (Smile Club → Dentist scripts → Approve (final)); a dentist not approved by their slot is filmed on the backup day.</p>`
    : '<p style="color:#2C5E3F"><b>All scripts for tomorrow are approved.</b></p>';
  const hs = happenings(ctx).filter((h) => h.shared);
  const subject = `Tomorrow’s Smile Club shoot — ${day.label} · ${where} · ${plural(n, 'dentist')}${notFinal ? ` · ${notFinal} not yet approved` : ''}`;
  const body = `<p>Hi MJ,</p><p>Here is tomorrow’s Smile Club filming schedule. As shoot coordinator, please confirm each slot with the dentist, make sure it is blocked in their diary, and tell the branch desk Mohan is coming. Mohan arrives 15 minutes before the first slot.</p>
${table(['Time', 'Dentist', 'Clinic', 'In clinic', 'What is filmed', 'Scripts'], rows)}
${approvals}
${tomorrow < WARDROBE.arrives ? `<p style="background:#FDF9EC;padding:8px;border-radius:6px"><b>Wardrobe:</b> ${esc(WARDROBE.note)}</p>` : '<p><b>Wardrobe:</b> well-fitting DN scrubs or the DN-branded lab coat.</p>'}
${hs.length ? `${h3('Also since this morning')}${happenList(hs, 10)}` : ''}
<p style="color:#767769">Copied: Dr Luvi, Mr Akbar, Ms Shadi, Gautam, Fahad${emailOf('mohan') ? ', Mohan' : ''} — for them this is today’s evening email.</p>`;
  return { subject, html: shell(`Tomorrow’s shoot — ${day.label}`, body) };
}

/* ── 17:00 on other evenings — only for someone with something new to act on ── */

export function buildEvening(ctx: Ctx, who: Who): { subject: string; html: string } | null {
  const hs = happenings(ctx).filter((h) => h.act.has(who));
  if (!hs.length) return null;
  const body = `<p>Good evening ${esc(NAME[who])},</p><p>New since this morning’s briefing, for you to act on:</p>${happenList(hs, 20)}`;
  return { subject: `Evening update ${fmtDay(ctx.today)} — ${plural(hs.length, 'new item')} for you`, html: shell(`${NAME[who]} — evening update`, body) };
}

/* ── the cron entry point ── */

const morningSince = (today: string) => `${addDays(today, -1)}T09:00:00+04:00`;
const eveningSince = (today: string) => `${today}T09:00:00+04:00`;

async function runMorning(sb: Sb, today: string, out: string[]) {
  const log = await dayLog(sb, today);
  const due = MORNING.filter((w) => !log.kinds.has(`am:${w}`));
  if (!due.length) return;
  const ctx = await loadCtx(sb, today, morningSince(today), true);
  for (const who of due) {
    try {
      const m = buildBriefing(ctx, who);
      if (!m) continue; // nothing for them yet — looked at again on the next run until 10:59
      const r = await send([who], [], m.subject, m.html, { log, slot: 'am' });
      await logSent(sb, `am:${who}`, today, r);
      out.push(`am:${who}: ${r.note}`);
    } catch (e) {
      out.push(`am:${who}: failed — ${(e as Error).message}`);
    }
  }
}

async function runEvening(sb: Sb, today: string, out: string[]) {
  const log = await dayLog(sb, today);
  const needShoot = !log.kinds.has('shoot-tomorrow');
  const due = EVENING.filter((w) => !log.kinds.has(`pm:${w}`));
  if (!needShoot && !due.length) return;
  const ctx = await loadCtx(sb, today, eveningSince(today), false);
  if (needShoot) {
    const m = buildShootEmail(ctx);
    if (m) {
      const r = await send(['mj'], SHOOT_CC, m.subject, m.html, { log, slot: 'pm' });
      await logSent(sb, 'shoot-tomorrow', today, r);
      out.push(`shoot-tomorrow: ${r.note}`);
    } else {
      await logSent(sb, 'shoot-tomorrow', today, { ok: true, recipients: [], note: 'no shoot tomorrow — nothing sent' });
    }
  }
  for (const who of due) {
    const a = emailOf(who)?.toLowerCase();
    if (!a || log.slot.pm.has(a)) continue; // already had this evening's email (e.g. the shoot email)
    try {
      const m = buildEvening(ctx, who);
      if (!m) continue;
      const r = await send([who], [], m.subject, m.html, { log, slot: 'pm' });
      await logSent(sb, `pm:${who}`, today, r);
      out.push(`pm:${who}: ${r.note}`);
    } catch (e) {
      out.push(`pm:${who}: failed — ${(e as Error).message}`);
    }
  }
}

export async function runSmileClubAlerts(): Promise<string[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return ['no db'];
  await loadStoredEmails(sb);
  const now = new Date();
  const today = dubai(now);
  const hour = dubaiHour(now);
  const out: string[] = [];
  if (hour >= 9 && hour < 11) await runMorning(sb, today, out);
  if (hour >= 17 && hour < 22) await runEvening(sb, today, out);
  return out;
}

/** What a sign-off or task action tells the user now that nothing is emailed instantly. */
export function nextEmailNote(): string {
  const h = dubaiHour();
  const when = h < 9 ? 'this morning’s 09:00 briefing' : h < 17 ? 'this evening’s email (from 17:00) or tomorrow’s 09:00 briefing' : 'tomorrow’s 09:00 briefing (or tonight’s email if they have not had one)';
  return `Saved — it shows on the dashboard now. No separate email: it goes into ${when}, so nobody gets more than two alert emails a day.`;
}

/** Preview any email to Fahad only (admin button). Previews are not counted toward anyone's two a day. */
export async function previewAlert(kind: string): Promise<string> {
  const sb = getSupabaseAdmin();
  if (!sb) return 'Tracking database unavailable.';
  await loadStoredEmails(sb);
  const today = dubai();
  let m: { subject: string; html: string } | null = null;
  if (kind === 'shoot') {
    m = buildShootEmail(await loadCtx(sb, today, eveningSince(today), false));
    if (!m) {
      const nextDay = SHOOT_PLAN.find((d) => d.iso > today);
      if (nextDay) { const eve = addDays(nextDay.iso, -1); m = buildShootEmail(await loadCtx(sb, eve, eveningSince(today), false)); }
    }
  } else if (kind.startsWith('am:') && (MORNING as string[]).includes(kind.slice(3))) {
    m = buildBriefing(await loadCtx(sb, today, morningSince(today), true), kind.slice(3) as Who);
  } else if (kind.startsWith('pm:') && (EVENING as string[]).includes(kind.slice(3))) {
    m = buildEvening(await loadCtx(sb, today, eveningSince(today), false), kind.slice(3) as Who);
  } else {
    return 'Unknown email.';
  }
  if (!m) return 'Nothing to send right now — this email would be skipped.';
  const r = await send(['fahad'], [], `[Preview] ${m.subject}`, m.html);
  return r.ok ? 'Preview emailed to Fahad.' : `Not sent: ${r.note}.`;
}
