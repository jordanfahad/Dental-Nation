/**
 * The Smile Club email alerts, as shown on the Team tab (implemented in
 * lib/smileclub/alerts.ts). Since 26 Sep: at most TWO emails per person per
 * day — one 09:00 morning briefing and at most one evening email.
 * DN-015 adds two performance kinds: Akbar and Shadi receive only their own
 * daily kind; Fahad receives both copies in addition to his Smile Club cap.
 */
export const ALERT_RULES = [
  { when: '09:00 daily - performance only', what: 'Demand and funnel, measured changes, owner action note, public benchmark signals, Smile Club outcomes and compact GBP results', to: 'Mr Akbar', cc: 'Fahad' },
  { when: '09:00 - when there is new GBP activity or an Off track flag', what: 'GBP daily activities, plan progress and branch results', to: 'Ms Shadi', cc: 'Fahad' },
  { when: '09:00 — morning briefing, when he has something', what: 'Scripts waiting on his approval · his tasks, score and dependencies · company pipeline and today’s calendar entries · since yesterday', to: 'Gautam', cc: '' },
  { when: '09:00 — morning briefing, when he has something', what: 'His tasks and score · today’s and tomorrow’s shoots · final approvals (cleared to film) · review comments on his work', to: 'Mohan', cc: '' },
  { when: '09:00 daily — morning briefing', what: 'Meta leads red flags, the whole team’s status, script sign-offs, his own tasks, every sign-off decision since yesterday', to: 'Fahad', cc: '' },
  { when: '17:00 — only the evening before a shoot', what: 'Tomorrow’s schedule: time, dentist, clinic, hours, what is filmed, languages · who still has to approve which dentist tonight (with the backup day) · wardrobe · the team’s updates since the morning', to: 'MJ', cc: 'Dr Luvi, Gautam, Fahad, Mohan' },
  { when: '17:00 — other evenings, only if something new needs them', what: 'Scripts just sent for their approval · a task flagged blocked that waits on them · a finished task that unblocks theirs · review comments on their work · for Fahad: every sign-off decision', to: 'Whoever has something to act on', cc: '' },
] as const;

/** The most anyone receives in a day. */
export const ALERT_CAP = [
  { who: 'Mr Akbar', morning: 'Performance brief only', evening: '—', max: 1 },
  { who: 'Dr Luvi', morning: '—', evening: 'Shoot schedule (copied), evenings before a shoot', max: 1 },
  { who: 'Ms Shadi', morning: 'GBP daily only', evening: '—', max: 1 },
  { who: 'Gautam', morning: 'Briefing (when he has something)', evening: 'Shoot schedule (copied) or his evening update', max: 2 },
  { who: 'Mohan', morning: 'Briefing (when he has something)', evening: 'Shoot schedule (copied) or his evening update', max: 2 },
  { who: 'Fahad', morning: 'Briefing plus two performance copies', evening: 'Shoot schedule (copied) or his evening update', max: 4 },
  { who: 'MJ', morning: '—', evening: 'Shoot schedule (to her), evenings before a shoot', max: 1 },
] as const;

/** Emails Fahad can preview to himself. */
export const PREVIEWS = [
  { kind: 'am:gautam', label: 'Gautam’s briefing' },
  { kind: 'am:mohan', label: 'Mohan’s briefing' },
  { kind: 'am:fahad', label: 'My briefing' },
  { kind: 'shoot', label: 'Next shoot (17:00)' },
  { kind: 'pm:fahad', label: 'My evening update' },
] as const;
