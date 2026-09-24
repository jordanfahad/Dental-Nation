/**
 * Smile Club team task calendar — the single definition of every tracked
 * task: owner, due date, plain-language objective and reason, the steps that
 * make up its flow chart (each with how-to guidance), its weight in the
 * programme score and the subscriptions it drives. Shared by the plan UI
 * (client) and the progress server action, which validates keys, step bounds
 * and ownership against this list.
 *
 * Live progress (current step, status, audit trail) lives in lane_e.tasks
 * (external_id = `sc-team:<key>`) and lane_e.task_events — never here.
 */

import type { SegmentId } from '@/lib/smileclub/segments';
import type { CorpState } from '@/lib/smileclub/corporate';

export type Person = 'fahad' | 'gautam' | 'luvi' | 'doctors' | 'mohan' | 'reception' | 'crm';

export interface Step {
  /** Short label shown in the flow chart. */
  s: string;
  /** Plain-language instruction: how to do this step. */
  how: string;
}

export interface TeamTask {
  key: string;
  who: Person;
  wk: number;
  /** ISO due date — drives on-track / overdue status. */
  dueIso: string;
  due: string;
  task: string;
  /** What this task achieves, in one or two plain sentences. */
  objective: string;
  /** Why it matters to the 120. */
  why: string;
  steps: Step[];
  done: string;
  with?: string;
  to?: string;
  toLabel?: string;
  /** Relative weight in the programme score (normalised to % in the UI). */
  weight: number;
  /** Paid subscriptions this task directly delivers (0 = enabler). */
  subs: number;
  /** What the subscription figure means for this task. */
  subsNote: string;
  /** The plan segment this task executes (unset = programme management). */
  seg?: SegmentId;
  /** Evidence-verified task: completion is decided by checking an uploaded file. */
  verify?: 'crm-test';
  /** Dentist ids whose scripts are shown on the task for team review. */
  scripts?: string[];
  /** Tasks that must be complete before this one can run — shown as blockers, chased by this task's owner. */
  needs?: string[];
}

export const TRACKER_SOURCE = 'smileclub-team';
export const externalIdFor = (key: string) => `sc-team:${key}`;

/** The Loyalty Program project that hosts Smile Club tasks in Growth Projects. */
export const SMILECLUB_PROJECT_ID = '6802b97d-cfb5-46b3-842f-9d29a5039309';

export const OWNER_LABEL: Record<Person, string> = {
  fahad: 'Fahad',
  gautam: 'Gautam',
  luvi: 'Dr Luvi',
  doctors: 'Treating dentists',
  mohan: 'Mohan',
  reception: 'Receptionists',
  crm: 'CRM-DN',
};

/**
 * Who may move a person's tasks, keyed by dashboard_users.name. Admin
 * sessions (Fahad) may move any task, including CRM-DN's, which has no login.
 * Receptionist logins are locked to Clinical Operations, so Dr Luvi updates
 * their tasks as their head of operations.
 */
export const EDITORS: Record<string, Person[]> = {
  Gautam: ['gautam'],
  'Dr Luvi': ['luvi', 'reception', 'doctors'],
  Mohan: ['mohan'],
};

