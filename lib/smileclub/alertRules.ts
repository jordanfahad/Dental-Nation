/**
 * The Smile Club email alerts, as shown on the Team tab (implemented in
 * lib/smileclub/alerts.ts). Since 26 Sep: at most TWO emails per person per
 * day — one 09:00 morning briefing and at most one evening email.
 */
export const ALERT_RULES = [
  { when: '09:00 daily — morning briefing', what: 'Meta leads red flags from ContentOS Lead Analysis and the ad/tracker data — leads going quiet, slow first reply, leads to call now, chats not reaching the CRM, expensive chats, spend with no leads (Dr Luvi’s actions) · the whole team’s status: Gautam, Dr Luvi, Mohan, Fahad — score vs plan, due, overdue, blocked, who is waiting on whom · script sign-off status · next shoot · company pipeline · what happened since yesterday', to: 'Mr Akbar', cc: '' },
  { when: '09:00 daily — morning briefing', what: 'Meta leads red flags for her action · scripts waiting on her approval (filming soonest first) · her tasks, the receptionists’ and dentists’ tasks she updates, score and dependencies · since yesterday', to: 'Dr Luvi', cc: '' },
  { when: '09:00 daily — morning briefing', what: 'Meta leads red flags (aware) · scripts waiting on her approval · sign-off decisions since yesterday', to: 'Ms Shadi', cc: '' },
  { when: '09:00 — morning briefing, when he has something', what: 'Scripts waiting on his approval · his tasks, score and dependencies · company pipeline and today’s calendar entries · since yesterday', to: 'Gautam', cc: '' },
  { when: '09:00 — morning briefing, when he has something', what: 'His tasks and score · today’s and tomorrow’s shoots · final approvals (cleared to film) · review comments on his work', to: 'Mohan', cc: '' },
  { when: '09:00 daily — morning briefing', what: 'Everything above in one email: red flags, team status, his own tasks, every sign-off decision since yesterday', to: 'Fahad', cc: '' },
  { when: '17:00 — only the evening before a shoot', what: 'Tomorrow’s schedule: time, dentist, clinic, hours, what is filmed, languages · who still has to approve which dentist tonight (with the backup day) · wardrobe · the team’s updates since the morning', to: 'MJ', cc: 'Dr Luvi, Mr Akbar, Ms Shadi, Gautam, Fahad, Mohan' },
  { when: '17:00 — other evenings, only if something new needs them', what: 'Scripts just sent for their approval · a task flagged blocked that waits on them · a finished task that unblocks theirs · review comments on their work · for Fahad: every sign-off decision', to: 'Whoever has something to act on', cc: '' },
] as const;

/** The most anyone receives in a day. */
export const ALERT_CAP = [
  { who: 'Mr Akbar', morning: 'Briefing', evening: 'Shoot schedule (copied), evenings before a shoot', max: 2 },
  { who: 'Dr Luvi', morning: 'Briefing', evening: 'Shoot schedule (copied) or her evening update', max: 2 },
  { who: 'Ms Shadi', morning: 'Briefing', evening: 'Shoot schedule (copied) or her evening update', max: 2 },
  { who: 'Gautam', morning: 'Briefing (when he has something)', evening: 'Shoot schedule (copied) or his evening update', max: 2 },
  { who: 'Mohan', morning: 'Briefing (when he has something)', evening: 'Shoot schedule (copied) or his evening update', max: 2 },
  { who: 'Fahad', morning: 'Briefing', evening: 'Shoot schedule (copied) or his evening update', max: 2 },
  { who: 'MJ', morning: '—', evening: 'Shoot schedule (to her), evenings before a shoot', max: 1 },
] as const;

/** Emails Fahad can preview to himself. */
export const PREVIEWS = [
  { kind: 'am:akbar', label: 'Mr Akbar’s briefing' },
  { kind: 'am:luvi', label: 'Dr Luvi’s briefing' },
  { kind: 'am:shadi', label: 'Ms Shadi’s briefing' },
  { kind: 'am:gautam', label: 'Gautam’s briefing' },
  { kind: 'am:mohan', label: 'Mohan’s briefing' },
  { kind: 'am:fahad', label: 'My briefing' },
  { kind: 'shoot', label: 'Next shoot (17:00)' },
  { kind: 'pm:fahad', label: 'My evening update' },
] as const;
