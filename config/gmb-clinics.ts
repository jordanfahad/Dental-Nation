import type { ClinicKey } from './clinics';

/** Al Maher uses the Group Revenue key; Growth's `amc` is a UI alias. */
export type GmbClinicKey = ClinicKey | 'al-maher';
export type GmbClinicFilter = 'all' | GmbClinicKey;

export const GMB_CLINICS: { key: GmbClinicKey; label: string }[] = [
  { key: 'dental-nation', label: 'Al Wasl' },
  { key: 'dr-tosun', label: 'Dr Tosun' },
  { key: 'al-maher', label: 'Al Maher' },
];

export function resolveGmbClinic(value?: string | null): GmbClinicFilter {
  return GMB_CLINICS.some((c) => c.key === value) ? value as GmbClinicKey : 'all';
}

export function inferGmbClinic(label: string | null): GmbClinicKey {
  const name = (label ?? '').toLowerCase();
  if (name.includes('tosun')) return 'dr-tosun';
  if (name.includes('maher') || name.includes('amc')) return 'al-maher';
  return 'dental-nation';
}

/** Discovery is an allowlist, unlike the legacy configured-label fallback. */
export function discoveredGmbClinic(title: string): GmbClinicKey | null {
  const name = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (/\bdental nation\b/.test(name)) return 'dental-nation';
  if (/\bdr tosun\b/.test(name)) return 'dr-tosun';
  if (/\bal maher\b/.test(name) || name === 'amc' || /^amc (medical|dental) (centre|center|clinic)$/.test(name)) return 'al-maher';
  return null;
}
