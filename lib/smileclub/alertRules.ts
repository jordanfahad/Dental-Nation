/** The Smile Club email alert rules, as shown on the Team tab (implemented in lib/smileclub/alerts.ts). */
export const ALERT_RULES = [
  { when: 'Daily 17:00 Dubai — only if there is a shoot tomorrow', what: 'Tomorrow’s shoot schedule: time, dentist, clinic, clinic hours, what is filmed, languages, scripts approved or not (with backup day), wardrobe', to: 'MJ', cc: 'Dr Luvi, Mr Akbar, Ms Shadi, Gautam, Fahad, Mohan' },
  { when: 'Daily 09:00 Dubai, Mon–Sat (Sunday only if something is due that day) — skipped when nothing is due, overdue, blocked or waiting', what: 'Gautam’s status: completion score vs plan, due today, overdue, who is waiting on him, what he is waiting on, next 3 days, company pipeline and today’s calendar entries', to: 'Gautam', cc: 'Mr Akbar, Fahad' },
  { when: 'Same rule as above', what: 'Dr Luvi’s status: her score, plus the receptionists’ and dentists’ tasks she updates — due, overdue, dependencies both ways', to: 'Dr Luvi', cc: 'Mr Akbar, Fahad' },
  { when: 'Same rule as above', what: 'Mohan’s status: score, due and overdue, today’s and tomorrow’s shoots, new review comments on his work', to: 'Mohan', cc: 'Mr Akbar, Fahad' },
  { when: 'Immediately, when anyone flags a task “blocked”', what: 'Which task, the note, and what it is waiting on', to: 'Fahad and the owners of the tasks it waits on', cc: 'The task owner' },
  { when: 'Sign-off (already live)', what: 'Scripts sent for approval, every decision, final approval, 09:00 reminder while anything waits', to: 'Ms Shadi, Dr Luvi, Gautam, Fahad', cc: '' },
] as const;
