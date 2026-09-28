/**
 * Mohan's shoot schedule (25 Sep) — built from Dr Luvi's doctors' calendar
 * ("Doctor's daily schedule — branch wise"). Every dentist's clinic hours, and
 * the planned shoot days grouping dentists by clinic so Mohan knows exactly
 * which dentist, which clinic and what time. Each appointment films two videos
 * (Smile Club + the dentist's campaign) in the dentist's languages.
 */
import { ANNOUNCE, BRANCH_LABEL, DENTISTS, langsFor, type Branch, type Dentist } from '@/lib/smileclub/scripts';

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
  /** filmed = done; confirmed = MJ confirmed with the dentist; proposed = offered, not yet confirmed; plan = our proposal, not yet arranged by MJ. */
  status?: 'filmed' | 'confirmed' | 'proposed' | 'plan';
  /** An existing task that already covers this slot (kept out of the day's generated task). */
  task?: string;
}

export const SLOT_STATUS: Record<NonNullable<ShootSlot['status']>, string> = {
  filmed: 'Filmed ✓',
  confirmed: 'Confirmed by MJ',
  proposed: 'Proposed: dentist available, to confirm',
  plan: 'Planned: not yet arranged by MJ',
};

/** Changes to the plan, newest first. */
export const SHOOT_CHANGES: string[] = [
  'Mon 28 Sep (meeting: Ms Shadi, Dr Luvi, Gautam, Fahad): shoots are ON HOLD. The team was not happy with the first videos (Dr. Safwan and Dr. Ali), so we get the format right first: Dr Luvi and Gautam share sample videos (Tue 29 Sep, 12:00); Fahad and Mohan make one or two template videos (Tue 29 Sep); Ms Shadi, Dr Luvi and Gautam approve them (Wed 30 Sep, 12:00); the new shoot schedule is agreed with MJ by Wed 30 Sep. Still to film: Dr. Chahira, Dr. Hasna, Dr. Suzanna, Dr. Maher, Dr. Leila, Dr. Qasem, Dr. Ghada, Dr. Dilsad, Dr. Bulent, Dr. Maysoon, Dr. Maysoun, Dr. Sevinc and Dr. Sathyapriya, plus second videos for Dr. Yasmin, Dr. Safwan, Dr. Ali and Dr. Tosun.',
  'Mon 28 Sep (Fahad): filmed so far, all Smile Club videos: Dr. Yasmin Youssef (Tue 22 Sep), Dr. M Safwan Sultan and Dr. Ali Ghasemi (Sat 26 Sep), Dr. Yahya Tosun (Mon 28 Sep). No shoot on Sun 27 Sep. Dr. Chahira Berlarbi (Sat 26) and the other Mon 28 doctors were not available (Dr. Tosun Dental Clinic transition and doctors’ schedules). Every missed doctor is pencilled on their next clinic day for MJ to confirm; second videos for Dr. Safwan, Dr. Ali and Dr. Tosun are pencilled too.',
  'Fri 25 Sep (Dr. Yahya Tosun): asks to film after returning from Türkiye so he can practise both languages. MJ is checking new dates; Mon 28 Sep stays pencilled until a new date is confirmed. He also asked for a partnership announcement video (Dr. Tosun Dental Clinic is now part of Dental Nation), added as his third video, to go out before the clinic’s Smile Club campaign.',
  'Fri 25 Sep (MJ): Al Maher: Dr. Suzanna Almaali and Dr. Maher Selman proposed for Sun 27 Sep, times to be confirmed by email; Dr. Leila Mostawe confirms once the DN lab coat arrives (planned Tue 29 Sep). Saturday and Monday unchanged.',
  'Thu 24 Sep (MJ): Fri 25 Sep shoot cancelled. Dr. Yahya Tosun has back-to-back patients and Dr. Dilsad Ozdogan was not ready; both confirmed for Mon 28 Sep. Saturday re-timed; Dr. Helmi Shaath is not renewing (no shoot); Dr. Ghada Hussain is travelling until 2 Oct (moved to Sat 3 Oct).',
];

/** Who arranges the slots with the dentists. */
export const COORDINATOR = 'MJ Torreta confirms every slot with the dentists; Mohan and Fahad coordinate the shoots with her.';

/** Dentists taken off the shoot plan, with the reason. */
export const NOT_FILMING: { id: string; why: string }[] = [
  { id: 'helmi-shaath', why: 'Not renewing with Dental Nation (MJ, 24 Sep), so no shoot.' },
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
  { id: 'yasmin-youssef', when: 'Tue 22 Sep', what: 'Video 1 (Smile Club), being finished from the team’s comments' },
  { id: 'safwan-sultan', when: 'Sat 26 Sep', what: 'Video 1 (Smile Club)' },
  { id: 'ali-ghasemi', when: 'Sat 26 Sep', what: 'Video 1 (Smile Club)' },
  { id: 'yahya-tosun', when: 'Mon 28 Sep', what: 'Video 1 (Smile Club)' },
];

/**
 * Planned shoot days — dentists grouped by clinic, inside their clinic hours.
 * Times are proposals: Dr Luvi blocks each slot in the dentist's diary.
 */
/**
 * Shoot days. Since the 28 Sep meeting only the days already filmed are listed:
 * the remaining shoots are on hold until the template videos are approved, and
 * the new schedule is agreed with MJ by Wed 30 Sep (see SHOOT_CHANGES). With no
 * upcoming day here, no 17:00 shoot email goes out.
 */
export const SHOOT_PLAN: ShootDay[] = [
  { key: 'sat26', iso: '2026-09-26', label: 'Sat 26 Sep', stops: [
    { branch: 'alwasl', slots: [
      { id: 'safwan-sultan', time: '11:00–12:00', status: 'filmed', note: 'Smile Club video filmed; not approved as it is (28 Sep). Next shoot on hold until the template is approved' },
      { id: 'ali-ghasemi', time: '13:00–14:00', status: 'filmed', note: 'Smile Club video filmed; not approved as it is (28 Sep). Next shoot on hold until the template is approved' },
    ] },
  ] },
  { key: 'mon28', iso: '2026-09-28', label: 'Mon 28 Sep', stops: [
    { branch: 'tosun', slots: [
      { id: 'yahya-tosun', time: '10:00', status: 'filmed', task: 'm-shoot-tosun', note: 'Smile Club video filmed; The DN Scan ad and the partnership announcement on hold until the template is approved' },
    ] },
  ] },
];

const DAY_OF = (iso: string): Day => DAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const fmt = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`; };

/** Takes and minutes for one appointment. */
export function shootLoad(d: Dentist, only?: 'lane') {
  const videos = only ? 1 : 2 + (ANNOUNCE.dentists.includes(d.id) ? 1 : 0);
  const takes = langsFor(d).length * videos;
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
