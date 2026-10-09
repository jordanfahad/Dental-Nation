/**
 * Mohan's shoot schedule (25 Sep) — built from Dr Luvi's doctors' calendar
 * ("Doctor's daily schedule — branch wise"). Every dentist's clinic hours, and
 * the planned shoot days grouping dentists by clinic so Mohan knows exactly
 * which dentist, which clinic and what time. Each appointment films two videos
 * (Smile Club + the dentist's campaign) in the dentist's languages.
 */
import { announceFor, BRANCH_LABEL, DENTISTS, langsFor, type Branch, type Dentist } from '@/lib/smileclub/scripts';

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
  'Fri 2 Oct (Fahad): video delivery is fixed per shoot day: first cut of every video to Fahad three days after the shoot, batch review by Ms Shadi, Dr Luvi and Gautam, final files (full length plus 15 s and 6 s cuts, each language) six days after the shoot. The four Smile Club videos filmed in September are re-edited on the approved template and delivered by Tue 7 Oct. All videos from the 5 to 13 Oct shoots are final by Mon 19 Oct.',
  'Fri 2 Oct (Fahad): the shoots restart. New dates are set from the doctors’ roster for 4 to 17 Oct, inside each dentist’s hours, one clinic run per day where possible: Mon 5 Oct Tosun (Dr. Maysoun, Dr. Sevinc, Dr. Maysoon, Dr. Tosun’s second video and announcement), Tue 6 Oct Tosun, AMC and Al Wasl (Dr. Bulent, Dr. Leila, second videos for Dr. Safwan and Dr. Ali), Wed 7 Oct Al Wasl and Tosun (Dr. Qasem, Dr. Dilsad), Sat 10 Oct Al Wasl (Dr. Ghada), Sun 11 Oct AMC and Al Wasl (Dr. Suzanna, Dr. Maher, Dr. Hasna, Dr. Yasmin’s second video), Tue 13 Oct Tosun (Dr. Sathyapriya). MJ confirms each slot with the dentist. Dr. Chahira is not on the roster for these two weeks, so her date comes from MJ.',
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
 * Shoot days. Restarted on 2 Oct from the doctors' roster for 4 to 17 Oct
 * (see SHOOT_CHANGES): every slot sits inside the dentist's hours that day,
 * one clinic run per day where possible, with the backup day in the note.
 * Status 'proposed' until MJ confirms the slot with the dentist. The 17:00
 * shoot email goes to MJ the evening before each day.
 */
