/**
 * Multi-clinic dimension. Three clinics are integrated:
 *   - Dental Nation (the original)
 *   - Dr Tosun Dental Clinic (added later)
 *   - Al Maher Medical Centre (Practo feed from 22 Oct 2026)
 *
 * There is NO clinic column in the CRM (both share CRM-DN account 13 and
 * the same dentalnation.com website), so clinic is DERIVED:
 *   - CRM appointments    → by conducting doctor (the six Dr Tosun doctors below)
 *   - Practo appointments → by the appointment's `center_name` (clinicOfAppointment)
 *   - Practo bills        → by the bill's `center_name`
 * Acquisition sources (ad spend, website leads, GA4, the website booking widget)
 * are SHARED across both clinics and are never split — they stay all-clinic.
 */
export type ClinicKey = 'dental-nation' | 'dr-tosun' | 'al-maher';
export type ClinicFilterKey = 'all' | ClinicKey;

export interface ClinicDef {
  key: ClinicKey;
  label: string;
}

export const CLINICS: ClinicDef[] = [
  { key: 'dental-nation', label: 'Dental Nation Al Wasl' },
  { key: 'dr-tosun', label: 'Dr Tosun Dental Clinic' },
  { key: 'al-maher', label: 'Al Maher Medical Centre' },
];

/** Clinics the CRM can tell apart (by doctor). Al Maher is not in the CRM. */
export const CRM_CLINICS: ClinicDef[] = CLINICS.filter((c) => c.key !== 'al-maher');

/** The first day Practo carries Al Maher appointments and bills. */
export const AL_MAHER_PRACTO_FROM = '2026-10-22';

/**
 * Growth Platform clinic filter. Channel data exists only where a PMS feed
 * does: each clinic's appointments and bills split out of the shared Practo
 * feed by center. AMC (Al Maher) is in Practo from AL_MAHER_PRACTO_FROM;
 * earlier dates have no AMC rows. Paid ads ran ONLY for Dental Nation Al Wasl,
 * so spend / reach / phone-path estimates never attach to the other clinics.
 */
export type GrowthClinicKey = 'all' | 'dn-alwasl' | 'dr-tosun' | 'amc';

export const GROWTH_CLINIC_OPTS: { key: GrowthClinicKey; label: string }[] = [
  { key: 'all', label: 'All clinics' },
  { key: 'dn-alwasl', label: 'Dental Nation Al Wasl' },
  { key: 'dr-tosun', label: 'Dr Tosun Dental' },
  { key: 'amc', label: 'AMC' },
];

export function resolveGrowthClinic(v?: string | null): GrowthClinicKey {
  return v === 'dn-alwasl' || v === 'dr-tosun' || v === 'amc' ? v : 'all';
}

/** The clinic a Growth filter key selects; null for all clinics. */
export const clinicOfGrowthKey = (k: GrowthClinicKey): ClinicKey | null =>
  k === 'dn-alwasl' ? 'dental-nation' : k === 'dr-tosun' ? 'dr-tosun' : k === 'amc' ? 'al-maher' : null;

/** The Growth filter key for a clinic filter key. */
export const growthKeyOfClinic = (k: ClinicFilterKey): GrowthClinicKey =>
  k === 'dental-nation' ? 'dn-alwasl' : k === 'dr-tosun' ? 'dr-tosun' : k === 'al-maher' ? 'amc' : 'all';

/** Normalize a name for tolerant matching (case / spacing / punctuation vary). */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

/** The Dr Tosun Dental Clinic doctors (as they appear in the CRM). */
const TOSUN_DOCTORS = new Set(
  [
    'Dr. Dilsad Ozdogan',
    'Dr. Maysoon Abdelmajeed',
    'Dr. Maysoun Ahmad',
    'Dr. Sevinc Behruzoglu',
    'Dr.Yahya Serif Tosun',
    'Dr. Bulent Ozdogan',
  ].map(norm),
);

/** Which clinic a CRM appointment belongs to, from its conducting doctor. */
export function clinicOfDoctor(name: string | null | undefined): ClinicKey {
  return name && TOSUN_DOCTORS.has(norm(name)) ? 'dr-tosun' : 'dental-nation';
}

/** Which clinic a Practo bill or appointment belongs to, from its center
 *  name. Dr Tosun's center contains "tosun", Al Maher's contains "maher";
 *  anything else is Dental Nation. */
export function clinicOfCenter(center: string | null | undefined): ClinicKey {
  const c = center ? norm(center) : '';
  return c.includes('tosun') ? 'dr-tosun' : c.includes('maher') ? 'al-maher' : 'dental-nation';
}

/** Which clinic a Practo appointment belongs to: its center when Practo gives
 *  one (every row since the feed began), else its conducting doctor. Same
 *  rule as bills, so a clinic's appointments and billing line up. */
export function clinicOfAppointment(center: string | null | undefined, doctor: string | null | undefined): ClinicKey {
  return center && center.trim() ? clinicOfCenter(center) : clinicOfDoctor(doctor);
}

/** Parse a `?clinic=` value to a filter key (unknown → 'all'). */
export function resolveClinic(param?: string | null): ClinicFilterKey {
  return param === 'dental-nation' || param === 'dr-tosun' || param === 'al-maher' ? param : 'all';
}

/** Human label for a filter key. */
export function clinicLabel(key: ClinicFilterKey): string {
  if (key === 'all') return 'All clinics';
  return CLINICS.find((c) => c.key === key)?.label ?? key;
}