const TASKS_RAW: TeamTask[] = [
  /* ── Fahad — growth lead, owns the marketing machine and reports to Mr Akbar ── */
  { key: 'f-response', who: 'fahad', wk: 1, dueIso: '2026-09-22', due: 'Tue 22 Sep EOD', task: 'Submit the 30-day plan to Gautam and Mr Akbar',
    objective: 'Put every one of the 120 target memberships against a named source, owner, budget and date — so nobody has to guess where the 120 come from.',
    why: 'The mandate asks for a written, numbered answer on day one. Without it, every later check-in has nothing to measure against.',
    steps: [
      { s: 'Map the 120 by source', how: 'Show the five targets separately: chair 36, dentists’ own patients 24, companies 24, online 12, families and neighbourhoods 24.' },
      { s: 'Budget + owners', how: 'Show where every dirham of the AED 27,000 goes, segment by segment, and who owns each part.' },
      { s: 'Sent', how: 'Share the plan link with Gautam and Mr Akbar.' },
    ],
    done: 'The plan is live on the dashboard and shared.', to: 'response', toLabel: '30-day delivery plan', weight: 2, subs: 0, subsNote: 'Enabler — frames all 120' },
  { key: 'f-call-actions', who: 'fahad', wk: 1, dueIso: '2026-09-23', due: 'Wed 23 Sep', task: 'Close the two open actions from the CRM-DN call',
    objective: 'Clear the follow-ups promised on the 19 Sep call so CRM-DN can switch on the WhatsApp follow-up sequence.',
    why: 'CRM-DN cannot send a single follow-up message until they have the list of approved offers — every day of delay is interested patients going cold.',
    steps: [
      { s: 'Missed lead flagged', how: 'Have the contact-centre owner follow up the missed booking enquiry in its existing private system; record only the follow-up status here, without chat text or contact details.' },
      { s: 'Approved offers sent', how: 'Send CRM-DN the PDF of offers they are allowed to use; they pick one for the follow-up sequence.' },
    ],
    done: 'Both sent; CRM-DN confirms receipt.', with: 'CRM-DN', weight: 1, subs: 0, subsNote: 'Enabler — unblocks the WhatsApp follow-up' },
  { key: 'f-keywords', who: 'fahad', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'Rebuild Google into the three search campaigns that work',
    objective: 'Split Google into three separate campaigns — brand, price searches and insurance-gap searches — each with its own words, message and budget, plus a call button for mobile.',
    why: 'One campaign for everyone means one message for everyone. Someone searching a cleaning price and someone frustrated with their insurance need different words — and we need to see which works.',
    steps: [
      { s: 'Brand campaign', how: '“smile club dental nation”, “dental nation membership” — AED 500.' },
      { s: 'Price campaign', how: '“teeth cleaning price dubai”, “dental checkup cost dubai” — AED 1,000 now (+1,500 at Day 14 if proven); the ad answers the price.' },
      { s: 'Insurance-gap campaign', how: '“dentist without insurance dubai” — AED 500; say membership, never insurance.' },
      { s: 'Checked + call button', how: 'Every planned phrase live in the account, “dentist near me” blocked, call button on; mark the keyword list CONFIRMED.' },
    ],
    done: 'Three campaigns live, each with its own tracking.', to: 'segments', toLabel: 'Segment: searching online', weight: 2, subs: 3, subsNote: '≈3 of the website 12' },
  { key: 'f-signoff', who: 'fahad', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Get Mr Akbar’s sign-off on money and introductions',
    objective: 'Get four yes/no answers from Mr Akbar: the AED 27,000 budget (built from about AED 250 per member), the dentists’ curated WhatsApp approach, his three corporate introductions, and the free-consultation message.',
    why: 'Spending beyond the first week, and the corporate doors he can open, both wait on him. Without sign-off the paid lanes stay small and corporate loses its warmest leads.',
    steps: [
      { s: 'One-page ask', how: 'Summarise the four decisions on one page with the plan link.' },
      { s: 'Meeting held', how: 'Walk him through it; note each answer.' },
      { s: 'Decisions logged', how: 'Record the answers in the plan and tell Gautam.' },
    ],
    done: 'Written answers recorded for the AED 27,000 proposal and its release conditions, the dentist-message approach, the three requested company introductions and the free-consultation wording. Outstanding answers remain outstanding.', with: 'Mr Akbar', to: 'response', toLabel: 'Budget (R2)', weight: 4, subs: 0, subsNote: 'Enabler — releases budget for the paid and corporate lanes' },
  { key: 'f-warm-doors', who: 'fahad', wk: 2, dueIso: '2026-09-30', due: 'Wed 30 Sep', task: 'Work the warm corporate introductions',
    objective: 'Turn the companies we already know — Assembly Global, ArabyAds, RBS and Mr Akbar’s three introductions — into meetings for Gautam.',
    why: 'A company that already knows us signs far faster than a cold one. These doors are the quickest route to the corporate 24.',
    steps: [
      { s: 'Follow-ups sent', how: 'Chase Assembly Global; make the staff-membership ask at the ArabyAds meeting.' },
      { s: 'Introductions made', how: 'Send each of Mr Akbar’s introductions a short note and propose a meeting with Gautam.' },
      { s: 'Meetings booked', how: 'Put confirmed meetings in Gautam’s calendar with a one-line brief for each.' },
    ],
    done: 'Every warm door has a meeting, a decision or a logged “no”.', with: 'Gautam', to: 'dm', toLabel: 'Outreach status (D3)', weight: 4, subs: 0, subsNote: 'Feeds Gautam’s corporate 24' },
  { key: 'f-partners', who: 'fahad', wk: 2, dueIso: '2026-10-02', due: 'Fri 2 Oct', task: 'Sign the partner channels',
    objective: 'Sign up the outside partners who sell Smile Club for us and are paid only when someone actually joins: 2 local businesses, 3 promoters, and the first brokers and benefit platforms.',
    why: 'Partners are 20 of the 120. Each only counts if it has its own tracking code, so we know which partner brought which member and pay only for real results.',
    steps: [
      { s: '2 local businesses', how: 'Pharmacies, gyms or salons near a branch; one-page agreement; commission per paid member only.' },
      { s: '3 promoters', how: 'Family-focused creators or community groups, each with their own link or code.' },
      { s: 'Brokers + platforms', how: 'Insurance brokers and employee-benefit websites that list Smile Club beside what they already sell.' },
      { s: 'Codes live', how: 'Each partner receives a tracking code and QR, and is checked monthly before any payment.' },
    ],
    done: 'Every partner signed with a working code.', to: 'response', toLabel: 'Partner lanes (R1)', weight: 6, subs: 20, subsNote: 'Target by 21 Oct: 20 paid memberships — 7 local businesses, 7 promoters, 3 brokers, 3 benefit platforms. Signing partners on 2 Oct does not establish those sales.' },
  { key: 'f-meta', who: 'fahad', wk: 2, dueIso: '2026-10-02', due: 'Fri 2 Oct', task: 'Launch the new Facebook/Instagram ads',
    objective: 'Put Mohan’s approved ad designs live to reach people who have already visited our website, plus a “chat on WhatsApp” offer.',
    why: 'Facebook/Instagram has a target of 7 of the online 12 memberships. Mohan’s designs support ads to returning visitors: AED 1,500 initially, with a further AED 2,000 held until the 5 Oct review.',
    steps: [
      { s: 'Designs approved', how: 'Only after Dr Luvi has checked every claim.' },
      { s: 'Ads built', how: 'Set up returning-visitor ads and the WhatsApp offer, each with its own tracking.' },
      { s: 'Live + checked', how: 'Confirm enquiries arrive and the contact centre is replying.' },
    ],
    done: 'Ads live, enquiries arriving and being answered.', with: 'Mohan · Dr Luvi', to: 'dm', toLabel: 'Channel plan (D1)', weight: 4, subs: 7, subsNote: '≈7 of the website 12' },
  { key: 'f-linkedin', who: 'fahad', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep', task: 'Warm up HR managers on LinkedIn',
    objective: 'Make sure HR and office managers at Gautam’s target companies have seen Smile Club before he walks in.',
    why: 'A door that recognises us opens more easily. LinkedIn is measured by meetings it helps create, not by clicks.',
    steps: [
      { s: 'Weekly posts', how: 'Fahad posts twice a week using Mohan’s HR-facing content.' },
      { s: 'Small paid test', how: 'Up to AED 1,500, shown only to HR contacts at the companies on Gautam’s list.' },
      { s: 'Connect before visits', how: 'Connect with the HR contact before each of Gautam’s visits.' },
    ],
    done: 'Posts running; test live; every visit preceded by a connection.', with: 'Mohan · Gautam', weight: 1, subs: 0, subsNote: 'Supports the corporate 24' },
  { key: 'f-google-gate', who: 'fahad', wk: 2, dueIso: '2026-10-05', due: 'Mon 5 Oct', task: 'Review the held-back online budget',
    objective: 'At Day 14, look at what one online member has actually cost and decide whether to release the held-back AED 3,500 (Google +1,500, Facebook/Instagram +2,000).',
    why: 'The same review covers Google and Facebook/Instagram. The extra AED 3,500 stays on hold unless the cost of a paid online membership meets the budget condition.',
    steps: [
      { s: 'Read the numbers', how: 'Divide online acquisition spend by paid, active, non-refunded online membership contracts, counted once each. Show the spend, contract count and dates; allow 7 days for follow-up. With no paid contracts or insufficient follow-up time, keep the money on hold.' },
      { s: 'Decide', how: 'AED 600 or less per paid online membership is the condition for releasing the held-back AED 3,500: Google +1,500 and Facebook/Instagram +2,000. Assess the separate AED 3,000 reserve against the lowest measured cost per paid member; no paid members means no proven winner. Record the required human sign-off before any release.' },
      { s: 'Record', how: 'Note the decision and the reason in the plan.' },
    ],
    done: 'Decision recorded with its numbers.', to: 'dm', toLabel: 'Channel plan (D1)', weight: 2, subs: 0, subsNote: 'Protects the website 12' },
  { key: 'f-awareness', needs: ['m-geo', 'g-procure-2'], who: 'fahad', wk: 3, dueIso: '2026-10-09', due: 'Fri 9 Oct', task: 'Community awareness — offline, near the branches',
    objective: 'Make Smile Club known to families living and working near our three branches through places they already trust — schools, buildings, gyms and pharmacies — instead of digital ads.',
    why: 'Nobody searches for a dental membership, and online awareness ads are unlikely to move people. Local, physical presence reaches families where they are: AED 2,000 of printed material plus AED 1,500 for one community event.',
    steps: [
      { s: 'Schools & nurseries', how: 'Two schools near branches: a dentist-led parent talk and a leaflet home with each child.' },
      { s: 'Residential buildings', how: 'Lobby posters in buildings near each branch; one message via the building/community WhatsApp admin.' },
      { s: 'Gyms & pharmacies', how: 'Counter cards with a QR code under each partner’s own code.' },
      { s: 'Results checked', how: 'Joins by code; keep what brings members, drop the rest.' },
    ],
    done: 'Material placed at every location, each with its own code.', with: 'Mohan · Dr Luvi', to: 'segments', toLabel: 'Segment: families & neighbourhoods', weight: 2, subs: 0, subsNote: 'Feeds the partner and community 24' },
  { key: 'f-report', who: 'fahad', wk: 5, dueIso: '2026-10-21', due: 'Every Monday → Wed 21 Oct', task: 'Weekly progress report to Mr Akbar',
    objective: 'Report to Mr Akbar on Mon 28 Sep, Mon 5 Oct and Mon 12 Oct, then send the final report on Wed 21 Oct: paid memberships by source, spend, late tasks and recovery actions.',
    why: 'Mr Akbar needs one reliable picture. This tracker produces it — the report is the tracker plus the membership count.',
    steps: [
      { s: '28 Sep report', how: 'Members joined vs the 36 plan; late tasks; fixes already underway.' },
      { s: '5 Oct report', how: 'Members vs 60; spend decision; corporate check.' },
      { s: '12 Oct report', how: 'Members vs 88; what is still at risk.' },
      { s: '21 Oct final', how: 'The 120 confirmed by Finance, and what happens next.' },
    ],
    done: 'Four reports sent on time.', with: 'Gautam', to: 'kpis', toLabel: 'Measurement', weight: 3, subs: 0, subsNote: 'Governance — covers all 120' },

  /* ── CRM-DN — runs WhatsApp, the landing pages, tracking and the contact centre ── */
  { key: 'c-scoring', who: 'crm', wk: 1, dueIso: '2026-09-23', due: 'Wed 23 Sep', task: 'Score past campaign chats + give Fahad access',
    objective: 'Rate every WhatsApp enquiry since November 2025 as high or low interest, and give Fahad access to the results.',
    why: 'Historic enquiry scores help prioritise a private review; a score does not establish current consent or authorise renewed contact.',
    steps: [
      { s: 'All campaigns scored', how: 'Including the ~9 orthodontic chats.' },
      { s: 'Access given', how: 'Fahad can see the scores on their dashboard.' },
    ],
    done: 'Scores visible to Fahad.', with: 'Fahad', weight: 1, subs: 0, subsNote: 'Enabler — finds the warmest past enquiries' },
  { key: 'c-landing', who: 'crm', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Membership web page in English and Arabic',
    objective: 'One clear page where anyone clicking an ad or the banner can understand Smile Club and join.',
    why: 'Every online lane sends people here. A confusing page wastes every dirham spent getting them to it.',
    steps: [
      { s: 'English page', how: 'What is included, the price, how to join — no insurance words.' },
      { s: 'Arabic page', how: 'Same content, properly translated.' },
      { s: 'Tracking on', how: 'Each visit records which ad or link brought the person.' },
    ],
    done: 'Both pages live and recording where visitors come from.', with: 'Mohan', weight: 2, subs: 0, subsNote: 'Enabler — every website subscription passes through it' },
  { key: 'c-contact', who: 'crm', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Answer every enquiry within 10 minutes',
    objective: 'The contact centre replies to every Smile Club enquiry within 10 minutes and notes whether the person wants membership or just an appointment.',
    why: 'Interest fades fast. Last time most replies were really about appointments — tagging the difference tells us what is actually working.',
    steps: [
      { s: 'Rule agreed', how: '10-minute reply, 7 days a week, with a script.' },
      { s: 'Tagging on', how: 'Each first reply marked “membership” or “appointment”.' },
      { s: 'Checked daily', how: 'Late replies reviewed at the 09:00 meeting.' },
    ],
    done: 'Replies under 10 minutes; every enquiry tagged.', weight: 3, subs: 0, subsNote: 'Protects the website 12 and partner leads' },
  { key: 'c-retarget', who: 'gautam', wk: 2, dueIso: '2026-09-30', due: 'Wed 30 Sep', task: 'Get the WhatsApp follow-up live for people who enquired but did not book',
    needs: ['f-call-actions', 'm-wa-creative', 'c-wa-setup'],
    objective: 'An automatic, approved WhatsApp follow-up reaches everyone who enquired about Smile Club, or said “let me think” at the desk, but did not join — on day 1 and day 3, then it stops. Gautam owns getting it live: he chases Mohan for the creative and CRM-DN (Zavis) for the lists and templates, and signs off the test.',
    why: 'Warm people go cold fast. Nothing can be sent until three things exist — an approved offer, the creative, and the lists and templates in Zavis — so one person clears all three instead of each waiting on the other.',
    steps: [
      { s: 'Offer and wording approved', how: 'Fahad’s approved-offer list from the CRM-DN call, and Mr Akbar’s yes on the free-consultation wording. If either is missing on Mon 28 Sep, chase Fahad.' },
      { s: 'Creative received', how: 'Mohan’s image card and message text in English and Arabic, plus Turkish for Dr. Tosun Dental Clinic (task “WhatsApp follow-up creative”). Chase Mohan if not in by Mon 28 Sep.' },
      { s: 'Lists and templates ready', how: 'CRM-DN builds the two lists in Zavis with consent and opt-outs checked, and gets the templates approved (task “Set up the follow-up in Zavis”). Chase CRM-DN if not ready by Tue 29 Sep.' },
      { s: 'Test passed', how: 'CRM-DN sends the whole sequence to three internal numbers; Gautam checks wording, image, link, tracking code and that STOP works.' },
      { s: 'Live', how: 'Gautam gives the go and CRM-DN switches it on: day 1 and day 3 only, 10:00–19:00, stops on any reply or STOP; replies answered within 10 minutes.' },
    ],
    done: 'Sequence live and tested, sending only to consented enquirers; replies answered within 10 minutes.', with: 'Mohan · CRM-DN · Fahad', to: 'segments', toLabel: 'Segment: searching online', weight: 2, subs: 0, subsNote: 'Support only — each paid contract counts once under its primary source, never as a separate follow-up membership' },
  { key: 'c-wa-setup', who: 'crm', wk: 2, dueIso: '2026-09-29', due: 'Tue 29 Sep', task: 'Set up the follow-up in Zavis — lists, templates, test',
    needs: ['m-wa-creative'],
    objective: 'Build the two follow-up lists and the approved message templates in Zavis so the follow-up runs automatically, with consent, opt-outs and the 10-minute reply rule built in.',
    why: 'Automation removes “someone forgot to follow up” — but only if the lists and rules are right before the first message goes.',
    steps: [
      { s: 'Lists built', how: 'List 1: enquired about Smile Club in the last 30 days, not booked, contact consent on file. List 2: patients the desk added as “let me think”. Opt-outs removed from both.' },
      { s: 'Templates submitted', how: 'Mohan’s image and text as WhatsApp templates, one per language, submitted for WhatsApp approval.' },
      { s: 'Rules set', how: 'Day 1 and day 3 only; 10:00–19:00; stop on any reply or STOP; every message carries its tracking code; replies routed to the contact centre (10-minute rule).' },
      { s: 'Test sent', how: 'Whole sequence to three internal numbers; Gautam signs it off on his task.' },
    ],
    done: 'Lists, templates and rules ready; test signed off by Gautam.', with: 'Gautam · Mohan', to: 'segments', toLabel: 'Segment: searching online', weight: 2, subs: 0, subsNote: 'Enabler — clears the follow-up for Gautam' },
  { key: 'c-banner', who: 'crm', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'Put the Smile Club banner on the website',
    objective: 'A small bar across the website — “Smile Club — dental care from AED 99/month → Join” — that visitors can close.',
    why: 'The website already has visitors we paid nothing extra for. The banner puts Smile Club in front of them at zero ad cost.',
    steps: [
      { s: 'Artwork received', how: 'From Mohan (due 24 Sep).' },
      { s: 'Built', how: 'On the pages people use most; must not get in the way of appointment booking.' },
      { s: 'Live + tracked', how: 'Clicks and joins from the banner counted separately.' },
    ],
    done: 'Banner live on English and Arabic pages with its own tracking.', with: 'Mohan', to: 'dm', toLabel: 'Channel plan (D1)', weight: 2, subs: 2, subsNote: '≈2 of the website 12' },
  { key: 'c-tracking', who: 'crm', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Record where every member came from',
    objective: 'Set up and test the initial branch, dentist and online source codes before any joining link is released; test each later company/partner code before its launch. Every counted membership has one primary source; overall records meet the separate 98% completeness check.',
    why: 'Every membership counted toward the 120 needs one primary source. The separate 98% data-quality measure covers completeness across the funnel; it does not permit untracked memberships in the final count.',
    steps: [
      { s: 'Codes set up', how: 'One code per branch, treating dentist, ad, partner and company; one primary acquisition source per membership contract, so a dentist’s message followed by a branch visit is counted once.' },
      { s: 'Flows into the report', how: 'Each join lands in the dashboard with its code.' },
      { s: 'Spot-check', how: 'Test 10 joins; all 10 show the right source.' },
    ],
    done: 'Every counted membership has one primary source; overall funnel records meet the separate 98% completeness check.', to: 'kpis', toLabel: 'Measurement', weight: 4, subs: 0, subsNote: 'Protects all 120 — an untracked member does not count' },
  { key: 'c-doctor-send', needs: ['l-doctor-lists', 'd-approve'], who: 'crm', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep', task: 'Send messages in each dentist’s name — small batches',
    objective: 'Prepare each dentist’s WhatsApp messages only for that dentist’s consent-checked patients, using messages the dentist has reviewed and the required human sign-off. Across all sends, the limit is 20 messages per dentist per day; replies go to their branch and any opt-out stops further messages.',
    why: 'This is the opposite of the old mass test: personal, small, and every reply answered.',
    steps: [
      { s: 'One code per dentist', how: 'e.g. SC-DR-HASNA, SC-DR-TOSUN, SC-DR-MAYSOON.' },
      { s: 'Batch limit set', how: 'Max 20 messages per dentist per day across waves, reminders and automatic messages combined; check consent and opt-outs again before every send.' },
      { s: 'Replies routed', how: 'To the dentist’s branch desk, answered same day.' },
      { s: 'Opt-outs honoured', how: 'Any “stop” removes the patient immediately.' },
    ],
    done: 'Sending is ready only after the lists, dentist-reviewed wording, required human sign-off, tracking codes, combined daily limit and opt-out checks are confirmed; wave 1 is planned from Mon 28 Sep.', with: 'Dr Luvi', to: 'segments', toLabel: 'Segment: our patients', weight: 3, subs: 0, subsNote: 'Unlocks the dentists’ 24' },
  { key: 'c-triggers', who: 'crm', wk: 2, dueIso: '2026-09-30', due: 'Wed 30 Sep', task: 'Four automatic WhatsApp messages at the right moment',
    objective: 'Within the existing dentist message plan, use a due check-up, unfinished treatment or a completed emergency visit only as a reason to tailor a consent-checked message to that dentist’s own patient. A website enquirer who has never seen that dentist receives contact-centre follow-up under their enquiry consent, never a message pretending to come from their dentist. Check opt-outs before every send.',
    why: 'The earlier mass WhatsApp test produced no confirmed members. Messages sent at a moment of real need are the replacement.',
    steps: [
      { s: 'Four messages written', how: 'Short, personal; membership shown as the easier way to afford the care.' },
      { s: 'Consent checked', how: 'Only to patients who agreed to be contacted.' },
      { s: 'Live + tracked', how: 'Each message has its own code.' },
    ],
    done: 'All four messages live, tracked and consent-checked.', weight: 3, subs: 0, subsNote: 'Support only — each paid contract counts once under its primary source, never as a separate automatic-message membership' },

  /* ── Gautam — project owner & corporate implementer ── */
  { key: 'g-crm-test', who: 'gautam', wk: 1, dueIso: '2026-09-23', due: 'Wed 23 Sep EOD', task: 'Close out the old WhatsApp test — upload the evidence', verify: 'crm-test',
    objective: 'Prove, from the payment records, whether the old mass WhatsApp test produced any paying members. Upload one spreadsheet and the dashboard checks it automatically and marks this task complete.',
    why: 'The historical test recorded 1,280 non-unique contacts across five sends and 71 replies, with no confirmed paid memberships in the supplied summary. Reconcile the replies to payment records without treating contacts as distinct people.',
    steps: [
      { s: 'File uploaded', how: 'Download the template on this card, fill it in, upload it here. Use a message/contact ID — no patient names or phone numbers.' },
      { s: '71 replies classified', how: 'One row per reply: what the person wanted — membership, appointment, not interested or other.' },
      { s: '417 failures explained', how: 'One row per failed message with the reason: wrong number, not on WhatsApp, opted out, blocked or other.' },
      { s: 'Payments matched', how: 'For every reply: did this person go on to pay for a membership — yes or no.' },
    ],
    done: 'The dashboard’s automatic check passes all four and shows how many members the test really produced.', with: 'Fahad', to: 'waves', toLabel: 'Wave 1 results', weight: 2, subs: 0, subsNote: 'Historical evidence only — bulk messaging remains at target 0 and budget 0' },
  { key: 'g-baseline', who: 'gautam', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Share the current Smile Club member numbers',
    objective: 'Provide aggregate member counts by plan, payment status, visits used and cancellations from the existing private system. Reconcile totals there; the plan and shared review contain no patient names, phone numbers or row-level records.',
    why: 'This is our starting line. It tells us what a member is really worth, which plan sells, and why people cancel — so the “you save AED X” examples we show patients are true, and we can prove growth from a known number.',
    steps: [
      { s: 'Member list', how: 'Export all current members from the Smile Club system — no patient names needed, just counts and plan types.' },
      { s: 'Payments', how: 'For each member: paying, failed payment, or cancelled.' },
      { s: 'Visits', how: 'How many visits each member has used since joining.' },
      { s: 'Sent to Fahad', how: 'Share the file; 15-minute call to walk through it.' },
    ],
    done: 'Fahad has the numbers and the starting count is agreed.', with: 'Fahad', to: 'offer', toLabel: 'Offer & economics', weight: 4, subs: 0, subsNote: 'Enabler — sets the starting line for the 120' },
  { key: 'g-assets', who: 'gautam', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Give Mohan the existing sales materials',
    objective: 'Hand Mohan the editable files for the corporate one-pager, the savings table, the HR email and the reception presentation.',
    why: 'These already exist. Mohan updates and prints them instead of designing from scratch — your door visits need them by Friday.',
    steps: [
      { s: 'Collect the four files', how: 'From the programme folder.' },
      { s: 'Check they are current', how: 'Prices and plan names match today’s offer.' },
      { s: 'Sent to Mohan', how: 'Editable versions (not PDFs).' },
    ],
    done: 'Mohan confirms he has all four.', with: 'Mohan', to: 'response', toLabel: 'Corporate (R1)', weight: 2, subs: 0, subsNote: 'Enabler — feeds the corporate 24' },
  { key: 'g-doors-15', who: 'gautam', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'Build the company list — by type',
    objective: 'A list of 40–60 companies to approach, grouped by type, with the reason to approach each one now.',
    why: 'Different companies buy for different reasons and need a different approach. Picking the right doors matters more than walking many.',
    steps: [
      { s: 'Warm doors', how: 'Assembly Global, ArabyAds, RBS, existing DN partners, Mr Akbar’s three introductions.' },
      { s: 'Small & mid-sized companies', how: '20–200 staff in JLT, Business Bay, DIFC, Al Quoz — near a branch, ideally several in one tower.' },
      { s: 'Frontline employers + schools', how: 'Hotels, restaurants, retail, facilities, security; schools near branches.' },
      { s: 'Reason + dental question', how: 'For each: why now (insurance renewal, complaints, hiring) and “does your insurance include dental?”.' },
    ],
    done: '40–60 companies listed by type with a reason each.', with: 'Fahad', to: 'segments', toLabel: 'Segment: companies', weight: 4, subs: 0, subsNote: 'Builds the pipeline for the corporate 24' },
  { key: 'g-procure', who: 'gautam', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep', task: 'Order week-1 materials through Procurement',
    needs: ['f-signoff', 'm-invite', 'm-printkit'],
    objective: 'Gautam is the one contact for Procurement. He orders the dentist invitation cards and QR stands (AED 1,100) and the company print kit (AED 1,500) from Mohan’s print files, so the chair and the door visits have their materials.',
    why: 'Nothing gets printed until someone raises the request, gets it approved and chases delivery. One owner stops it falling between Mohan, Procurement and the branches.',
    steps: [
      { s: 'Purchase request raised', how: 'To Procurement, copying Finance: spec and quantity from the budget (S1b), Mohan’s print files and two supplier quotes. Reference “Smile Club — budget line”.' },
      { s: 'Approved', how: 'Finance approves against the budget line. If the best quote is above the line, stop and tell Fahad before ordering.' },
      { s: 'Ordered', how: 'Procurement issues the purchase order; the supplier confirms the delivery date in writing.' },
      { s: 'Delivered and handed over', how: 'Cards and QR stands to each branch — the desk lead puts a stack in every treatment room; print kit to Gautam. Record quantities received here.' },
    ],
    done: 'Cards and stands in every branch; print kit with Gautam.', with: 'Mohan · Procurement · Finance · Dr Luvi', to: 'segments', toLabel: 'Budget (S1b)', weight: 2, subs: 0, subsNote: 'Enabler — materials for the chair 36 and the corporate 24' },
  { key: 'g-unlock', needs: ['g-doors-15', 'g-procure'], who: 'gautam', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep', task: 'Door-to-door go / no-go',
    objective: 'Confirm the four things door-to-door needs before the first knock on Tue 29 Sep.',
    why: 'Walking in without a price, a leave-behind or a dental-day offer wastes the one chance we get at each door.',
    steps: [
      { s: 'Price + funding options', how: 'Company pays / shares / staff pay — approved.' },
      { s: 'Print kit in hand', how: 'One-pager, savings table, QR cards from Mohan.' },
      { s: 'Company list ready', how: 'By type, with visit days (Tue–Thu, 10–12 and 14–16).' },
      { s: 'Dental day costed', how: 'The free on-site check day offer, costed with Dr Luvi.' },
    ],
    done: 'All four ready — door-to-door starts Tue 29 Sep.', with: 'Fahad · Dr Luvi · Mohan', to: 'segments', toLabel: 'Segment: companies', weight: 2, subs: 0, subsNote: 'Unlocks the corporate 24' },
  { key: 'g-incentives', who: 'gautam', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'Agree the results-only thank-yous with Finance',
    objective: 'Agree how the two small thank-yous are paid: AED 25 to the desk team for each member they sign, and AED 40 to a dentist for each of their own patients who joins.',
    why: 'They reward results, not effort — and they only work if the team knows about them from day one and trusts they will be paid.',
    steps: [
      { s: 'Finance agrees', how: 'Amounts, when they are paid (monthly), and that only paid, active members count.' },
      { s: 'Tracking confirmed', how: 'Each member is counted against the branch or dentist code that brought them.' },
      { s: 'Team told', how: 'After Finance has agreed the terms, Dr Luvi briefs receptionists and dentists before the incentive starts; the Thu 24 Sep refresher does not establish those terms.' },
    ],
    done: 'Agreed with Finance and announced.', with: 'Finance · Dr Luvi', to: 'segments', toLabel: 'Budget', weight: 2, subs: 0, subsNote: 'Supports the existing-patient 60' },
  { key: 'g-bridge', who: 'gautam', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep', task: 'Show how corporate reaches 24 — and settle two product questions',
    objective: 'List every company in play and roughly how many memberships each could bring, to show we have enough (about 72 in play to win 24). Also decide: 4 plans or 3, and who builds the member health score.',
    why: 'Losing Michael Page cut the pipeline. If the numbers do not add up, we must know now — not at Day 30.',
    steps: [
      { s: 'Size each company', how: 'Staff count × likely take-up.' },
      { s: 'Add it up', how: 'Is there 72 or more in play? If not, what closes the gap?' },
      { s: 'Plans: 4 or 3', how: 'Decide whether to simplify the live plans to three.' },
      { s: 'Name owners', how: 'For the member health score, personal care plan and yearly value statement.' },
    ],
    done: 'The list, the total, and both decisions recorded.', with: 'Fahad', to: 'mandate', toLabel: 'Alignment (M4)', weight: 3, subs: 0, subsNote: 'Protects the corporate 24' },
  { key: 'g-arabyads', who: 'gautam', wk: 2, dueIso: '2026-09-30', due: 'Wed 30 Sep', task: 'Get ArabyAds’ answer on staff memberships',
    objective: 'A clear yes or no on whether ArabyAds will offer Smile Club to its own team.',
    why: 'A company we already work with is one of the easiest corporate wins.',
    steps: [
      { s: 'Ask made', how: 'At the go-live meeting.' },
      { s: 'Answer received', how: 'Yes, no, or later.' },
      { s: 'Next step', how: 'Yes → company code and plan within 48 hours; no → ask them to refer someone.' },
    ],
    done: 'Answer recorded with its next step.', with: 'Fahad', to: 'dm', toLabel: 'Outreach status (D3)', weight: 2, subs: 0, subsNote: 'Part of the corporate 24' },
  { key: 'g-cac', who: 'gautam', wk: 2, dueIso: '2026-10-02', due: 'Fri 2 Oct', task: 'Agree the most we can spend to win one member',
    objective: 'With Finance, set the maximum total cost — staff time, commissions, ads, events — we can spend to win one member and still make money.',
    why: 'Without this limit nobody can say whether a channel is worth it. It is needed before the Day-14 spending decision.',
    steps: [
      { s: 'Brief Finance', how: 'Explain what we need and why.' },
      { s: 'Price every cost', how: 'Reconcile the AED 27,000 allocation with staff time, clinical time, commissions, printing, events, ads and included-care assumptions, without counting the same cost twice; compare the complete cost with the indicative AED 30,000 ceiling.' },
      { s: 'Limit agreed', how: 'One number per member, signed off.' },
      { s: 'Shared', how: 'Sent to Fahad before 5 Oct.' },
    ],
    done: 'One agreed number, in writing.', with: 'Finance', to: 'response', toLabel: 'Budget (R2)', weight: 3, subs: 0, subsNote: 'Enabler — decides which lanes get more money' },
  { key: 'g-doors-20', needs: ['g-unlock'], who: 'gautam', wk: 2, dueIso: '2026-10-02', due: 'Fri 2 Oct', task: 'Visit 20 companies and hold first meetings',
    objective: 'Visit 20 suitable companies on Tue 29 Sep–Thu 1 Oct, after the readiness check; complete the visit log and follow-ups by Fri 2 Oct.',
    why: 'Corporate is 24 of the 120, and memberships for a whole team are sold face to face, not online.',
    steps: [
      { s: '10 visited', how: 'Take the one-pager; ask the dental question first.' },
      { s: '20 visited', how: 'Log every visit: company, date, who you met, outcome.' },
      { s: 'Meetings held', how: 'Walk interested companies through the savings table.' },
      { s: 'Benefits check done', how: 'The five questions show each company its dental gap.' },
    ],
    done: '20 visits logged; checks done with every interested company.', with: 'Fahad', to: 'corporate', toLabel: 'Corporate playbook', weight: 4, subs: 0, subsNote: 'Builds the pipeline for the corporate 24' },
  { key: 'g-procure-2', needs: ['m-geo', 'l-onsite-scope'], who: 'gautam', wk: 3, dueIso: '2026-10-08', due: 'Thu 8 Oct', task: 'Order the community print and dental-day kit',
    objective: 'Same route as week 1: the community posters, counter cards and school leaflets (AED 2,000), and the set-up for the two company dental days (AED 3,000) from Dr Luvi’s item list.',
    why: 'The community event, the placements and both dental days depend on these arriving on time.',
    steps: [
      { s: 'Purchase request raised', how: 'Mohan’s print files and Dr Luvi’s dental-day item list, with two quotes each, to Procurement copying Finance. Clinical items already in branch stock are not bought.' },
      { s: 'Approved', how: 'Finance approves against the two budget lines; anything above a line goes to Fahad first.' },
      { s: 'Ordered', how: 'Purchase orders issued; delivery dates confirmed in writing.' },
      { s: 'Delivered and handed over', how: 'Print to Fahad for placement; dental-day kit to Dr Luvi. Record quantities received here.' },
    ],
    done: 'Community print with Fahad; dental-day kit with Dr Luvi.', with: 'Mohan · Dr Luvi · Procurement · Finance', to: 'segments', toLabel: 'Budget (S1b)', weight: 1, subs: 0, subsNote: 'Enabler — materials for the community 24 and the dental days' },
  { key: 'g-day14', who: 'gautam', wk: 2, dueIso: '2026-10-05', due: 'Mon 5 Oct', task: 'Two-week review: spend and corporate decision',
    objective: 'At Day 14, decide whether to release the rest of the budget and whether corporate can still reach 24 — or move effort to the clinics.',
    why: 'Deciding at Day 14 leaves time to recover. Deciding at Day 30 is too late.',
    steps: [
      { s: 'Read the numbers', how: 'Members vs 60 planned, cost per member, source tracking.' },
      { s: 'Corporate check', how: 'Is the company list still big enough for 24?' },
      { s: 'Decide', how: 'Release or hold money; keep corporate or shift effort.' },
      { s: 'Record', how: 'Write down the decision and the reason.' },
    ],
    done: 'Decision recorded and shared with Mr Akbar.', with: 'Fahad · Mr Akbar', to: 'mandate', toLabel: 'Alignment (M4)', weight: 3, subs: 0, subsNote: 'Governance — protects all 120' },
  { key: 'g-assembly', who: 'gautam', wk: 3, dueIso: '2026-10-07', due: 'Wed 7 Oct', task: 'Get Assembly Global’s decision',
    objective: 'A clear yes or no from Assembly Global on a trial for their Dubai team.',
    why: 'A warm introduction through Fahad — one of the strongest corporate chances.',
    steps: [
      { s: 'Follow-up sent', how: 'Short note with the one-pager.' },
      { s: 'Answer received', how: 'Yes, no or later.' },
      { s: 'Next step', how: 'Yes → start the trial plan immediately.' },
    ],
    done: 'Answer recorded.', with: 'Fahad', to: 'dm', toLabel: 'Outreach status (D3)', weight: 2, subs: 0, subsNote: 'Part of the corporate 24' },
  { key: 'g-pilot', who: 'gautam', wk: 3, dueIso: '2026-10-09', due: 'Fri 9 Oct', task: 'Sign the first company trial',
    objective: 'One company signs up for Smile Club for its staff, with everything written down: who is eligible, who pays, the on-site dental day, and how success is judged.',
    why: 'The first signed company is the proof every later company will ask for — and the first real corporate memberships.',
    steps: [
      { s: 'Proposal sent', how: 'Using the standard proposal.' },
      { s: 'Payment agreed', how: 'Company pays all, pays part, or staff pay at a company rate.' },
      { s: 'Details written', how: 'Eligible staff, contact person, on-site day and cost, tracking code, review date.' },
      { s: 'Signed', how: 'Signed agreement filed.' },
    ],
    done: 'Agreement signed with all details.', with: 'Dr Luvi · Fahad', to: 'corporate', toLabel: 'Trial checklist (C10)', weight: 6, subs: 12, subsNote: 'First-company target: 12 distinct paid membership contracts by 21 Oct. Signing the employer agreement does not establish those memberships.' },
  { key: 'g-day21', who: 'gautam', wk: 3, dueIso: '2026-10-12', due: 'Mon 12 Oct', task: 'Three-week review',
    objective: 'Check members joined against 88 planned (75 minimum) and agree fixes the next day if short.',
    why: 'The last chance to change course with more than a week left.',
    steps: [
      { s: 'Read the count', how: 'Members by source vs plan.' },
      { s: 'Review with Fahad', how: 'Which lanes are behind and why.' },
      { s: 'Fix plan', how: 'If short, a written fix by the next working day.' },
    ],
    done: 'Review held; fix plan written if needed.', with: 'Fahad', to: 'kpis', toLabel: 'Controls', weight: 2, subs: 0, subsNote: 'Governance — protects all 120' },
  { key: 'g-launch', needs: ['g-pilot', 'm-launchkit'], who: 'gautam', wk: 5, dueIso: '2026-10-21', due: 'Wed 21 Oct; initial launch Wed 14 Oct', task: 'Launch Smile Club to the company’s staff',
    objective: 'Staff at the signed company receive a message from their CEO or HR showing the included care, price, who pays and how to join. Company-paid, shared-cost and staff-paid offers use different wording.',
    why: 'A signed contract earns nothing until staff actually join. How many staff join is what counts.',
    steps: [
      { s: 'Staff list received', how: 'HR confirms eligibility in the company’s existing private system. This plan and its task notes contain only aggregate counts, with no staff list or contact details.' },
      { s: 'Launch kit approved', how: 'Mohan’s email, WhatsApp card and QR poster.' },
      { s: 'Message sent', how: 'From the CEO or HR, not from us.' },
      { s: 'Joining drive', how: 'Reminders on day 3 and day 7; count joins daily.' },
    ],
    done: 'Message sent and staff joining under the company code.', with: 'Mohan', to: 'corporate', toLabel: 'Launch steps (C9)', weight: 4, subs: 0, subsNote: 'Converts the signed trial into memberships' },
  { key: 'g-onsite', needs: ['l-onsite-scope', 'g-procure-2'], who: 'gautam', wk: 4, dueIso: '2026-10-16', due: 'Fri 16 Oct', task: 'Run the on-site dental day at the company',
    objective: 'Coordinate the two budgeted company dental days within 22 Sep–21 Oct. Name each company and date before confirming delivery. The two events share AED 3,000 materials/set-up funding and a combined target of 12 additional paid memberships, excluding the first trial’s 12.',
    why: 'Seeing a dentist in person is what gets hesitant staff to join and book their first visit.',
    steps: [
      { s: 'Date and cost approved', how: 'Agreed with the company and Dr Luvi.' },
      { s: 'Team and kit ready', how: 'Clinician, banner, forms, QR codes.' },
      { s: 'Day delivered', how: 'Checks done; sign-ups taken.' },
      { s: 'Results logged', how: 'Sign-ups and bookings recorded under the company code.' },
    ],
    done: 'Event delivered; distinct paid, active, non-refunded membership contracts and first bookings reported separately under the event/company code, excluding contracts already counted elsewhere.', with: 'Dr Luvi · Mohan', to: 'corporate', toLabel: 'Corporate playbook', weight: 4, subs: 12, subsNote: 'Remaining ≈12 of the corporate 24' },
  { key: 'g-complete', who: 'gautam', wk: 5, dueIso: '2026-10-21', due: 'Wed 21 Oct', task: 'Close the 30 days and report to Mr Akbar',
    objective: 'Confirm the 120 paying members with Finance and report the result to Mr Akbar, with a handover for the next phase.',
    why: 'The mandate counts only members who paid, are active, have not been refunded and can be traced to a source.',
    steps: [
      { s: 'Final count', how: 'Members by source.' },
      { s: 'Finance check', how: 'Finance confirms every member counted.' },
      { s: 'Handover', how: 'Corporate companies in progress + sales hire plan.' },
      { s: 'Reported', how: 'Presented to Mr Akbar.' },
    ],
    done: 'Finance-confirmed result presented to Mr Akbar.', with: 'Fahad', to: 'kpis', toLabel: 'Measurement', weight: 3, subs: 0, subsNote: 'Confirms all 120' },

  /* ── Dr Luvi — Head of Operations ── */
  { key: 'l-audit', who: 'luvi', wk: 1, dueIso: '2026-09-23', due: 'Wed 23 Sep', task: 'Check each reception desk is ready to sell Smile Club',
    objective: 'Visit or call all three branches and confirm each reception desk has what it needs to offer Smile Club to every patient at checkout.',
    why: 'The chair segment needs 36 paid memberships: 12 per branch. Each desk needs a working QR code, the dentist-to-reception handover and a record of reasons for declining. Dentists’ own messages bring the separate 24.',
    steps: [
      { s: 'Al Wasl checked', how: 'Smile Club QR stand visible at the desk (code SC-ALW); staff know the five-step pitch; a sheet to note why patients say no.' },
      { s: 'Dr Tosun checked', how: 'Same three checks (code SC-TOS).' },
      { s: 'AMC checked', how: 'Same three checks (code SC-AMC).' },
      { s: 'Gaps fixed', how: 'Anything missing is replaced the same day.' },
    ],
    done: 'All three desks have the QR stand, the pitch and the “no” sheet.', with: 'Smile Club Coordinator', to: 'response', toLabel: 'Clinic lane (R1)', weight: 3, subs: 0, subsNote: 'Protects the chair 36' },
  { key: 'l-refresher', who: 'luvi', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: '30-minute refresher for receptionists at each branch',
    objective: 'Remind every receptionist how to offer Smile Club at checkout, which words to use and avoid, and to book the new member’s first appointment before they leave.',
    why: 'Receptionists close the chair segment’s 36 memberships after the dentist recommends Smile Club. The separate 24 come from dentists’ messages to their own patients.',
    steps: [
      { s: 'Al Wasl session', how: 'Practise the five steps: ask, match to the patient’s need, show the value, answer questions, close.' },
      { s: 'Dr Tosun session', how: 'Same, plus: say “membership” and “member rates” — never “insurance”, “coverage” or “claim”.' },
      { s: 'AMC session', how: 'Same, plus: book the first member appointment before the patient leaves.' },
    ],
    done: 'All receptionists at all three branches trained.', with: 'Receptionists', to: 'why', toLabel: 'Words to use', weight: 4, subs: 0, subsNote: 'Protects the chair 36' },
  { key: 'l-brief', who: 'luvi', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep; from Fri 25 Sep', task: 'Brief every dentist one to one — 15 minutes each',
    objective: 'Dr Luvi sits with each of the 18 dentists for 15 minutes on their first clinic day from Fri 25 Sep and walks them through exactly what to do, using the seven-point briefing in the chair playbook (Segments → S2).',
    why: 'A dentist who has not been shown the steps will improvise or skip them. The chair 36 and the dentists’ 24 both start with this conversation.',
    steps: [
      { s: 'Dr. Tosun Dental Clinic — 7 dentists', how: 'Open the “Dentist scripts” tab on a tablet: chair sentence and messages in Turkish and English; each dentist signs a sample card.' },
      { s: 'Al Wasl — 8 dentists', how: 'Same, in Arabic and English. Sunday-only dentists (Dr. Hasna Alsaeed, Dr. Yasmin Youssef) on Sun 27 Sep.' },
      { s: 'AMC — 3 dentists', how: 'Same, in Arabic and English. Dr. Suzanna Almaali on Sun 27 Sep.' },
      { s: 'Approvals recorded', how: 'Each dentist says “approved” for their sentence and messages; note the count here and tick the dentists’ approval task.' },
    ],
    done: 'All 18 dentists briefed; sentences and messages approved.', with: 'Treating dentists', to: 'segments', toLabel: 'Chair playbook (S2)', weight: 3, subs: 0, subsNote: 'Unlocks the chair 36 and the dentists’ 24' },
  { key: 'l-doctor-lists', who: 'luvi', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'Split each dentist’s patients into three groups',
    objective: 'With CRM-DN, group each treating dentist’s own patients once: active patients with a check-up due under their care plan first; among the remaining patients, inactive means last seen 6–18 months ago, including exactly 18 months, and dormant means last seen over 18 months ago.',
    why: 'Mr Akbar’s rule: no blanket messages. Each dentist writes only to their own patients, and a patient due a check-up needs a different message from one we have not seen in two years.',
    steps: [
      { s: 'Confirm the dentists', how: '18 dentists across the three branches are listed in the plan’s “Dentist scripts” tab — confirm the list and anyone missing.' },
      { s: 'Patients per dentist', how: 'Use the dentist who last treated the patient and the last visit date in the existing private patient system. Keep patient records there; show only counts per dentist and group in this plan.' },
      { s: 'Consent check', how: 'Keep only patients who agreed to be contacted; remove anyone who opted out.' },
      { s: 'Three groups each', how: 'Assign active patients due a check-up first, then remaining patients last seen 6–18 months ago to inactive and those last seen over 18 months ago to dormant. Each patient appears once. Check consent and opt-outs before sending.' },
    ],
    done: 'One consent-checked list per dentist, in three groups.', with: 'CRM-DN', to: 'segments', toLabel: 'Segment: our patients', weight: 3, subs: 0, subsNote: 'Unlocks the dentists’ 24' },
  { key: 'l-capacity', who: 'luvi', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'Make sure new members can get appointments',
    objective: 'Check each branch has enough appointment slots for new members, and set a simple rule so members are booked quickly.',
    why: 'Selling memberships we cannot serve leads to cancellations and complaints.',
    steps: [
      { s: 'Count free slots', how: 'Per branch, mornings and evenings.' },
      { s: 'Write the rule', how: 'For example: every member offered a slot within 7 days.' },
      { s: 'Rule at every desk', how: 'All receptionists know it.' },
    ],
    done: 'Slots counted; rule live at all desks.', to: 'offer', toLabel: 'Capacity', weight: 2, subs: 0, subsNote: 'Protects retention of every member' },
  { key: 'l-day7', who: 'luvi', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep', task: 'Week-one clinic results',
    objective: 'Report paid chair memberships by branch: 4 each, 12 in total, by Mon 28 Sep; minimum 3 per branch. Report dentists’ message results separately and record the main reasons patients declined.',
    why: 'The reasons patients say no tell us what to fix in the pitch before week two.',
    steps: [
      { s: 'Count by branch', how: 'Members signed at each desk.' },
      { s: 'Top reasons for no', how: 'From the “no” sheets.' },
      { s: 'Compare with visits', how: 'Members signed vs patients seen.' },
      { s: 'Shared', how: 'At the Monday review.' },
    ],
    done: 'Counts and reasons shared on Monday.', with: 'Receptionists', to: 'response', toLabel: 'Clinic lane (R1)', weight: 2, subs: 0, subsNote: 'Checks 12 of the chair 36; dentist-message memberships are separate' },
  { key: 'l-onboarding', who: 'luvi', wk: 2, dueIso: '2026-09-30', due: 'Wed 30 Sep', task: 'Every new member booked within 7 days',
    objective: 'Make sure every new member has their first appointment booked within a week of joining, and track who actually attends.',
    why: 'A member who never visits feels no value and cancels. The first visit turns a sale into a lasting member.',
    steps: [
      { s: 'Rule written', how: 'First visit booked within 7 days of joining.' },
      { s: 'Desks briefed', how: 'All three branches.' },
      { s: 'Tracking on', how: 'Booked and attended recorded separately.' },
    ],
    done: 'Rule live and first visits tracked.', to: 'layers', toLabel: 'Customer situations', weight: 2, subs: 0, subsNote: 'Protects retention of every member' },
  { key: 'l-review-v1', who: 'luvi', wk: 2, dueIso: '2026-10-01', due: 'Thu 1 Oct', task: 'Clinically check Mohan’s first ad designs',
    objective: 'Read every claim in Mohan’s ads and make sure each is accurate, not alarming, and makes no savings promise we cannot back up.',
    why: 'No ad goes live without a clinical check — it protects patients and the Dental Nation name.',
    steps: [
      { s: 'Designs received', how: 'From Mohan.' },
      { s: 'Claims checked', how: 'Accurate, calm, no unproven savings.' },
      { s: 'Changes sent back', how: 'Clear notes to Mohan.' },
      { s: 'Approved', how: 'Written OK, then weekly checks after.' },
    ],
    done: 'Designs approved in writing.', with: 'Mohan', to: 'why', toLabel: 'Words to use', weight: 2, subs: 0, subsNote: 'Unblocks the Facebook/Instagram ads' },
  { key: 'l-day14', who: 'luvi', wk: 2, dueIso: '2026-10-05', due: 'Mon 5 Oct', task: 'Two-week clinic results',
    objective: 'Report cumulative paid chair memberships: 7 per branch, 21 in total, by Mon 5 Oct; minimum 6 per branch. Report dentists’ message results separately and check appointment capacity.',
    why: 'Feeds the Day-14 spending decision.',
    steps: [
      { s: 'Count by branch', how: 'Members signed at each desk.' },
      { s: 'Appointment check', how: 'Are members getting slots within 7 days?' },
      { s: 'Shared', how: 'At the Monday review.' },
    ],
    done: 'Shared on Monday.', to: 'kpis', toLabel: 'Controls', weight: 2, subs: 0, subsNote: 'Checks 21 of the chair 36; dentist-message memberships are separate' },
  { key: 'l-onsite-scope', who: 'luvi', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'Plan the clinical side of the company dental day',
    objective: 'Prepare the standard clinical scope, equipment list and materials/set-up estimate for the two company dental days before the door-to-door readiness check. Budget: AED 1,500 per day for materials/set-up; show clinician time separately for Finance. Confirm the company-specific details again before each event.',
    why: 'Every event is costed before we commit, so it is never assumed to be cheap.',
    steps: [
      { s: 'Scope agreed', how: 'With Gautam: number of staff, type of checks.' },
      { s: 'Team and kit', how: 'Clinician and materials named.' },
      { s: 'Cost signed', how: 'One number approved.' },
    ],
    done: 'Clinician, kit and cost agreed.', with: 'Gautam', to: 'corporate', toLabel: 'Trial checklist (C10)', weight: 2, subs: 0, subsNote: 'Enables the corporate 24' },
  { key: 'l-csr', who: 'luvi', wk: 3, dueIso: '2026-10-09', due: 'Fri 9 Oct', task: 'First community event near a branch',
    objective: 'Hold one community event — a school, community centre or sports event — with free smile checks and on-the-spot sign-ups.',
    why: 'Community events are 4 of the 120 and reach families who may not have visited us yet.',
    steps: [
      { s: 'Event chosen', how: 'Near a branch, with families.' },
      { s: 'Costed', how: 'Staff, time, materials.' },
      { s: 'Clinician assigned', how: 'Named in advance.' },
      { s: 'Held', how: 'Sign-ups recorded with the event code.' },
    ],
    done: 'Event delivered; distinct paid, active, non-refunded membership contracts and first bookings reported separately under the event/company code, excluding contracts already counted elsewhere.', with: 'Fahad', to: 'response', toLabel: 'Community lane (R1)', weight: 2, subs: 4, subsNote: 'The 4 community-event memberships' },
  { key: 'l-day21', who: 'luvi', wk: 3, dueIso: '2026-10-12', due: 'Mon 12 Oct', task: 'Three-week clinic results',
    objective: 'Report cumulative paid chair memberships: 10 per branch, 30 in total, by Mon 12 Oct; minimum 9 per branch. Report dentists’ message results separately and identify recovery actions for any branch behind pace.',
    why: 'Nine days left — a branch that is behind needs help now.',
    steps: [
      { s: 'Count by branch', how: 'Members signed at each desk.' },
      { s: 'Fix actions', how: 'For any branch behind: extra coaching, a daily check-in.' },
      { s: 'Shared', how: 'At the Monday review.' },
    ],
    done: 'Shared with fixes agreed.', to: 'kpis', toLabel: 'Controls', weight: 2, subs: 0, subsNote: 'Checks 30 of the chair 36; dentist-message memberships are separate' },
  { key: 'l-onsite-deliver', who: 'luvi', wk: 4, dueIso: '2026-10-16', due: 'Fri 16 Oct', task: 'Run the clinical side of the company dental day',
    objective: 'Deliver the dental checks to our usual standard and book each interested employee’s first visit.',
    why: 'A good first experience turns a company deal into staff who actually use Smile Club.',
    steps: [
      { s: 'Team briefed', how: 'What to check, what to say.' },
      { s: 'Checks done', how: 'To clinic standard.' },
      { s: 'First visits booked', how: 'Before staff leave.' },
      { s: 'Follow-up', how: 'Check who attended their first visit.' },
    ],
    done: 'Clinical checks delivered and requested first visits booked; attendance follow-up handed to the existing member-onboarding routine.', with: 'Gautam · Mohan', to: 'corporate', toLabel: 'Corporate playbook', weight: 3, subs: 0, subsNote: 'Supports the corporate 24' },
  { key: 'l-smilescore', who: 'luvi', wk: 4, dueIso: '2026-10-19', due: 'Mon 19 Oct', task: 'Draft the member health check',
    objective: 'Draft the simple health check each new member gets on their first visit: gums, decay risk, cleaning, bite, and whether they are keeping up with check-ups.',
    why: 'A clear first-visit result is what makes membership feel valuable — it becomes the member’s personal care plan.',
    steps: [
      { s: 'Areas listed', how: 'The five areas to check.' },
      { s: 'Simple ratings', how: 'For example: good / needs attention / priority.' },
      { s: 'Draft shared', how: 'With Gautam and Fahad for the build decision.' },
    ],
    done: 'Draft shared.', to: 'why', toLabel: 'Member journey', weight: 1, subs: 0, subsNote: 'Protects renewals after the 30 days' },
  { key: 'l-in60', who: 'luvi', wk: 5, dueIso: '2026-10-21', due: 'Wed 21 Oct', task: 'Deliver the existing-patient 60 and check refunds',
    objective: 'Confirm the 60 from our existing patients — 36 from the chair and 24 from the dentists’ messages — and make sure none has cancelled or been refunded.',
    why: 'Only paid, active members count toward the 120.',
    steps: [
      { s: 'Totals', how: '12 per branch from the chair + 24 from the dentists’ messages, by dentist code.' },
      { s: 'Refund check', how: 'Remove any cancelled or refunded.' },
      { s: 'Sent to Finance', how: 'For the final confirmation.' },
    ],
    done: '60 confirmed and handed to Finance.', to: 'mandate', toLabel: 'What counts as a member', weight: 3, subs: 0, subsNote: 'Confirms the existing-patient 60: chair 36 plus dentist-message 24, with no contract counted twice' },

  /* ── Treating dentists — Dr Hasna, Dr Tosun, Dr Maysoon and every other treating dentist (Dr Luvi updates) ── */
  { key: 'd-pitch', needs: ['l-brief', 'm-invite'], who: 'doctors', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep; each dentist starts the day they are briefed', task: 'The one-sentence recommendation in the chair',
    objective: 'At the end of every check-up or cleaning, each dentist recommends Smile Club in one sentence tailored to what they just saw, and hands over a signed invitation card.',
    why: 'Patients act on their own dentist’s advice far more than on a receptionist or a poster. This one sentence is what makes the checkout conversation easy.',
    steps: [
      { s: 'Briefed by Dr Luvi', how: '15 minutes one to one: which patients, the moment, your own sentence from the “Dentist scripts” tab, the signed card and the hand-over line.' },
      { s: 'Use it every visit', how: 'End of every check-up and cleaning — never mid-treatment or with a patient in pain.' },
      { s: 'Hand the card', how: 'The signed invitation card; the receptionist takes it from there.' },
    ],
    done: 'Every dentist using the recommendation daily.', with: 'Dr Luvi · receptionists', to: 'segments', toLabel: 'Segment: in the chair', weight: 4, subs: 0, subsNote: 'Drives the chair 36 (counted at the desk)' },
  { key: 'd-approve', needs: ['l-brief'], who: 'doctors', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep; in Dr Luvi’s briefing', task: 'Approve your own three WhatsApp messages',
    objective: 'Each dentist reads and approves, in their own words and in both branch languages, the three group messages that will go to their own patients: due a check-up, not seen in a while, not seen for a long time.',
    why: 'The message comes from the dentist the patient knows. Nothing goes out in a dentist’s name that the dentist has not approved.',
    steps: [
      { s: 'Drafts received', how: 'Your three group messages (active, inactive, dormant) are in the “Dentist scripts” tab, in your branch’s two languages: Turkish + English at Dr. Tosun Dental Clinic, Arabic + English at Al Wasl and Al Maher.' },
      { s: 'Own words', how: 'Adjust the tone so it sounds like you, and check the Turkish or Arabic reads naturally. Each message goes to a group — no patient names.' },
      { s: 'Approved', how: 'Reply “approved” to Dr Luvi.' },
    ],
    done: 'Every dentist has approved their three messages.', with: 'Dr Luvi', to: 'segments', toLabel: 'Segment: our patients', weight: 2, subs: 0, subsNote: 'Unlocks the dentists’ 24' },
  { key: 'd-active', needs: ['c-doctor-send'], who: 'doctors', wk: 2, dueIso: '2026-10-02', due: 'Fri 2 Oct; starts Tue 29 Sep', task: 'Wave 1 — your patients who are due a check-up',
    objective: 'Each dentist messages only their own active patients whose check-up is due, after consent, opt-outs, dentist-reviewed wording and the required human sign-off are checked. All messages combined stay within 20 per dentist per day. Answer replies the same day; offer a booking only if the patient wants one and stop messages immediately on opt-out.',
    why: 'These patients are the warmest: they visit, they trust their dentist, and a check-up is due anyway. We learn here before writing to colder groups.',
    steps: [
      { s: 'Dr Hasna’s list sent', how: 'In daily batches of up to 20; code SC-DR-HASNA.' },
      { s: 'Dr Tosun’s list sent', how: 'Same; code SC-DR-TOSUN.' },
      { s: 'Dr Maysoon’s list sent', how: 'Same; code SC-DR-MAYSOON.' },
      { s: 'Every other dentist sent', how: 'Same, each with their own code.' },
      { s: 'Replies booked', how: 'Answer every reply the same day; arrange a booking only when requested, and stop further messages for anyone opting out.' },
    ],
    done: 'The scheduled, consent-checked batches are sent within the combined daily limit; replies are answered, requested bookings arranged and opt-outs honoured. Paid memberships are reported separately from messages and bookings.', with: 'CRM-DN · receptionists', to: 'segments', toLabel: 'Segment: our patients', weight: 5, subs: 10, subsNote: '10 of the dentists’ 24' },
  { key: 'd-inactive', needs: ['d-active'], who: 'doctors', wk: 3, dueIso: '2026-10-09', due: 'Fri 9 Oct; starts Mon 5 Oct', task: 'Wave 2 — your patients not seen in 6–18 months',
    objective: 'Each dentist messages only their own patients last seen 6–18 months ago, after consent, opt-outs, dentist-reviewed wording and the required human sign-off are checked. All messages combined stay within 20 per dentist per day. Answer replies the same day; offer a booking only if the patient wants one and stop messages immediately on opt-out.',
    why: 'They know us but have lapsed. A personal note from their own dentist is the most natural way back — and Smile Club keeps them coming.',
    steps: [
      { s: 'Message adjusted', how: 'Using the replies and joins from wave 1.' },
      { s: 'All dentists sent', how: 'Daily batches of up to 20, each dentist’s own code.' },
      { s: 'Replies booked', how: 'Answer the same day; arrange requested bookings and honour opt-outs immediately.' },
    ],
    done: 'The scheduled, consent-checked batches are sent within the combined daily limit; replies are answered, requested bookings arranged and opt-outs honoured. Paid memberships are reported separately from messages and bookings.', with: 'CRM-DN', to: 'segments', toLabel: 'Segment: our patients', weight: 4, subs: 8, subsNote: '8 of the dentists’ 24' },
  { key: 'd-dormant', needs: ['d-inactive'], who: 'doctors', wk: 4, dueIso: '2026-10-16', due: 'Fri 16 Oct; starts Mon 12 Oct', task: 'Wave 3 — your patients not seen for over 18 months',
    objective: 'Each dentist messages only their own patients last seen over 18 months ago, after consent, opt-outs, dentist-reviewed wording and the required human sign-off are checked. All messages combined stay within 20 per dentist per day. Answer replies the same day; offer a booking only if the patient wants one and stop messages immediately on opt-out.',
    why: 'The coldest group, so it goes last and softest. Even a small share returning adds members and patients.',
    steps: [
      { s: 'Message softened', how: 'No pressure; first check-up included.' },
      { s: 'All dentists sent', how: 'At most 20 messages per dentist per day across all sends, only to their own consent-checked patients, with their own tracking code.' },
      { s: 'Replies booked', how: 'Answer the same day; arrange requested bookings and honour opt-outs immediately.' },
    ],
    done: 'The scheduled, consent-checked batches are sent within the combined daily limit; replies are answered, requested bookings arranged and opt-outs honoured. Paid memberships are reported separately from messages and bookings.', with: 'CRM-DN', to: 'segments', toLabel: 'Segment: our patients', weight: 3, subs: 6, subsNote: '6 of the dentists’ 24' },

  /* ── Mohan — videographer & content designer ── */
  { key: 'm-invite', who: 'mohan', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Dentist-signed invitation cards',
    objective: 'A small printed card — “Dr ___ recommends Smile Club for you” — that each dentist signs and hands to the patient, with a QR code to join.',
    why: 'It turns the dentist’s spoken recommendation into something the patient carries to the desk and home.',
    steps: [
      { s: 'Designed', how: 'To the spec in the budget (S1b → invitation cards): A6, two sides — front “Dr ____ recommends Smile Club for you”, reason boxes, signature and date; back what is included, from AED 99 a month, QR with the branch code. Arabic + English for Al Wasl and AMC; Turkish + English for Dr. Tosun Dental Clinic.' },
      { s: 'Checked', how: 'By Dr Luvi.' },
      { s: 'Print files to Gautam', how: 'Print-ready PDF per branch (3 mm bleed) plus the QR stand insert, sent to Gautam, who orders them through Procurement.' },
    ],
    done: 'Print files with Gautam; the cards reach treatment rooms through his order.', with: 'Dr Luvi', to: 'segments', toLabel: 'Segment: in the chair', weight: 2, subs: 0, subsNote: 'Supports the chair 36' },
  { key: 'm-onboard', who: 'mohan', wk: 1, dueIso: '2026-09-23', due: 'Wed 23 Sep', task: 'Learn the brief and the words to use',
    objective: 'Read the plan’s “Why” and “Customer situations” pages so every design speaks to one kind of customer and never uses insurance words.',
    why: 'A parent, a patient worried about cost and an HR manager each need a different message. One message for everyone does not work.',
    steps: [
      { s: 'Log in', how: 'Use the dashboard login Fahad sent.' },
      { s: 'Read the two pages', how: '“Why & proposition” and “Layers & demand states”.' },
      { s: 'Questions answered', how: '15 minutes with Fahad.' },
    ],
    done: 'Brief understood; questions answered.', to: 'layers', toLabel: 'Customer situations', weight: 1, subs: 0, subsNote: 'Enabler — every design depends on it' },
  { key: 'm-video-yasmin', who: 'mohan', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Finish Dr. Yasmin Youssef’s video from the team’s comments', scripts: ['yasmin-youssef'],
    objective: 'Apply the team’s and Fahad’s comments to the video filmed with Dr. Yasmin Youssef (Orthodontist, Dental Nation Al Wasl) and get it approved.',
    why: 'It is the first dentist video — it sets the standard for every one that follows, so the comments need to land before the next shoots.',
    steps: [
      { s: 'Comments collected', how: 'Every comment from the team and Fahad added to this task (use “Add a comment” below) — nothing lost in chat.' },
      { s: 'Edits made', how: 'Each comment applied, checked against Dr. Yasmin’s scripts below (Arabic + English, as Al Wasl’s default). If the footage has only one language, add subtitles in the other.' },
      { s: 'Dentist approves', how: 'Dr. Yasmin Youssef approves the final cut.' },
      { s: 'Final exported', how: 'Full version + 15 s and 6 s cuts, filed for use.' },
    ],
    done: 'Approved final video with short cuts, all comments resolved.', with: 'Fahad · Dr Luvi', to: 'scripts', toLabel: 'Dentist scripts', weight: 2, subs: 0, subsNote: 'Supports the dentists’ 24 and the website 12' },
  { key: 'm-shoot-tosun', who: 'mohan', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'Shoot 1 — Dr. Yahya Tosun (Dr. Tosun Dental Clinic)', scripts: ['yahya-tosun'],
    objective: 'One appointment, two videos: Dr. Yahya Tosun’s Smile Club video and The DN Scan (braces & aligner planning) video — each filmed in Turkish and English — with first cuts shared for review.',
    why: 'Dr. Tosun Dental Clinic is a Turkish specialty clinic, so patients hear their own dentist in Turkish first. Filming the campaign video in the same session doubles what one appointment gives us.',
    steps: [
      { s: 'Scripts approved', how: 'Dr. Yahya Tosun reads both scripts below in both languages and approves or adjusts them; the Turkish is checked for natural wording.' },
      { s: 'Consent ready', how: 'Written consent forms for anyone else who appears on camera.' },
      { s: 'Filmed — four takes', how: 'Smile Club in Turkish, then English; change the framing; DN Scan in Turkish, then English. Clinical areas tidy, no patient identifiable without consent.' },
      { s: 'First cuts shared', how: 'All four posted to this task for comments from the team.' },
    ],
    done: 'Four first cuts (two videos × Turkish and English) shared here for review.', with: 'Dr. Yahya Tosun', to: 'scripts', toLabel: 'Dentist scripts', weight: 2, subs: 0, subsNote: 'Supports the dentists’ 24' },
  { key: 'm-shoot-dilsad', who: 'mohan', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'Shoot 2 — Dr. Dilsad Ozdogan (Dr. Tosun Dental Clinic)', scripts: ['dilsad-ozdogan'],
    objective: 'One appointment, two videos: Dr. Dilsad Ozdogan’s Smile Club video and The DN Glow Up (whitening) video — each filmed in Turkish and English — with first cuts shared for review.',
    why: 'A general dentist speaks to the largest group of patients, so the Smile Club video will be used the most. Glow Up has no video yet and its Facebook/Instagram campaign is waiting for one.',
    steps: [
      { s: 'Scripts approved', how: 'Dr. Dilsad Ozdogan reads both scripts below in both languages and approves or adjusts them; the Turkish is checked for natural wording.' },
      { s: 'Consent ready', how: 'Written consent forms for anyone else who appears on camera.' },
      { s: 'Filmed — four takes', how: 'Smile Club in Turkish, then English; change the framing; Glow Up in Turkish, then English. Clinical areas tidy, no patient identifiable without consent.' },
      { s: 'First cuts shared', how: 'All four posted to this task for comments from the team.' },
    ],
    done: 'Four first cuts (two videos × Turkish and English) shared here for review.', with: 'Dr. Dilsad Ozdogan', to: 'scripts', toLabel: 'Dentist scripts', weight: 2, subs: 0, subsNote: 'Supports the dentists’ 24' },
  { key: 'm-wa-creative', needs: ['f-call-actions'], who: 'mohan', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep', task: 'WhatsApp follow-up creative — image card and message text',
    objective: 'One image card and the matching short message for the enquiry follow-up, in English and Arabic, plus Turkish for Dr. Tosun Dental Clinic — ready for CRM-DN to load into Zavis.',
    why: 'Gautam cannot switch the follow-up on without it, and Zavis needs the final files before the templates can be approved.',
    steps: [
      { s: 'Brief from Gautam', how: 'The approved offer, who receives it (enquired but not booked; “let me think” at the desk) and the languages.' },
      { s: 'Designed', how: 'Square image 1080 × 1080 px, JPG under 1 MB; message under 550 characters with the offer, “from AED 99 a month”, the join link and “Reply STOP to opt out”.' },
      { s: 'Checked', how: 'Dr Luvi checks the clinical wording; no insurance words.' },
      { s: 'Handed over', how: 'Final files to CRM-DN for Zavis, and posted to this task.' },
    ],
    done: 'Approved files with CRM-DN.', with: 'Gautam · Dr Luvi', to: 'segments', toLabel: 'Segment: searching online', weight: 1, subs: 0, subsNote: 'Enabler — unblocks the follow-up' },
  { key: 'm-banner', who: 'mohan', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Design the website banner (English and Arabic)',
    objective: 'A thin banner reading “Smile Club — dental care from AED 99/month → Join” that visitors can close.',
    why: 'It shows Smile Club to every website visitor at zero ad cost.',
    steps: [
      { s: 'English version', how: 'Clear, one line, obvious button.' },
      { s: 'Arabic version', how: 'Same, properly translated.' },
      { s: 'Approved', how: 'By Fahad.' },
      { s: 'Sent to CRM-DN', how: 'For building on the website.' },
    ],
    done: 'Both versions with CRM-DN.', with: 'CRM-DN', to: 'dm', toLabel: 'Channel plan (D1)', weight: 2, subs: 0, subsNote: 'Feeds ≈2 of the website 12' },
  { key: 'm-printkit', who: 'mohan', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'Print materials for Gautam’s company visits',
    objective: 'Update and print the one-page Smile Club summary and savings table (English and Arabic), a banner for dental days, and QR cards.',
    why: 'Gautam starts visiting companies next week. He needs something professional to leave behind.',
    steps: [
      { s: 'One-pager + savings table', how: 'From Gautam’s existing files.' },
      { s: 'Dental-day banner', how: 'Pull-up banner design.' },
      { s: 'QR cards', how: 'Linking to the joining page.' },
      { s: 'Files to Gautam', how: 'Print-ready PDFs and quantities sent to Gautam, who orders through Procurement within the AED 1,500 corporate print budget.' },
    ],
    done: 'Print files and quantities with Gautam for ordering.', with: 'Gautam', to: 'response', toLabel: 'Corporate (R1)', weight: 3, subs: 0, subsNote: 'Enables the corporate 24' },
  { key: 'm-dynamic-v1', who: 'mohan', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep', task: 'First set of ad designs — the key unlock',
    objective: '9 ad designs: 3 shapes (square, portrait, full-screen story) × 3 messages (worried about cost · parents · existing patients).',
    why: 'Facebook and Instagram’s better ad formats need several designs per ad. Without them the ads stay limited — this set is what unlocks the paid lanes.',
    steps: [
      { s: '“Worried about cost” set', how: '3 shapes: “Know where you stand before problems become expensive.”' },
      { s: 'Parents set', how: '3 shapes: “One membership, one dental home for the family.”' },
      { s: 'Existing patients set', how: '3 shapes: “You already trust Dental Nation.”' },
      { s: 'Sent for checking', how: 'To Dr Luvi for the clinical check.' },
    ],
    done: '9 designs with Dr Luvi.', with: 'Dr Luvi', to: 'dm', toLabel: 'Creative blocker (D2)', weight: 4, subs: 0, subsNote: 'Unlocks ≈7 of the website 12' },
  { key: 'm-videos', who: 'mohan', wk: 2, dueIso: '2026-10-02', due: 'Fri 2 Oct', task: 'Three short videos',
    objective: 'A doctor explaining why prevention matters, a 30-second “what’s included”, and a real member’s story — each also cut to 15 and 6 seconds.',
    why: 'Video builds the trust a membership needs. Short versions fit Reels and Stories.',
    steps: [
      { s: 'Scripts approved', how: 'By Dr Luvi.' },
      { s: 'Filmed', how: 'Written consent from anyone identifiable.' },
      { s: 'Edited', how: 'Full versions.' },
      { s: 'Short cuts', how: '15 and 6 seconds.' },
    ],
    done: 'All three videos and short cuts approved.', with: 'Dr Luvi', to: 'layers', toLabel: 'Customer situations', weight: 3, subs: 0, subsNote: 'Supports the website 12 and promoters' },
  { key: 'm-creator', who: 'mohan', wk: 2, dueIso: '2026-10-02', due: 'Fri 2 Oct', task: 'Guide for family promoters',
    objective: 'A simple guide and template for the promoters Fahad signs, so their posts are on-message and use their tracking code.',
    why: 'Promoters are 7 of the 120. A guide keeps them accurate and consistent.',
    steps: [
      { s: 'Guide written', how: 'Do’s, don’ts, words to avoid.' },
      { s: 'Template built', how: 'A ready-made post layout.' },
      { s: 'Approved', how: 'By Fahad.' },
    ],
    done: 'Guide with every promoter.', with: 'Fahad', to: 'response', toLabel: 'Promoters (R1)', weight: 2, subs: 0, subsNote: 'Supports 7 promoter memberships' },
  { key: 'm-launchkit', who: 'mohan', wk: 2, dueIso: '2026-10-05', due: 'Mon 5 Oct', task: 'Staff launch kit for signed companies',
    objective: 'An email, WhatsApp card and QR poster for each company’s funding arrangement: “Your company offers access to Smile Club. See the included care, price and who pays, then choose whether to join.” Company-paid, shared-cost and staff-paid versions state their terms clearly.',
    why: 'Must be ready before the first company signs, so staff can start joining the same day.',
    steps: [
      { s: 'Email', how: 'Short, from the company’s CEO or HR.' },
      { s: 'WhatsApp card', how: 'One image, one link.' },
      { s: 'QR poster', how: 'For the office.' },
      { s: 'Approved', how: 'By Gautam.' },
    ],
    done: 'Kit approved and ready.', with: 'Gautam', to: 'corporate', toLabel: 'Launch steps (C9)', weight: 2, subs: 0, subsNote: 'Enables the corporate 24' },
  { key: 'm-linkedin', who: 'mohan', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'LinkedIn posts for HR managers + benefits checklist',
    objective: 'A set of LinkedIn posts (“Dental benefits made simple”) and a one-page, five-question dental benefits checklist for Gautam to leave behind.',
    why: 'Warms up HR managers before Gautam visits and gives him a reason to follow up.',
    steps: [
      { s: 'Posts designed', how: '6 posts.' },
      { s: 'Checklist designed', how: 'The five questions on one page.' },
      { s: 'Approved', how: 'By Gautam and Fahad.' },
    ],
    done: 'Posts and checklist approved.', with: 'Gautam · Fahad', to: 'corporate', toLabel: 'Selling to companies (C7)', weight: 1, subs: 0, subsNote: 'Supports the corporate 24' },
  { key: 'm-geo', who: 'mohan', wk: 3, dueIso: '2026-10-07', due: 'Wed 7 Oct', task: 'Printed community material',
    objective: 'Lobby posters, pharmacy/gym counter cards and a school leaflet — each with a QR code.',
    why: 'Awareness now happens offline, near the branches. Each piece needs its own code so we can see which places bring members.',
    steps: [
      { s: 'Designed', how: 'Poster, counter card, school leaflet — English and Arabic.' },
      { s: 'Clinically checked', how: 'By Dr Luvi.' },
      { s: 'Printed', how: 'Within the AED 2,000 community print budget; handed to Fahad.' },
    ],
    done: 'All three printed with QR codes.', with: 'Fahad', to: 'segments', toLabel: 'Segment: families & neighbourhoods', weight: 1, subs: 0, subsNote: 'Supports the community lane' },
  { key: 'm-v2', who: 'mohan', wk: 4, dueIso: '2026-10-15', due: 'Thu 15 Oct', task: 'Second set of ads — more of what worked',
    objective: 'Re-make the ads that performed best and drop the ones that did not.',
    why: 'Money should go only behind designs that are proven to bring members.',
    steps: [
      { s: 'Review results', how: 'With Fahad: which designs brought enquiries.' },
      { s: 'Remake winners', how: 'New versions of the best ones.' },
      { s: 'List designs to stop', how: 'Recommend which designs to stop; Fahad manages the ad account and makes the changes.' },
      { s: 'Second set handed over', how: 'After Dr Luvi’s clinical check, send the final designs to Fahad for launch.' },
    ],
    done: 'Clinically checked designs and the recommended stop list delivered to Fahad.', with: 'Fahad', to: 'dm', toLabel: 'Channel plan', weight: 2, subs: 0, subsNote: 'Supports the website 12' },
  { key: 'm-film-onsite', who: 'mohan', wk: 4, dueIso: '2026-10-16', due: 'Fri 16 Oct', task: 'Film the company dental day',
    objective: 'Capture photos and video of the dental day for future marketing.',
    why: 'Real footage of a company day is the strongest proof for the next companies.',
    steps: [
      { s: 'Permission first', how: 'Written consent from anyone identifiable; the company approves before anything is published.' },
      { s: 'Filmed', how: 'On the day.' },
      { s: 'Edited', how: 'Consent checked again before use.' },
    ],
    done: 'Footage edited with all permissions.', with: 'Gautam · Dr Luvi', to: 'corporate', toLabel: 'Permissions', weight: 1, subs: 0, subsNote: 'Supports future corporate sales' },
  { key: 'm-library', who: 'mohan', wk: 5, dueIso: '2026-10-20', due: 'Tue 20 Oct', task: 'Organise all designs for the next phase',
    objective: 'File every design with who it is for, its format, when it was approved and how it performed.',
    why: 'The next phase starts from what worked instead of from scratch.',
    steps: [
      { s: 'Filed', how: 'One shared folder.' },
      { s: 'Labelled', how: 'Audience, format, approval date, result.' },
      { s: 'Handed over', how: 'To Fahad.' },
    ],
    done: 'Library handed over.', to: 'dm', toLabel: 'Channel plan', weight: 1, subs: 0, subsNote: 'For the next phase' },

  /* ── Receptionists — all three branches ── */
  { key: 'r-refresher', who: 'reception', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Attend the 30-minute refresher',
    objective: 'Every receptionist practises offering Smile Club at checkout with Dr Luvi.',
    why: 'The desk closes the chair segment’s 36 paid memberships after the dentist recommends Smile Club: 12 per branch.',
    steps: [
      { s: 'Al Wasl attended', how: 'All receptionists on shift.' },
      { s: 'Dr Tosun attended', how: 'All receptionists on shift.' },
      { s: 'AMC attended', how: 'All receptionists on shift.' },
    ],
    done: 'Every receptionist trained.', with: 'Dr Luvi', to: 'why', toLabel: 'Words to use', weight: 2, subs: 0, subsNote: 'Prepares the chair 36' },
  { key: 'r-pace-6', who: 'reception', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep', task: 'Reach 4 paid chair memberships per branch in total',
    objective: 'Each branch signs 4 paying members (3 at the very least) in the first week — the dentist recommends in the chair, you close at checkout.',
    why: 'An early, steady pace makes the final target of 12 paid chair memberships per branch possible.',
    steps: [
      { s: 'Al Wasl: 4', how: 'Pick up the dentist’s recommendation; show the saving on today’s bill; book the first member visit.' },
      { s: 'Dr Tosun: 4', how: 'Same; note every “no” and why.' },
      { s: 'AMC: 4', how: 'Same; report the count at the 09:00 meeting.' },
    ],
    done: 'Each branch at 4 or more.', to: 'response', toLabel: 'Clinic lane (R1)', weight: 5, subs: 12, subsNote: '12 → 12 of the chair 36 (dentist recommends, you close)' },
  { key: 'r-pace-10', who: 'reception', wk: 2, dueIso: '2026-10-05', due: 'Mon 5 Oct', task: 'Reach 7 paid chair memberships per branch in total',
    objective: 'Each branch reaches 7 members in total (6 at the very least). New this week: offer the Family plan to parents.',
    why: 'Families are one of the strongest groups for Smile Club.',
    steps: [
      { s: 'Al Wasl: 7', how: 'Parents hear “one membership for the whole family”.' },
      { s: 'Dr Tosun: 7', how: 'Same.' },
      { s: 'AMC: 7', how: 'Same.' },
    ],
    done: 'Each branch at 7 or more.', to: 'layers', toLabel: 'Customer situations', weight: 6, subs: 9, subsNote: '+9 → 21 of the chair 36 (dentist recommends, you close)' },
  { key: 'r-pace-15', who: 'reception', wk: 3, dueIso: '2026-10-12', due: 'Mon 12 Oct', task: 'Reach 10 paid chair memberships per branch in total',
    objective: 'Each branch reaches 10 members in total (9 at the very least). New this week: ask patients with a treatment plan whether member rates would help.',
    why: 'Patients already planning treatment gain the most from member rates.',
    steps: [
      { s: 'Al Wasl: 10', how: '“Would member rates help with your treatment plan?”' },
      { s: 'Dr Tosun: 10', how: 'Same.' },
      { s: 'AMC: 10', how: 'Same.' },
    ],
    done: 'Each branch at 10 or more.', to: 'layers', toLabel: 'Customer situations', weight: 7, subs: 9, subsNote: '+9 → 30 of the chair 36 (dentist recommends, you close)' },
  { key: 'r-corp-members', who: 'reception', wk: 4, dueIso: '2026-10-13', due: 'Tue 13 Oct', task: 'Welcome staff from signed companies',
    objective: 'Before the 14 Oct staff launch, brief every desk on the company code, eligibility and funding terms; welcome arriving staff and arrange their requested first visit.',
    why: 'Their first experience at the desk decides whether company staff keep using Smile Club.',
    steps: [
      { s: 'Briefed on company codes', how: 'Know which companies have signed.' },
      { s: 'First company member booked', how: 'Activated and welcomed.' },
      { s: 'Routine at all desks', how: 'Every branch does the same.' },
    ],
    done: 'Company members recognised at all three desks.', with: 'Gautam', to: 'corporate', toLabel: 'Staff journey (C1)', weight: 2, subs: 0, subsNote: 'Supports the corporate 24' },
  { key: 'r-target-20', who: 'reception', wk: 5, dueIso: '2026-10-21', due: 'Wed 21 Oct', task: 'Reach 12 paid chair memberships per branch in total',
    objective: 'Each branch reaches 12 paying members from the chair, each with the branch code, an active card and a first visit booked.',
    why: '12 × 3 branches = 36. The other 24 of our existing patients come from the dentists’ own WhatsApp messages.',
    steps: [
      { s: 'Al Wasl: 12', how: 'All with the branch code and a first visit booked.' },
      { s: 'Dr Tosun: 12', how: 'Same.' },
      { s: 'AMC: 12', how: 'Same.' },
    ],
    done: 'Each branch at 12.', to: 'mandate', toLabel: 'What counts as a member', weight: 10, subs: 6, subsNote: '+6 → 36 of the chair 36 (dentist recommends, you close)' },
];

