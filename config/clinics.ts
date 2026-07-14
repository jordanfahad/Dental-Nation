/**
 * Multi-clinic dimension. Two clinics are integrated:
 *   - Dental Nation (the original)
 *   - Dr Tosun Dental Clinic (added later)
 *
 * There is NO clinic column in the source data (both share Zavis account 13 and
 * the same dentalnation.com website), so clinic is DERIVED:
 *   - CRM appointments  → by conducting doctor (the six Dr Tosun doctors below)
 *   - Practo bills       → by the bill's `center_name`
 * Acquisition sources (ad spend, website leads, GA4, the website booking widget)
 * are SHARED across both clinics and are never split — they stay all-clinic.
 */
export type ClinicKey = 'dental-nation' | 'dr-tosun';
export type ClinicFilterKey = 'all' | ClinicKey;

export interface ClinicDef {
  key: ClinicKey;
  label: string;
}

export const CLINICS: ClinicDef[] = [
  { key: 'dental-nation', label: 'Dental Nation' },
  { key: 'dr-tosun', label: 'Dr Tosun Dental Clinic' },
];

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

/** Which clinic a Practo bill belongs to, from its center name. Dr Tosun's
 *  center contains "tosun"; anything else is Dental Nation. */
export function clinicOfCenter(center: string | null | undefined): ClinicKey {
  return center && norm(center).includes('tosun') ? 'dr-tosun' : 'dental-nation';
}

/** Parse a `?clinic=` value to a filter key (unknown → 'all'). */
export function resolveClinic(param?: string | null): ClinicFilterKey {
  return param === 'dental-nation' || param === 'dr-tosun' ? param : 'all';
}

/** Human label for a filter key. */
export function clinicLabel(key: ClinicFilterKey): string {
  if (key === 'all') return 'All clinics';
  return CLINICS.find((c) => c.key === key)?.label ?? key;
}
