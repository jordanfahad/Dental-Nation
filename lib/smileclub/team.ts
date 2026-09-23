/**
 * Smile Club team task calendar — the single definition of every tracked
 * task, its owner, due date and the step flow that its progress bar measures.
 * Shared by the plan UI (client) and the progress server action, which
 * validates keys, step bounds and ownership against this list.
 *
 * Live progress (current step, status, audit trail) lives in lane_e.tasks
 * (external_id = `sc-team:<key>`) and lane_e.task_events — never here.
 */

export type Person = 'gautam' | 'luvi' | 'mohan' | 'reception';

export interface TeamTask {
  key: string;
  who: Person;
  wk: number;
  /** ISO due date — drives on-track / overdue status. */
  dueIso: string;
  due: string;
  task: string;
  done: string;
  with?: string;
  to?: string;
  toLabel?: string;
  /** The task's flow: each step is one visible stage of the flow chart. */
  steps: string[];
}

export const TRACKER_SOURCE = 'smileclub-team';
export const externalIdFor = (key: string) => `sc-team:${key}`;

/** The Loyalty Program project that hosts Smile Club tasks in Growth Projects. */
export const SMILECLUB_PROJECT_ID = '6802b97d-cfb5-46b3-842f-9d29a5039309';

export const OWNER_LABEL: Record<Person, string> = {
  gautam: 'Gautam',
  luvi: 'Dr Luvi',
  mohan: 'Mohan',
  reception: 'Receptionists',
};

/**
 * Who may move a person's tasks, keyed by dashboard_users.name. Admin
 * sessions may move any task. Receptionists have no Smile Club access (their
 * role is locked to Clinical Operations), so Dr Luvi updates their tasks as
 * their head of operations.
 */
export const EDITORS: Record<string, Person[]> = {
  Gautam: ['gautam'],
  'Dr Luvi': ['luvi', 'reception'],
  Mohan: ['mohan'],
};

