/**
 * Mohan's shoot schedule (25 Sep) — built from Dr Luvi's doctors' calendar
 * ("Doctor's daily schedule — branch wise"). Every dentist's clinic hours, and
 * the planned shoot days grouping dentists by clinic so Mohan knows exactly
 * which dentist, which clinic and what time. Each appointment films two videos
 * (Smile Club + the dentist's campaign) in the dentist's languages.
 */
import { BRANCH_LABEL, DENTISTS, langsFor, type Branch, type Dentist } from '@/lib/smileclub/scripts';

export type Day = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
export const DAYS: Day[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The day each clinic is closed. */
export const CLINIC_CLOSED: Record<Branch, Day> = { tosun: 'Sun', alwasl: 'Fri', amc: 'Sat' };

/** Clinic hours per dentist, from Dr Luvi's schedule. Missing day = not in clinic. */
export const HOURS: Record<string, Partial<Record<Day, string>>> = {
  'yahya-tosun': { Mon: '8:00–13:00 / 14:00–18:00', Tue: '9:00–13:00 / 14:00–19:00', Thu: '9:00–13:00 / 14:00–19:00', Fri: '8:00–13:00 / 14:00–16:00', Sat: '8:00–13:00 / 14:00–18:00' },
  'dilsad-ozdogan': { Tue: '9:00–12:00 / 13:00–19:00', Wed: '8:00–12:00 / 13:00–18:00', Thu: '9:00–12:00 / 13:00–19:00', Fri: '8:00–16:00', Sat: '8:00–12:00 / 13:00–18:00' },
  'maysoon-abdelmajeed': { Mon: '8:30–12:00', Tue: '10:00–13:00 / 13:30–19:00', Thu: '9:00–13:00 / 13:30–17:15', Fri: '8:00–12:30', Sat: '10:00–16:00' },
  'bulent-ozdogan': { Tue: '9:00–19:00', Thu: '9:00–19:00', Sat: '8:00–18:00' },
  'sevinc-behruzoglu': { Mon: '8:00–14:00 / 16:25–18:00', Wed: '8:00–14:00 / 16:25–18:00' },
  'maysoun-ahmad': { Mon: '8:00–18:00' },
  'sathyapriya-surendar': { Tue: '9:00–12:00', Wed: '9:00–17:00' },
  'hasna-alsaeed': { Sun: '9:00–17:00' },
  'ali-ghasemi': { Sun: '9:00–17:00', Mon: '12:00–20:00', Tue: '12:00–20:00', Wed: '9:00–17:00', Thu: '9:00–17:00', Sat: '12:00–20:00' },
  'safwan-sultan': { Sun: '9:00–17:00', Mon: '9:00–17:00', Tue: '9:00–17:00', Wed: '12:00–20:00', Thu: '12:00–20:00', Sat: '9:00–17:00' },
  'yasmin-youssef': { Sun: '9:00–17:00' },
  'ghada-hussain': { Sat: '9:00–17:00' },
  'mohammad-qasem': { Thu: '9:00–17:00' },
  'helmi-shaath': { Sat: '9:00–17:00' },
  'chahira-berlarbi': { Mon: '9:00–15:00', Tue: '9:00–15:00', Wed: '9:00–15:00', Thu: '9:00–15:00', Sat: '9:00–15:00' },
  'maher-selman': { Sun: '10:00–20:00', Mon: '10:00–18:00', Wed: '10:00–18:00', Thu: '10:00–18:00' },
  'suzanna-almaali': { Sun: '10:00–20:00' },
  'leila-mostawe': { Sun: '10:00–20:00', Tue: '10:00–18:00', Thu: '10:00–18:00' },
};

export interface ShootSlot {
  id: string;
  /** Start time, or the confirmed range (e.g. 11:00–12:00). */
  time: string;
  /** Only the campaign video is still needed. */
  only?: 'lane';
  note?: string;
  /** confirmed = MJ confirmed with the dentist; proposed = offered, not yet confirmed; plan = our proposal, not yet arranged by MJ. */
  status?: 'confirmed' | 'proposed' | 'plan';
  /** An existing task that already covers this slot (kept out of the day's generated task). */
  task?: string;
}

export const SLOT_STATUS: Record<NonNullable<ShootSlot['status']>, string> = {
  confirmed: 'Confirmed by MJ',
  proposed: 'Proposed — dentist available, to confirm',
  plan: 'Planned — not yet arranged by MJ',
};

/** Changes to the plan, newest first. */
export const SHOOT_CHANGES: string[] = [
  'Thu 24 Sep (MJ): Fri 25 Sep shoot cancelled — Dr. Yahya Tosun has back-to-back patients and Dr. Dilsad Ozdogan was not ready; both confirmed for Mon 28 Sep. Saturday re-timed; Dr. Helmi Shaath is not renewing (no shoot); Dr. Ghada Hussain is travelling until 2 Oct (moved to Sat 3 Oct).',
];

/** Dentists taken off the shoot plan, with the reason. */
export const NOT_FILMING: { id: string; why: string }[] = [
  { id: 'helmi-shaath', why: 'Not renewing with Dental Nation (MJ, 24 Sep) — no shoot.' },
];

export interface ShootDay {
  key: string;
  /** Existing tasks that already cover this day (no generated shoot-day task). */
  tasks?: string[];
  iso: string;
  label: string;
  stops: { branch: Branch; slots: ShootSlot[] }[];
}

/** Wardrobe for every shoot (Dr Luvi, 24 Sep). */
export const WARDROBE = {
  arrives: '2026-09-28',
  note: 'Some new and existing dentists have fit or availability issues with the current DN scrubs. Procurement has ordered DN-branded lab coats, expected Mon 28 Sep. Until then, film in well-fitting DN scrubs; a dentist whose scrubs do not fit moves to a day from Mon 28 Sep (their backup day) and films in the new lab coat.',
};

/** Already filmed. */
export const FILMED: { id: string; when: string; what: string }[] = [
  { id: 'yasmin-youssef', when: 'Wed 23 Sep', what: 'Video 1 (Smile Club) — being finished from the team’s comments' },
];

/**
 * Planned shoot days — dentists grouped by clinic, inside their clinic hours.
 * Times are proposals: Dr Luvi blocks each slot in the dentist's diary.
 */
export const SHOOT_PLAN: ShootDay[] = [
  { key: 'sat26', iso: '2026-09-26', label: 'Sat 26 Sep', stops: [
    { branch: 'alwasl', slots: [
      { id: 'safwan-sultan', time: '11:00–12:00', status: 'confirmed' },
      { id: 'chahira-berlarbi', time: '12:00–13:00', status: 'confirmed' },
      { id: 'ali-ghasemi', time: '13:00–14:00', status: 'confirmed' },
    ] },
  ] },
  { key: 'sun27', iso: '2026-09-27', label: 'Sun 27 Sep', stops: [
    { branch: 'alwasl', slots: [
      { id: 'hasna-alsaeed', time: '09:00', status: 'plan', note: 'In clinic on Sundays only' },
      { id: 'yasmin-youssef', time: '09:45', only: 'lane', status: 'plan', note: 'Video 1 already filmed — campaign video only' },
    ] },
    { branch: 'amc', slots: [
      { id: 'suzanna-almaali', time: '11:00', status: 'plan', note: 'In clinic on Sundays only' },
      { id: 'maher-selman', time: '11:45', status: 'plan' },
      { id: 'leila-mostawe', time: '12:30', status: 'plan' },
    ] },
  ] },
  { key: 'mon28', iso: '2026-09-28', label: 'Mon 28 Sep', stops: [
    { branch: 'tosun', slots: [
      { id: 'maysoun-ahmad', time: '08:30', status: 'plan', note: 'In clinic on Mondays only — not yet in MJ’s schedule' },
      { id: 'sevinc-behruzoglu', time: '09:15', status: 'plan', note: 'Not yet in MJ’s schedule' },
      { id: 'yahya-tosun', time: '10:00', status: 'confirmed', task: 'm-shoot-tosun', note: 'Moved from Fri 25 Sep' },
      { id: 'dilsad-ozdogan', time: '12:00', status: 'confirmed', task: 'm-shoot-dilsad', note: 'Moved from Fri 25 Sep' },
      { id: 'bulent-ozdogan', time: '13:00–14:00', status: 'proposed', note: 'Available on Monday (usually Tue, Thu, Sat)' },
      { id: 'maysoon-abdelmajeed', time: '15:00–16:00', status: 'confirmed', note: 'Outside the usual Monday hours — confirmed by MJ' },
    ] },
  ] },
  { key: 'tue29', iso: '2026-09-29', label: 'Tue 29 Sep', stops: [
    { branch: 'tosun', slots: [
      { id: 'sathyapriya-surendar', time: '09:00', status: 'plan', note: 'Tuesday hours end at 12:00' },
    ] },
  ] },
  { key: 'thu01', iso: '2026-10-01', label: 'Thu 1 Oct', stops: [
    { branch: 'alwasl', slots: [
      { id: 'mohammad-qasem', time: '09:00', status: 'plan', note: 'In clinic on Thursdays only' },
    ] },
  ] },
  { key: 'sat03', iso: '2026-10-03', label: 'Sat 3 Oct', stops: [
    { branch: 'alwasl', slots: [
      { id: 'ghada-hussain', time: '09:00', status: 'plan', note: 'Travelling until 2 Oct (MJ) — Saturdays only' },
    ] },
  ] },
];

const DAY_OF = (iso: string): Day => DAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const fmt = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`; };

/** Takes and minutes for one appointment. */
export function shootLoad(d: Dentist, only?: 'lane') {
  const takes = langsFor(d).length * (only ? 1 : 2);
  return { takes, minutes: takes * 10 + 5 };
}

/** The dentist's next clinic days after a date (the backup if the planned slot slips). */
export function nextClinicDays(id: string, afterIso: string, n = 2, untilIso = '2026-10-16'): string[] {
  const h = HOURS[id] ?? {};
  const out: string[] = [];
  const d = new Date(`${afterIso}T12:00:00Z`);
  while (out.length < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const iso = d.toISOString().slice(0, 10);
    if (iso > untilIso) break;
    if (h[DAY_OF(iso)]) out.push(fmt(iso));
  }
  return out;
}

export const hoursOn = (id: string, iso: string) => HOURS[id]?.[DAY_OF(iso)] ?? null;

export const dentistById = (id: string) => DENTISTS.find((d) => d.id === id)!;

export const stopLabel = (b: Branch) => BRANCH_LABEL[b];