const SEG_OF: Record<string, SegmentId> = {
  'g-incentives': 'chair',
  'l-audit': 'chair',
  'l-refresher': 'chair',
  'l-capacity': 'chair',
  'l-day7': 'chair',
  'l-onboarding': 'chair',
  'l-day14': 'chair',
  'l-day21': 'chair',
  'l-in60': 'chair',
  'l-smilescore': 'chair',
  'r-refresher': 'chair',
  'r-pace-6': 'chair',
  'r-pace-10': 'chair',
  'r-pace-15': 'chair',
  'r-target-20': 'chair',
  'd-pitch': 'chair',
  'm-invite': 'chair',
  'l-doctor-lists': 'patients',
  'm-video-yasmin': 'patients',
  'm-shoot-tosun': 'patients',
  'm-shoot-dilsad': 'patients',
  'd-approve': 'patients',
  'd-active': 'patients',
  'd-inactive': 'patients',
  'd-dormant': 'patients',
  'c-doctor-send': 'patients',
  'c-triggers': 'patients',
  'c-retarget': 'search',
  'c-wa-setup': 'search',
  'm-wa-creative': 'search',
  'l-brief': 'chair',
  'g-procure': 'corporate',
  'g-procure-2': 'community',
  'c-scoring': 'patients',
  'g-crm-test': 'patients',
  'f-call-actions': 'patients',
  'g-assets': 'corporate',
  'g-doors-15': 'corporate',
  'g-unlock': 'corporate',
  'g-bridge': 'corporate',
  'g-arabyads': 'corporate',
  'g-doors-20': 'corporate',
  'g-assembly': 'corporate',
  'g-pilot': 'corporate',
  'g-launch': 'corporate',
  'g-onsite': 'corporate',
  'f-warm-doors': 'corporate',
  'f-linkedin': 'corporate',
  'l-onsite-scope': 'corporate',
  'l-onsite-deliver': 'corporate',
  'm-printkit': 'corporate',
  'm-launchkit': 'corporate',
  'm-linkedin': 'corporate',
  'm-film-onsite': 'corporate',
  'r-corp-members': 'corporate',
  'f-keywords': 'search',
  'f-meta': 'search',
  'f-google-gate': 'search',
  'c-landing': 'search',
  'c-contact': 'search',
  'c-banner': 'search',
  'm-banner': 'search',
  'm-dynamic-v1': 'search',
  'm-videos': 'search',
  'm-v2': 'search',
  'l-review-v1': 'search',
  'f-partners': 'community',
  'f-awareness': 'community',
  'l-csr': 'community',
  'm-creator': 'community',
  'm-geo': 'community',
};