export const SHOOT_PLAN: ShootDay[] = [
  { key: 'sat26', iso: '2026-09-26', label: 'Sat 26 Sep', stops: [
    { branch: 'alwasl', slots: [
      { id: 'safwan-sultan', time: '11:00–12:00', status: 'filmed', note: 'Smile Club video filmed; second video on Tue 6 Oct' },
      { id: 'ali-ghasemi', time: '13:00–14:00', status: 'filmed', note: 'Smile Club video filmed; second video on Tue 6 Oct' },
    ] },
  ] },
  { key: 'mon28', iso: '2026-09-28', label: 'Mon 28 Sep', stops: [
    { branch: 'tosun', slots: [
      { id: 'yahya-tosun', time: '10:00', status: 'filmed', task: 'm-shoot-tosun', note: 'Smile Club video filmed; The DN Scan ad and the announcement on Mon 5 Oct' },
    ] },
  ] },
  { key: 'mon05', iso: '2026-10-05', label: 'Mon 5 Oct', stops: [
    { branch: 'tosun', slots: [
      { id: 'maysoun-ahmad', time: '08:30', status: 'proposed', note: 'In clinic 08:00–18:00. Backup: Mon 12 Oct 08:00–18:00' },
      { id: 'sevinc-behruzoglu', time: '09:15', status: 'filmed', note: 'Filmed (English; Turkish version in edit). English approved by Marketing on 9 Oct' },
      { id: 'maysoon-abdelmajeed', time: '10:00', status: 'proposed', note: 'In clinic 08:00–12:00. Backup: Tue 6 Oct 10:00–19:00' },
      { id: 'yahya-tosun', time: '12:00', only: 'lane', status: 'proposed', task: 'm-shoot-tosun', note: 'In clinic 11:30–16:00. Video 2 (The DN Scan ad), and Video 3 (announcement) once Gautam confirms the facts. Backup: Tue 13 Oct 09:00–19:00' },
    ] },
  ] },
  { key: 'tue06', iso: '2026-10-06', label: 'Tue 6 Oct', stops: [
    { branch: 'tosun', slots: [
      { id: 'bulent-ozdogan', time: '09:00', status: 'proposed', note: 'In clinic 09:00–19:00. Backup: Thu 8 Oct 09:00–19:00' },
    ] },
    { branch: 'amc', slots: [
      { id: 'leila-mostawe', time: '11:00', status: 'proposed', note: 'In clinic 10:00–16:00. Videos 1 and 2, plus the AMC announcement once approved. Backup: Thu 8 Oct 10:00–16:00' },
    ] },
    { branch: 'alwasl', slots: [
      { id: 'safwan-sultan', time: '13:30', only: 'lane', status: 'proposed', note: 'In clinic 09:00–17:00. Second video only (The DN First Look). Backup: Wed 7 Oct 12:00–20:00' },
      { id: 'ali-ghasemi', time: '14:30', only: 'lane', status: 'proposed', note: 'In clinic 12:00–20:00. Second video only (The DN Glow Up). Backup: Wed 7 Oct 09:00–17:00' },
    ] },
  ] },
  { key: 'wed07', iso: '2026-10-07', label: 'Wed 7 Oct', stops: [
    { branch: 'alwasl', slots: [
      { id: 'mohammad-qasem', time: '11:00', status: 'proposed', note: 'In clinic 11:00–13:00. Backup: Wed 14 Oct 11:00–13:00' },
    ] },
    { branch: 'tosun', slots: [
      { id: 'dilsad-ozdogan', time: '13:30', status: 'proposed', task: 'm-shoot-dilsad', note: 'In clinic 12:30–18:00. Backup: Sat 10 Oct 09:30–14:30' },
    ] },
  ] },
  { key: 'sat10', iso: '2026-10-10', label: 'Sat 10 Oct', stops: [
    { branch: 'alwasl', slots: [
      { id: 'ghada-hussain', time: '11:00', status: 'proposed', note: 'In clinic 11:00–12:30. Written parental consent for any child on camera. Backup: Sat 17 Oct 11:00–12:30' },
    ] },
  ] },
  { key: 'sun11', iso: '2026-10-11', label: 'Sun 11 Oct', stops: [
    { branch: 'amc', slots: [
      { id: 'suzanna-almaali', time: '10:30', status: 'proposed', note: 'In clinic 10:00–20:00. Speaks her own Arabic dialect on camera. Videos 1 and 2, plus the AMC announcement once approved' },
      { id: 'maher-selman', time: '12:00', status: 'proposed', note: 'In clinic 10:00–20:00. Videos 1 and 2, plus the AMC announcement (published first) once approved. Backup: Wed 14 Oct 15:00–18:00' },
    ] },
    { branch: 'alwasl', slots: [
      { id: 'hasna-alsaeed', time: '15:00', status: 'proposed', note: 'In clinic 15:00–17:00. Backup: Sat 17 Oct 15:00–17:00' },
      { id: 'yasmin-youssef', time: '16:00', only: 'lane', status: 'proposed', note: 'In clinic 15:00–17:00. Second video only (The DN Scan ad, second opening). Backup: Sat 17 Oct 15:00–17:00' },
    ] },
  ] },
  { key: 'tue13', iso: '2026-10-13', label: 'Tue 13 Oct', stops: [
    { branch: 'tosun', slots: [
      { id: 'sathyapriya-surendar', time: '11:00', status: 'proposed', note: 'In clinic 11:00–12:00, English only (25 minutes). Backup: Wed 14 Oct 09:00–17:00' },
    ] },
  ] },
];

/**
 * Video delivery after each shoot day (set 2 Oct): Mohan sends the first cut
 * of every video from the day to Fahad three days after the shoot; Ms Shadi,
 * Dr Luvi and Gautam review the day's videos as a batch; the final files (full
 * length plus the 15 s and 6 s cuts, each language) are delivered six days
 * after the shoot. The four Smile Club videos filmed before the 28 Sep meeting
 * are re-edited on the approved template and delivered by REEDIT_FINAL.
 */
export const DELIVERY = { firstCutDays: 3, finalDays: 6 };
export const REEDIT_FINAL = '2026-10-07';
const shift = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export function deliveryFor(iso: string): { firstCut: string; final: string; firstCutLabel: string; finalLabel: string } {
  const firstCut = shift(iso, DELIVERY.firstCutDays), final = shift(iso, DELIVERY.finalDays);
  return { firstCut, final, firstCutLabel: fmt(firstCut), finalLabel: fmt(final) };
}

const DAY_OF = (iso: string): Day => DAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const fmt = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`; };

/** Takes and minutes for one appointment. */
export function shootLoad(d: Dentist, only?: 'lane') {
  const videos = only ? 1 : 2 + (announceFor(d) ? 1 : 0);
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
