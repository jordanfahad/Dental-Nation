import type { GmbClinicKey } from '@/config/gmb-clinics';

/**
 * The reception desk types the branch by hand, so one branch appears under
 * several spellings. Exact, case-insensitive matches only; anything not listed
 * is unassigned and reported, never guessed. Owner-confirmed 13 Oct 2026:
 * Al Wasl is the Dental Nation main branch on Al Badaa St.; AMC (Al Maher
 * Medical Center) is on Al Wasl Rd, Jumeirah 1; Dr Tosun is in Umm Suqeim.
 * "Al Wasl Rd" appears in all three addresses, so addresses are never matched.
 */
const BRANCH_VARIANTS: Record<Exclude<CanonicalBranch, 'unassigned'>, string[]> = {
  'dental-nation': ['al wasl', 'dn al wasl', 'dental nation - al badaa st.', 'tdc al wasl 4 jumeirah - branch'],
  'dr-tosun': ['dr. tosun dental clinic brach', 'tosun clinic'],
  'al-maher': ['amc branch', 'al wasl / al maher'],
};
/** Rows with no branch text inherit their tab only where the whole tab belongs to one branch. */
const TAB_BRANCH: Record<string, Exclude<CanonicalBranch, 'unassigned'>> = {
  'dn campaign leads': 'dental-nation',
  // TDC Al wasl 4 Jumeirah is the Dental Nation main branch (owner, 13 Oct 2026), not Dr Tosun.
  'tdc campaign leads': 'dental-nation',
};

export type CanonicalBranch = GmbClinicKey | 'unassigned';
const norm = (s: unknown) => String(s ?? '').replace(/[❤️]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

export function canonicalBranch(clinic: unknown, sourceTab?: unknown): CanonicalBranch {
  const text = norm(clinic);
  for (const [key, variants] of Object.entries(BRANCH_VARIANTS)) if (variants.includes(text)) return key as CanonicalBranch;
  if (!text) return TAB_BRANCH[norm(sourceTab)] ?? 'unassigned';
  return 'unassigned';
}

const HEADERS = ['date', 'clinic / branch', 'lead stage', 'conversion', 'conversion - dr luvi', 'inquiry platform', 'source type'];

/** A header line pasted into the data: the Date cell holds a header name instead of a date. */
export function isHeaderEcho(row: Record<string, unknown>): boolean {
  return HEADERS.includes(norm(row['Date']));
}

/** True when a header name sits in any tracker column, used to ignore leaked header values. */
const isHeaderValue = (v: string) => HEADERS.includes(norm(v));

/**
 * The tracker's real outcome columns are free text, mostly "N/A" or call notes,
 * so they are reported as "outcome recorded", never classified as booked.
 */
export function readOutcome(row: Record<string, unknown>): string | null {
  for (const key of ['Conversion - Dr Luvi', 'Conversion', 'Lead Stage']) {
    const value = String(row[key] ?? '').trim();
    if (!value || /^(n\/?a|not applicable)$/i.test(value) || isHeaderValue(value)) continue;
    return value;
  }
  return null;
}
