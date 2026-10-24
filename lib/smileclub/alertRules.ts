/**
 * The automatic emails, as shown on the Team tab.
 *
 * Four daily 09:00 emails (owner approval, 24 Oct 2026; lib/alerts/registry.ts,
 * sent by /api/cron/alerts from Sun 25 Oct): Smile Club, DN Ortho, Google
 * Business Profile, and daily and month to date performance. One of each a day;
 * every figure links to its report view. Mr Akbar receives the GBP and
 * performance emails. These four are separate from the Smile Club cap below.
 *
 * Smile Club briefings (lib/smileclub/alerts.ts). Since 26 Sep: at most TWO per
 * person per day, one 09:00 morning briefing and at most one evening email.
 * Since 24 Oct Gautam gets the Smile Club daily email instead of a briefing.
 */
export const ALERT_RULES = [
  { when: '09:00 daily, from Sun 25 Oct', what: 'Smile Club: Partnerships (Smile Club) enquiries, bookings and visits for yesterday and month to date, by clinic · partner companies by stage · shoots and scripts · what is due today. Every figure links to its report.', to: 'Gautam, Dr Luvi, Ms Shadi, MJ', cc: 'Fahad' },
  { when: '09:00 daily, from Sun 25 Oct', what: 'DN Ortho: billing by orthodontist month to date · the campaigns · content and launch checklist. Every figure links to its report.', to: 'Dr Luvi, MJ, Ms Shadi', cc: 'Fahad' },
  { when: '09:00 daily, from Sun 25 Oct', what: 'Google Business Profile: calls, directions, website clicks and map views for the latest day Google has reported and month to date, per clinic · reviews and replies · what needs attention. Every figure links to its report.', to: 'Mr Akbar, Ms Shadi, Dr Luvi', cc: 'Fahad' },
  { when: '09:00 daily, from Sun 25 Oct', what: 'Daily and month to date performance: group and clinic enquiries, bookings, visits and billing · digital marketing by channel · programmes · brand signals · last 7 days against the 7 before. Every figure links to its report.', to: 'Mr Akbar, Ms Shadi', cc: 'Fahad' },
  { when: '09:00 — morning briefing, when he has something', what: 'His tasks and score · today’s and tomorrow’s shoots · final approvals (cleared to film) · review comments on his work', to: 'Mohan', cc: '' },
  { when: '09:00 daily — morning briefing', what: 'Meta leads red flags, the whole team’s status, script sign-offs, his own tasks, every sign-off decision since yesterday', to: 'Fahad', cc: '' },
  { when: '17:00 — only the evening before a shoot', what: 'Tomorrow’s schedule: time, dentist, clinic, hours, what is filmed, languages · who still has to approve which dentist tonight (with the backup day) · wardrobe · the team’s updates since the morning', to: 'MJ', cc: 'Dr Luvi, Gautam, Fahad, Mohan' },
  { when: '17:00 — other evenings, only if something new needs them', what: 'Scripts just sent for their approval · a task flagged blocked that waits on them · a finished task that unblocks theirs · review comments on their work · for Fahad: every sign-off decision', to: 'Whoever has something to act on', cc: '' },
] as const;

/** The most anyone receives in a day. */
export const ALERT_CAP = [
  { kind: 'lead:whatsapp', who: 'Dr Luvi: lead alert (off until configured)', morning: 'Off - owner setup pending', evening: '-', max: 0 },
  { who: 'Mr Akbar', morning: 'GBP daily and performance daily', evening: '-', max: 2 },
  { who: 'Dr Luvi', morning: 'Smile Club, DN Ortho and GBP daily', evening: 'Shoot schedule (copied), evenings before a shoot', max: 4 },
  { who: 'Ms Shadi', morning: 'Smile Club, DN Ortho, GBP and performance daily', evening: '-', max: 4 },
  { who: 'Gautam', morning: 'Smile Club daily', evening: 'Shoot schedule (copied) or his evening update', max: 2 },
  { who: 'Mohan', morning: 'Briefing (when he has something)', evening: 'Shoot schedule (copied) or his evening update', max: 2 },
  { who: 'Fahad', morning: 'Briefing, plus a copy of all four daily emails', evening: 'Shoot schedule (copied) or his evening update', max: 6 },
  { who: 'MJ', morning: 'Smile Club and DN Ortho daily', evening: 'Shoot schedule (to her), evenings before a shoot', max: 3 },
] as const;

/** Emails Fahad can preview to himself. */
export const PREVIEWS = [
  { kind: 'am:mohan', label: 'Mohan’s briefing' },
  { kind: 'am:fahad', label: 'My briefing' },
  { kind: 'shoot', label: 'Next shoot (17:00)' },
  { kind: 'pm:fahad', label: 'My evening update' },
] as const;