export const TEAM_TASKS: TeamTask[] = [
  /* ── Gautam ── */
  { key: 'g-crm-test', who: 'gautam', wk: 1, dueIso: '2026-09-23', due: 'Wed 23 Sep EOD', task: 'Close the historical CRM test', done: 'Payment-record reconciliation shared: 71 replies classified, 417 failures coded, broadcast memberships confirmed or ruled out.', with: 'Fahad reviews', to: 'waves', toLabel: 'Wave 1 results',
    steps: ['Pull payment records', 'Match the 71 replies', 'Code the 417 failures', 'Share with Fahad'] },
  { key: 'g-baseline', who: 'gautam', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Hand over the member baseline', done: 'Enrolments, payment status, plan mix, usage and cancellations — the savings examples and funnel definitions are built from it; nothing scales before it exists.', with: 'Fahad', to: 'offer', toLabel: 'Offer & economics',
    steps: ['Export enrolments + payment status', 'Add plan mix + usage', 'Add cancellations', 'Handed to Fahad'] },
  { key: 'g-assets', who: 'gautam', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Release enablement assets for print', done: 'Corporate one-pager, savings math, HR email kit and reception deck handed to Mohan in editable form.', with: 'Mohan', to: 'response', toLabel: 'R1 · Corporate',
    steps: ['Collect the four assets', 'Check they are current', 'Handed to Mohan (editable)'] },
  { key: 'g-doors-15', who: 'gautam', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'Field-sales door plan — first 15 doors', done: 'First 15 SME doors in JLT and Business Bay chosen trigger-first (renewal month, complaints, hiring), each qualified with “does your medical include dental?”.', with: 'Fahad (warm doors)', to: 'corporate', toLabel: 'Corporate playbook',
    steps: ['Long-list SMEs in JLT + Business Bay', 'Find each trigger', 'Qualify: dental in their medical?', 'Final 15 logged'] },
  { key: 'g-bridge', who: 'gautam', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep', task: 'Replacement-door bridge + product decisions', done: 'Bridge sizes the ≥72-equivalent pipeline door by door after Michael Page’s closure; decision on 4 live plans vs the blueprint’s 3 tiers; owners named for Smile Score, My Smile Plan and the annual value statement.', with: 'Fahad', to: 'mandate', toLabel: 'M4 alignment',
    steps: ['Size each door in equivalents', 'Check coverage vs ≥72', 'Decide 4 vs 3 tiers', 'Name build owners'] },
  { key: 'g-arabyads', who: 'gautam', wk: 2, dueIso: '2026-09-30', due: 'Wed 30 Sep', task: 'ArabyAds staff-membership decision', done: 'If yes: pilot spec + employer code within 48 hours. If no: logged, referral asked.', with: 'Fahad (relationship)', to: 'dm', toLabel: 'Outreach D3',
    steps: ['Ask made at go-live meeting', 'Decision received', 'Spec + code, or referral logged'] },
  { key: 'g-cac', who: 'gautam', wk: 2, dueIso: '2026-10-02', due: 'Fri 2 Oct', task: 'Finance fully-loaded CAC ceiling', done: 'Ceiling set via finance/ops (staff, commissions, creative, events, onboarding priced) — required before the Day-14 funding review.', with: 'Finance/ops', to: 'response', toLabel: 'Budget R2',
    steps: ['Brief finance/ops', 'Price every cost line', 'Ceiling agreed', 'Shared before Day-14'] },
  { key: 'g-doors-20', who: 'gautam', wk: 2, dueIso: '2026-10-02', due: 'Fri 2 Oct', task: '20 doors walked · first discovery meetings', done: 'Meeting log current (door, date, model discussed, outcome); Benefits Gap Assessment run with every qualified employer.', with: 'Fahad (LinkedIn air-cover)', to: 'corporate', toLabel: 'Corporate playbook',
    steps: ['10 doors walked', '20 doors walked', 'Discovery meetings held', 'Gap Assessments run'] },
  { key: 'g-day14', who: 'gautam', wk: 2, dueIso: '2026-10-05', due: 'Mon 5 Oct', task: 'Day-14 gate: funding + corporate viability decision', done: 'Day-15–30 funding released or held; Corporate-24 confirmed against the bridge, or reallocated toward in-clinic/family per Wave-1 priority — decided here, not at Day 30.', with: 'Fahad · Mr Akbar', to: 'mandate', toLabel: 'M4 alignment',
    steps: ['Read 60/50 + CAC + attribution', 'Check the bridge vs 24', 'Funding + corporate decision', 'Decision recorded'] },
  { key: 'g-assembly', who: 'gautam', wk: 3, dueIso: '2026-10-07', due: 'Wed 7 Oct', task: 'Assembly Global pilot decision', done: 'Yes/no recorded; if yes, the pilot moves straight into specification.', with: 'Fahad (contact)', to: 'dm', toLabel: 'Outreach D3',
    steps: ['Follow-up sent', 'Decision received', 'Specification started or closed'] },
  { key: 'g-pilot', who: 'gautam', wk: 3, dueIso: '2026-10-09', due: 'Fri 9 Oct', task: 'First corporate pilot signed and specified', done: 'The “one defined pilot” with all eight spec points: employer, eligible count, payment model, sponsor, on-site scope and cost, tracking code, success criteria, reporting. 40+ doors walked cumulative.', with: 'Dr Luvi (on-site scope)', to: 'corporate', toLabel: 'Pilot spec (C10)',
    steps: ['Proposal sent', 'Payment model agreed', 'Eight-point spec complete', 'Signed'] },
  { key: 'g-day21', who: 'gautam', wk: 3, dueIso: '2026-10-12', due: 'Mon 12 Oct', task: 'Day-21 checkpoint review', done: '88 plan / 75 minimum reviewed with Fahad; recovery plan the next business day if missed.', with: 'Fahad', to: 'kpis', toLabel: 'Controls',
    steps: ['Read 88/75', 'Review with Fahad', 'Recovery plan if missed'] },
  { key: 'g-launch', who: 'gautam', wk: 4, dueIso: '2026-10-14', due: 'Wed 14 Oct', task: 'Employee launch of the first pilot', done: 'CEO/HR email + QR + landing page live under the employer code; activation drive running — activation rate, not the signature, is the KPI.', with: 'Mohan (launch kit)', to: 'corporate', toLabel: 'Implementation (C9)',
    steps: ['Eligibility list received', 'Launch kit approved', 'CEO/HR email sent', 'Activation drive running'] },
  { key: 'g-onsite', who: 'gautam', wk: 4, dueIso: '2026-10-16', due: 'Fri 16 Oct', task: 'On-site dental day at the pilot employer', done: 'Day delivered at the pre-approved cost; enrolments under the employer code; first bookings made on the day.', with: 'Dr Luvi · Mohan', to: 'corporate', toLabel: 'Corporate playbook',
    steps: ['Date + cost approved', 'Kit and team confirmed', 'Day delivered', 'Enrolments + bookings logged'] },
  { key: 'g-complete', who: 'gautam', wk: 5, dueIso: '2026-10-21', due: 'Wed 21 Oct', task: 'Complete the mandate → report to Mr Akbar', done: '120 paid, active, non-refunded, source-coded; ≥98% data and attribution; Finance-validated. Corporate pipeline handover + agent onboarding plan for the scale phase.', with: 'Fahad', to: 'kpis', toLabel: 'Measurement',
    steps: ['Final count by source', 'Finance validation', 'Pipeline handover', 'Reported to Mr Akbar'] },

  /* ── Dr Luvi ── */
  { key: 'l-audit', who: 'luvi', wk: 1, dueIso: '2026-09-23', due: 'Wed 23 Sep', task: 'Front-desk route audit — all three branches', done: 'QR standees placed under SC-ALW / SC-TOS / SC-AMC; Reception Conversion Guide in use; objection log open at each desk.', with: 'Smile Club Coordinator', to: 'response', toLabel: 'R1 · In-clinic',
    steps: ['Al Wasl checked', 'Dr Tosun checked', 'AMC checked', 'Gaps fixed'] },
  { key: 'l-refresher', who: 'luvi', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: '30-minute receptionist refresher per branch', done: 'Ask → Match → Value → Clarify → Close rehearsed; language rules (membership, never insurance/coverage/claim); first member appointment booked before the patient leaves.', with: 'Receptionists', to: 'why', toLabel: 'Language dictionary',
    steps: ['Al Wasl session', 'Dr Tosun session', 'AMC session'] },
  { key: 'l-capacity', who: 'luvi', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'Capacity check + priority-booking rule', done: 'Member appointment availability per branch and daypart confirmed; a priority member-booking rule defined — capacity is an expansion gate.', to: 'offer', toLabel: 'Capacity gate',
    steps: ['Availability per branch/daypart', 'Priority rule drafted', 'Rule live at all desks'] },
  { key: 'l-day7', who: 'luvi', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep', task: 'Day-7 in-clinic readout', done: '18 of the 36 from in-clinic (6 per branch, pro-rata); top objection themes; conversion assumption checked against branch footfall.', with: 'Receptionists', to: 'response', toLabel: 'R1 · In-clinic',
    steps: ['Branch counts pulled', 'Objection themes summarised', 'Footfall check', 'Readout shared'] },
  { key: 'l-onboarding', who: 'luvi', wk: 2, dueIso: '2026-09-30', due: 'Wed 30 Sep', task: 'Onboarding standard live', done: 'Every new member’s first appointment booked within 7 days of joining; first booking and first completed visit tracked separately.', to: 'layers', toLabel: 'Layer map',
    steps: ['Standard written', 'Desks briefed', 'Tracking live'] },
  { key: 'l-review-v1', who: 'luvi', wk: 2, dueIso: '2026-10-01', due: 'Thu 1 Oct', task: 'Clinical review of Mohan’s asset set v1', done: 'Every claim clinically accurate, non-alarmist and free of unsubstantiated savings before any ad goes live; weekly sign-off from here on.', with: 'Mohan', to: 'why', toLabel: 'Regulatory dictionary',
    steps: ['Set received', 'Claims checked', 'Changes returned', 'Signed off'] },
  { key: 'l-day14', who: 'luvi', wk: 2, dueIso: '2026-10-05', due: 'Mon 5 Oct', task: 'Day-14 in-clinic + capacity readout', done: '30 from in-clinic (10 per branch); capacity reading feeds the Day-15–30 funding decision.', to: 'kpis', toLabel: 'Controls',
    steps: ['Branch counts pulled', 'Capacity reading', 'Readout shared'] },
  { key: 'l-onsite-scope', who: 'luvi', wk: 3, dueIso: '2026-10-08', due: 'Thu 8 Oct', task: 'On-site dental day: clinical scope and cost', done: 'Clinician, chair time, materials and cost estimated for the pilot employer’s day — costed per event, never assumed low-cost.', with: 'Gautam', to: 'corporate', toLabel: 'Pilot spec (C10)',
    steps: ['Scope agreed with Gautam', 'Clinician + materials', 'Cost estimate signed'] },
  { key: 'l-csr', who: 'luvi', wk: 3, dueIso: '2026-10-09', due: 'Fri 9 Oct', task: 'First CSR community event — clinician assigned', done: 'Event near a branch costed and staffed; per-event code live.', with: 'Fahad', to: 'response', toLabel: 'R1 · CSR',
    steps: ['Event chosen', 'Costed', 'Clinician assigned', 'Event code live'] },
  { key: 'l-day21', who: 'luvi', wk: 3, dueIso: '2026-10-12', due: 'Mon 12 Oct', task: 'Day-21 in-clinic readout', done: '44 from in-clinic (≈15 per branch); branch-level recovery actions if a branch trails.', to: 'kpis', toLabel: 'Controls',
    steps: ['Branch counts pulled', 'Recovery actions set', 'Readout shared'] },
  { key: 'l-onsite-deliver', who: 'luvi', wk: 4, dueIso: '2026-10-16', due: 'Fri 16 Oct', task: 'Deliver the corporate on-site day clinically', done: 'Screenings delivered to standard; employees’ first visits booked; member first-visit experience audited (attendance, no-shows).', with: 'Gautam · Mohan', to: 'corporate', toLabel: 'Corporate playbook',
    steps: ['Team briefed', 'Screenings delivered', 'First visits booked', 'Experience audited'] },
  { key: 'l-smilescore', who: 'luvi', wk: 4, dueIso: '2026-10-19', due: 'Mon 19 Oct', task: 'Draft clinical definitions for the baseline assessment', done: 'Smile Score dimensions drafted (caries risk, gum health, hygiene, function, preventive adherence) for the build decision — clinical governance, not marketing.', to: 'why', toLabel: 'Member journey (W3)',
    steps: ['Dimensions listed', 'Status labels defined', 'Draft for the build decision'] },
  { key: 'l-in60', who: 'luvi', wk: 5, dueIso: '2026-10-21', due: 'Wed 21 Oct', task: 'In-clinic 60 delivered + refund check', done: '20 per branch; cancellations and refunds reconciled so every counted contract is active and non-refunded before Finance validation.', to: 'mandate', toLabel: 'Output definition',
    steps: ['Branch totals', 'Refunds + cancellations reconciled', 'Handed to Finance'] },

  /* ── Mohan ── */
  { key: 'm-onboard', who: 'mohan', wk: 1, dueIso: '2026-09-23', due: 'Wed 23 Sep', task: 'Onboard to the brief', done: 'Language dictionary + demand-state map absorbed: every asset is tagged to ONE demand state and never uses insurance vocabulary.', to: 'layers', toLabel: 'Layer map (L1)',
    steps: ['Dashboard access', 'Brief read', 'Questions answered'] },
  { key: 'm-banner', who: 'mohan', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Sticky banner artwork EN/AR', done: '“Smile Club — dental care from AED 99/month → Join”, dismissible, handed to CRM-DN/W3Layouts for the build.', with: 'CRM-DN', to: 'dm', toLabel: 'DM plan D1',
    steps: ['EN design', 'AR design', 'Approved', 'Handed to CRM-DN'] },
  { key: 'm-printkit', who: 'mohan', wk: 1, dueIso: '2026-09-25', due: 'Fri 25 Sep', task: 'Corporate print kit for Gautam’s doors', done: 'One-pager + savings table EN/AR, on-site day banner, QR materials — print-ready inside the field-sales AED 6,000.', with: 'Gautam', to: 'response', toLabel: 'R1 · Corporate',
    steps: ['One-pager + savings table', 'On-site banner', 'QR materials', 'Print-ready files'] },
  { key: 'm-dynamic-v1', who: 'mohan', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep', task: 'Dynamic-format asset set v1 — the blocker unlock', done: '3 ratios (1:1 · 4:5 · 9:16) × 3 demand-state messages (cost anxiety · family · existing patient) for Meta dynamic/Advantage+ formats, submitted for Dr Luvi’s review.', with: 'Dr Luvi (review)', to: 'dm', toLabel: 'Blocker D2',
    steps: ['Cost-anxiety set', 'Family set', 'Existing-patient set', 'Submitted for review'] },
  { key: 'm-videos', who: 'mohan', wk: 2, dueIso: '2026-10-02', due: 'Fri 2 Oct', task: 'Three proof videos + cutdowns', done: 'Doctor-trust prevention explainer · 30-second “what’s included” · member story (written consent only) — each with 15s and 6s cutdowns for Reels/Stories.', with: 'Dr Luvi (clinical)', to: 'layers', toLabel: 'Layer map',
    steps: ['Scripts approved', 'Filmed', 'Edited', 'Cutdowns exported'] },
  { key: 'm-creator', who: 'mohan', wk: 2, dueIso: '2026-10-02', due: 'Fri 2 Oct', task: 'Family-layer creator brief', done: 'Brief + content template for affiliate creators (tracked codes; “one dental home for the family”).', with: 'Fahad', to: 'response', toLabel: 'R1 · Affiliates',
    steps: ['Brief drafted', 'Template built', 'Approved by Fahad'] },
  { key: 'm-launchkit', who: 'mohan', wk: 2, dueIso: '2026-10-05', due: 'Mon 5 Oct', task: 'Employee launch kit template', done: '“Your company has given you Smile Club — activate in 60 seconds”: email, WhatsApp card, QR poster — ready before the first pilot signs.', with: 'Gautam', to: 'corporate', toLabel: 'Implementation (C9)',
    steps: ['Email', 'WhatsApp card', 'QR poster', 'Approved by Gautam'] },
  { key: 'm-linkedin', who: 'mohan', wk: 3, dueIso: '2026-10-08', due: 'Thu 8 Oct', task: 'HR-facing LinkedIn content + Gap Assessment design', done: '“Dental Benefits Made Simple” posts for the door territories; the 5-question Dental Benefits Gap Assessment as a one-page leave-behind.', with: 'Gautam · Fahad', to: 'corporate', toLabel: 'Distribution (C7)',
    steps: ['Post set designed', 'Gap Assessment designed', 'Approved'] },
  { key: 'm-geo', who: 'mohan', wk: 3, dueIso: '2026-10-09', due: 'Fri 9 Oct', task: 'Awareness air-cover geo creatives', done: 'IG/FB creatives for the geo cells around the three branches — judged on enabler metrics, never CPL.', with: 'Fahad', to: 'dm', toLabel: 'DM plan D1b',
    steps: ['Designed', 'Clinical sign-off', 'Handed to Fahad'] },
  { key: 'm-v2', who: 'mohan', wk: 4, dueIso: '2026-10-15', due: 'Thu 15 Oct', task: 'Asset set v2 from Day-14 learnings', done: 'Winning demand states re-cut; losing variants retired — dynamic formats scale on proven creative only.', with: 'Fahad', to: 'dm', toLabel: 'DM plan D1d',
    steps: ['Performance read with Fahad', 'Winners re-cut', 'Losers retired', 'v2 live'] },
  { key: 'm-film-onsite', who: 'mohan', wk: 4, dueIso: '2026-10-16', due: 'Fri 16 Oct', task: 'Film the corporate on-site day', done: 'Content captured with permissions; no identifiable employee or patient without written consent; no implied employer endorsement before it is granted.', with: 'Gautam · Dr Luvi', to: 'corporate', toLabel: 'Reporting & permissions',
    steps: ['Permissions collected', 'Filmed', 'Edited + consent-checked'] },
  { key: 'm-library', who: 'mohan', wk: 5, dueIso: '2026-10-20', due: 'Tue 20 Oct', task: 'Asset library handover', done: 'Every asset filed with its demand state, format, approval date and performance tag for the scale phase.', to: 'dm', toLabel: 'DM plan',
    steps: ['Assets filed', 'Tags complete', 'Handed over'] },

  /* ── Receptionists ── */
  { key: 'r-refresher', who: 'reception', wk: 1, dueIso: '2026-09-24', due: 'Thu 24 Sep', task: 'Attend the refresher', done: 'Pitch, language rules and first-booking step rehearsed with Dr Luvi.', with: 'Dr Luvi', to: 'why', toLabel: 'Language dictionary',
    steps: ['Al Wasl attended', 'Dr Tosun attended', 'AMC attended'] },
  { key: 'r-pace-6', who: 'reception', wk: 1, dueIso: '2026-09-28', due: 'Mon 28 Sep', task: 'Branch pace: 6 paid (minimum 5)', done: 'Per-branch count reported at the 09:00 review; every decline in the objection log.', to: 'response', toLabel: 'R1 · In-clinic',
    steps: ['Al Wasl ≥6', 'Dr Tosun ≥6', 'AMC ≥6'] },
  { key: 'r-pace-10', who: 'reception', wk: 2, dueIso: '2026-10-05', due: 'Mon 5 Oct', task: 'Branch pace: 10 paid (minimum 9)', done: 'Family prompt added: parents offered Family membership at checkout.', to: 'layers', toLabel: 'Layer map · state 7',
    steps: ['Al Wasl ≥10', 'Dr Tosun ≥10', 'AMC ≥10'] },
  { key: 'r-pace-15', who: 'reception', wk: 3, dueIso: '2026-10-12', due: 'Mon 12 Oct', task: 'Branch pace: 15 paid (minimum 13)', done: 'Treatment-plan patients asked “would member rates help with your plan?” (demand state 6).', to: 'layers', toLabel: 'Layer map · state 6',
    steps: ['Al Wasl ≥15', 'Dr Tosun ≥15', 'AMC ≥15'] },
  { key: 'r-corp-members', who: 'reception', wk: 4, dueIso: '2026-10-14', due: 'Wed 14 Oct', task: 'Recognise corporate members', done: 'Employees arriving under a pilot employer code are activated, welcomed and booked — the employee journey starts at the desk.', with: 'Gautam', to: 'corporate', toLabel: 'Employee journey (C1)',
    steps: ['Desks briefed on employer codes', 'First corporate member booked', 'Routine at all three desks'] },
  { key: 'r-target-20', who: 'reception', wk: 5, dueIso: '2026-10-21', due: 'Wed 21 Oct', task: 'Branch target: 20 paid', done: 'Every enrolment under the branch code, card active, first appointment booked.', to: 'mandate', toLabel: 'Output definition',
    steps: ['Al Wasl 20', 'Dr Tosun 20', 'AMC 20'] },
];

export const TASK_BY_KEY: Record<string, TeamTask> = Object.fromEntries(TEAM_TASKS.map((t) => [t.key, t]));

/** Live state of one task, as loaded from lane_e.tasks. */
export interface TaskProgress {
  stage: number; // steps completed, 0..steps.length
  status: 'open' | 'in_progress' | 'done' | 'blocked';
  note: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

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