export const TEAM_TASKS: TeamTask[] = TASKS_RAW.map((t) => ({ ...t, seg: SEG_OF[t.key] }));

export const TASK_BY_KEY: Record<string, TeamTask> = Object.fromEntries(TEAM_TASKS.map((t) => [t.key, t]));

/** Prerequisite tasks not yet complete — what this task is waiting on. */
export function waitingOn(t: TeamTask, progress: Record<string, { stage: number; status: string } | undefined>): TeamTask[] {
  return (t.needs ?? [])
    .map((k) => TASK_BY_KEY[k])
    .filter((n): n is TeamTask => !!n && !((progress[n.key]?.stage ?? 0) >= n.steps.length || progress[n.key]?.status === 'done'));
}

/** Total weight — used to express each task's weight as % of the programme. */
export const TOTAL_WEIGHT = TEAM_TASKS.reduce((a, t) => a + t.weight, 0);
export const weightPct = (t: TeamTask) => Math.round((t.weight / TOTAL_WEIGHT) * 1000) / 10;

/** Live state of one task, as loaded from lane_e.tasks. */
export interface TaskProgress {
  stage: number; // steps completed, 0..steps.length
  status: 'open' | 'in_progress' | 'done' | 'blocked';
  note: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  /** Latest automatic evidence check (verify tasks only). */
  verify?: VerifyResult | null;
}

