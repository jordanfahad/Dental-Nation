import 'server-only';
import { OPS_ALERT_FROM } from '@/config/ops';
import { emailConfigured, sendEmail } from '@/lib/notify/email';
import { DENTISTS } from '@/lib/smileclub/scripts';
import { REVIEWERS, reviewFor, type ReviewEntry, type ReviewerId } from '@/lib/smileclub/review';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Email alerts for the Smile Club script sign-off. Recipients are env-overridable
 * (SC_REVIEW_EMAIL_<SHADI|LUVI|GAUTAM|FAHAD>) so an address changes without a
 * deploy.
 */
const DEFAULTS: Record<ReviewerId | 'fahad', string> = {
  fahad: 'fa.siddiqui@dentalnation.com',
  luvi: 'lu.kaprani@dentalnation.com',
  gautam: 'gautam.n@dentalnation.com',
  shadi: 'sh.gheitasi@dentalnation.com',
};

export function reviewEmail(who: ReviewerId | 'fahad'): string | null {
  const env = process.env[`SC_REVIEW_EMAIL_${who.toUpperCase()}`]?.trim();
  return env || DEFAULTS[who] || null;
}

const LINK = 'https://reports.dentalnation.com/?tab=smileclub';

export interface MailOutcome { sent: boolean; to: string[]; missing: string[]; note: string }

async function mail(who: (ReviewerId | 'fahad')[], subject: string, body: string): Promise<MailOutcome> {
  const uniq = [...new Set(who)];
  const to = uniq.map(reviewEmail).filter((x): x is string => !!x);
  const missing = uniq.filter((w) => !reviewEmail(w)).map((w) => (w === 'fahad' ? 'Fahad' : REVIEWERS.find((r) => r.id === w)!.name));
  if (!emailConfigured()) return { sent: false, to, missing, note: 'Email is not switched on for the dashboard yet — the decision is saved; no email went out.' };
  if (!to.length) return { sent: false, to, missing, note: 'No email address on record for the recipients.' };
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#244260;line-height:1.5">${body}<p><a href="${LINK}" style="color:#5793A3;font-weight:bold">Open Smile Club → Dentist scripts</a></p><p style="color:#767769;font-size:12px">Smile Club script sign-off · Dental Nation performance dashboard</p></div>`;
  const r = await sendEmail({ to, subject, html, from: OPS_ALERT_FROM });
  return { sent: r.ok, to, missing, note: r.ok ? `Emailed ${to.length} ${to.length === 1 ? 'person' : 'people'}.` : `Saved, but the email failed: ${r.error ?? 'unknown error'}` };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const dName = (id: string) => DENTISTS.find((d) => d.id === id)?.name ?? id;

/** Fahad sends one or more dentists' scripts for sign-off → all three reviewers. */
export function mailSentForReview(dentistIds: string[]) {
  const list = dentistIds.map((id) => `<li>${esc(dName(id))}</li>`).join('');
  return mail(['shadi', 'luvi', 'gautam', 'fahad'], `Smile Club scripts ready for your approval (${dentistIds.length})`,
    `<p>Fahad has created and reviewed these dentists’ Smile Club scripts (pre-final). Your final check and approval is needed on the system:</p><ul>${list}</ul><p>Approve, request changes, or add your input on each dentist’s card. An approval counts only for the wording you saw — any later change comes back to you.</p>`);
}

/** A reviewer decided or added input → Fahad and the other reviewers; final → everyone. */
export async function mailDecision(e: ReviewEntry, entries: ReviewEntry[]) {
  const d = DENTISTS.find((x) => x.id === e.dentistId);
  if (!d) return { sent: false, to: [], missing: [], note: 'Unknown dentist.' } as MailOutcome;
  const who = e.reviewer === 'fahad' ? 'Fahad' : REVIEWERS.find((r) => r.id === e.reviewer)!.name;
  const verb = e.decision === 'approved' ? 'approved' : e.decision === 'changes' ? 'requested changes to' : 'added input on';
  const st = reviewFor(d, entries);
  const status = REVIEWERS.map((r) => `${r.name}: ${st.per[r.id].state === 'approved' ? '✓ approved' : st.per[r.id].state === 'changes' ? '✎ changes requested' : 'pending'}`).join(' · ');
  const note = e.note ? `<blockquote style="border-left:3px solid #E1C96E;margin:8px 0;padding:4px 10px">${esc(e.note)}</blockquote>` : '';
  if (st.final) {
    return mail(['fahad', 'shadi', 'luvi', 'gautam'], `FINAL — ${d.name}’s Smile Club scripts approved by all three`,
      `<p><b>${esc(d.name)}</b>’s scripts are now <b>final</b>: approved by Ms Shadi, Dr Luvi and Gautam. They can be filmed and sent.</p>${note}`);
  }
  const others = (['fahad', 'shadi', 'luvi', 'gautam'] as const).filter((w) => w !== e.reviewer);
  return mail([...others], `${who} ${verb} ${d.name}’s Smile Club scripts`,
    `<p><b>${esc(who)}</b> ${verb} <b>${esc(d.name)}</b>’s scripts.</p>${note}<p>Status: ${esc(status)}</p>`);
}

/** Once a day (09:00 Dubai, from the sync cron): remind each reviewer of what still waits on them. */
export async function runReviewReminder(): Promise<string> {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', hour12: false }).format(now));
  if (hour !== 9) return 'not reminder hour';
  const sb = getSupabaseAdmin();
  if (!sb) return 'no db';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(now);
  const { data: done } = await sb.from('sc_script_reviews').select('id').eq('decision', 'reminder').gte('at', `${today}T00:00:00+04:00`).limit(1);
  if (done?.length) return 'already reminded today';
  const { data } = await sb.from('sc_script_reviews').select('dentist_id,reviewer,decision,note,hash,actor,at');
  const entries: ReviewEntry[] = (data ?? []).map((r) => ({ dentistId: r.dentist_id as string, reviewer: r.reviewer as ReviewEntry['reviewer'], decision: r.decision as ReviewEntry['decision'], note: (r.note as string | null) ?? null, hash: r.hash as string, actor: r.actor as string, at: r.at as string }));
  const sentIds = new Set(entries.filter((e) => e.decision === 'sent').map((e) => e.dentistId));
  let n = 0;
  for (const r of REVIEWERS) {
    const waiting = DENTISTS.filter((d) => sentIds.has(d.id)).filter((d) => {
      const st = reviewFor(d, entries);
      return st.sent && (st.per[r.id].state === 'pending' || st.per[r.id].state === 'stale');
    });
    if (!waiting.length) continue;
    const res = await mail([r.id], `Reminder: ${waiting.length} Smile Club script set${waiting.length === 1 ? '' : 's'} waiting for your approval`,
      `<p>These dentists’ scripts are waiting for your final check and approval:</p><ul>${waiting.map((d) => `<li>${esc(d.name)}</li>`).join('')}</ul>`);
    if (res.sent) n += 1;
  }
  await sb.from('sc_script_reviews').insert({ dentist_id: '*', reviewer: 'system', decision: 'reminder', note: `${n} reminder email(s)`, hash: '-', actor: 'system' });
  return `${n} reminders`;
}
