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
  time: string;
  /** Only the campaign video is still needed. */
  only?: 'lane';
  note?: string;
}

export interface ShootDay {
  key: string;
  /** Existing tasks that already cover this day (no generated shoot-day task). */
  tasks?: string[];
  iso: string;
  label: string;
  stops: { branch: Branch; slots: ShootSlot[] }[];
}

/** Already filmed. */
export const FILMED: { id: string; when: string; what: string }[] = [
  { id: 'yasmin-youssef', when: 'Wed 23 Sep', what: 'Video 1 (Smile Club) — being finished from the team’s comments' },
];

/**
 * Planned shoot days — dentists grouped by clinic, inside their clinic hours.
 * Times are proposals: Dr Luvi blocks each slot in the dentist's diary.
 */
export const SHOOT_PLAN: ShootDay[] = [
  { key: 'fri25', iso: '2026-09-25', label: 'Fri 25 Sep', tasks: ['m-shoot-tosun', 'm-shoot-dilsad'], stops: [
    { branch: 'tosun', slots: [
      { id: 'yahya-tosun', time: '10:00', note: 'Confirmed with Mohan: 10:00–12:00' },
      { id: 'dilsad-ozdogan', time: '12:00', note: 'Confirmed with Mohan: 12:00–14:00' },
    ] },
  ] },
  { key: 'sat26', iso: '2026-09-26', label: 'Sat 26 Sep', stops: [
    { branch: 'alwasl', slots: [
      { id: 'ghada-hussain', time: '09:00' },
      { id: 'helmi-shaath', time: '09:45' },
      { id: 'safwan-sultan', time: '10:30' },
      { id: 'chahira-berlarbi', time: '11:15' },
      { id: 'ali-ghasemi', time: '12:15', note: 'Starts at 12:00 on Saturdays' },
    ] },
  ] },
  { key: 'sun27', iso: '2026-09-27', label: 'Sun 27 Sep', stops: [
    { branch: 'alwasl', slots: [
      { id: 'hasna-alsaeed', time: '09:00', note: 'In clinic on Sundays only' },
      { id: 'yasmin-youssef', time: '09:45', only: 'lane', note: 'Video 1 already filmed — campaign video only' },
    ] },
    { branch: 'amc', slots: [
      { id: 'suzanna-almaali', time: '11:00', note: 'In clinic on Sundays only' },
      { id: 'maher-selman', time: '11:45' },
      { id: 'leila-mostawe', time: '12:30' },
    ] },
  ] },
  { key: 'mon28', iso: '2026-09-28', label: 'Mon 28 Sep', stops: [
    { branch: 'tosun', slots: [
      { id: 'maysoon-abdelmajeed', time: '08:30', note: 'Skip if already filmed on Fri 25 Sep' },
      { id: 'maysoun-ahmad', time: '09:15', note: 'In clinic on Mondays only' },
      { id: 'sevinc-behruzoglu', time: '10:00' },
    ] },
  ] },
  { key: 'tue29', iso: '2026-09-29', label: 'Tue 29 Sep', stops: [
    { branch: 'tosun', slots: [
      { id: 'sathyapriya-surendar', time: '09:00', note: 'Tuesday hours end at 12:00' },
      { id: 'bulent-ozdogan', time: '09:45' },
    ] },
  ] },
  { key: 'thu01', iso: '2026-10-01', label: 'Thu 1 Oct', stops: [
    { branch: 'alwasl', slots: [
      { id: 'mohammad-qasem', time: '09:00', note: 'In clinic on Thursdays only' },
    ] },
  ] },
];

const DAY_OF = (iso: string): Day => DAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const fmt = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));

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