export interface VerifyResult {
  at: string;
  by: string;
  file: string;
  pass: boolean;
  checks: { label: string; ok: boolean; detail: string }[];
  /** Memberships the evidence shows the test produced. */
  confirmed: number;
  warnings: string[];
}

/** CRM-test evidence file: required columns and allowed values. */
export const CRM_TEST_SPEC = {
  replies: 71,
  failures: 417,
  columns: ['record_type', 'ref', 'outcome', 'paid_membership'],
  replyOutcomes: ['membership', 'appointment', 'not interested', 'other'],
  failureReasons: ['wrong number', 'not on whatsapp', 'opted out', 'blocked', 'other'],
};

export interface TaskEvent {
  key: string;
  at: string;
  actor: string;
  fromStage: number;
  toStage: number;
  status: string;
  note: string | null;
}

export interface TrackerState {
  progress: Record<string, TaskProgress>;
  events: TaskEvent[];
  /** Persons whose tasks the viewer may update ('all' for admin). */
  canEdit: Person[] | 'all';
  viewer: string | null;
  /** ISO date "today" in Dubai, so status is computed consistently. */
  today: string;
  live: boolean;
  /** Gautam's company pipeline and calendar follow-ups. */
  corp?: CorpState;
}

export type Rag = 'done' | 'blocked' | 'overdue' | 'due' | 'on_track' | 'not_started';

/** Schedule status of a task vs its due date (Dubai calendar day). */
export function ragFor(task: TeamTask, p: TaskProgress | undefined, today: string): Rag {
  const stage = p?.stage ?? 0;
  if (stage >= task.steps.length || p?.status === 'done') return 'done';
  if (p?.status === 'blocked') return 'blocked';
  if (today > task.dueIso) return 'overdue';
  if (today === task.dueIso) return 'due';
  return stage > 0 ? 'on_track' : 'not_started';
}
