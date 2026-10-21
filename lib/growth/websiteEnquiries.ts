import { canonicalBranch } from '@/lib/lead-tracker/branch';
import { GMB_CLINICS } from '@/config/gmb-clinics';

export interface EnquiryRow {
  p9: string;
  date: string | null;
  data: Record<string, unknown>;
}
export interface WidgetEnquiry extends EnquiryRow { hasLane: boolean; paidSearch: boolean }
export interface TrackerEnquiry extends EnquiryRow { channel: string; text: string }
export interface WebsiteEnquiry {
  key: string; p9: string; date: string; time: string; name: string; phone: string;
  branch: string; service: string; source: string;
  status: '' | 'booked' | 'attended' | 'billed'; billed: number | null;
}
const s = (value: unknown) => String(value ?? '').trim();
const pick = (data: Record<string, unknown>, ...keys: string[]) => keys.map((key) => s(data[key])).find(Boolean) ?? '';
function enquiryTime(data: Record<string, unknown>): string {
  const timestamp = s(data['Timestamp']).match(/[T ](\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i)?.[1];
  const match = (timestamp ?? s(data['Time'])).match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (!match) return '';
  let hour = Number(match[1]);
  if (match[3]) hour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour < 24 && Number(match[2]) < 60 ? `${String(hour).padStart(2, '0')}:${match[2]}` : '';
}
/** The booking widget writes US timestamps ("08/09/2026, 13:38:21"); trackers use ISO
 * days. Grouping and tag matching need one calendar, so both become YYYY-MM-DD. */
export function isoDay(day: string): string {
  const us = day.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return us ? `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}` : day.slice(0, 10);
}
export const widgetEnquiryChannel = (row: WidgetEnquiry) => row.hasLane ? 'affiliate' : row.paidSearch ? 'paid-search' : 'website';

/** Also reconstructible from the machine-owned sheet cells; no hidden PII key.
 * Day grain: one enquiry per phone per day, so a desk filling in or correcting
 * the Time cell never changes a row's identity. Phoneless rows key on their
 * day and visible fields (plus an occurrence suffix added by the selector).
 */
export function websiteIdentity(row: Pick<WebsiteEnquiry, 'p9' | 'date' | 'name' | 'branch' | 'service'>): string {
  return row.p9 ? `${row.p9}|${row.date}` : JSON.stringify([row.date, row.name, row.branch, row.service]);
}

interface Candidate { enquiry: WebsiteEnquiry; widget: boolean }
const byPreference = (a: Candidate, b: Candidate) =>
  Number(b.widget) - Number(a.widget) // widget evidence first
  || Number(!a.enquiry.time) - Number(!b.enquiry.time) // rows with a known time first
  || a.enquiry.time.localeCompare(b.enquiry.time)
  || a.enquiry.name.localeCompare(b.enquiry.name)
  || a.enquiry.service.localeCompare(b.enquiry.service)
  || a.enquiry.branch.localeCompare(b.enquiry.branch);

/** The only website population selector. Source classification is supplied by
 * Growth's existing attribution preparation, never inferred again here.
 * Deterministic and range-independent: whether a phone has a website enquiry
 * on a day depends only on that day's rows, never on database row order or on
 * the selected date range, so the sheet and the dashboard always agree.
 * - A phone with a campaign-tagged widget row (ArabyAds lane or Google click)
 *   at any time is never a website enquiry, exactly as the attribution
 *   waterfall (R3) credits that person's bookings to the tagged channel.
 * - The range filter uses the stored day exactly as Growth's other channels
 *   do; grouping uses the ISO day, so a widget booking and the desk's tracker
 *   row for it on the same day are one enquiry.
 * - Several website rows for one phone on one day are one enquiry.
 * - Phoneless enquiries remain separate, with an occurrence suffix for readback.
 */
export function selectWebsiteEnquiries(
  widgetRows: WidgetEnquiry[], leadRows: TrackerEnquiry[],
  range: { from?: string | null; to?: string | null } = {},
): WebsiteEnquiry[] {
  const taggedPhones = new Set<string>();
  for (const row of widgetRows) if (row.p9 && widgetEnquiryChannel(row) !== 'website') taggedPhones.add(row.p9);
  const groups = new Map<string, Candidate[]>();
  const phoneless: Candidate[] = [];
  for (const [kind, rows] of [['widget', widgetRows], ['tracker', leadRows]] as const) {
    for (const row of rows) {
      if (!row.date || (range.from && row.date < range.from) || (range.to && row.date > range.to)) continue;
      const channel = kind === 'widget' ? widgetEnquiryChannel(row as WidgetEnquiry) : (row as TrackerEnquiry).channel;
      if (channel !== 'website' || (row.p9 && taggedPhones.has(row.p9))) continue;
      const d = row.data;
      const branchKey = canonicalBranch(pick(d, 'Clinic / Branch', 'Clinic', 'Clinic Name', 'Center'), d['_source_tab']);
      const sourceText = pick(d, 'Source', 'Source Type');
      const enquiry: WebsiteEnquiry = {
        key: '', p9: row.p9, date: isoDay(row.date), time: enquiryTime(d),
        name: pick(d, 'Full Name', 'Patient Name'), phone: pick(d, 'Phone Number', 'Contact Number'),
        branch: GMB_CLINICS.find((b) => b.key === branchKey)?.label ?? 'Unassigned',
        service: pick(d, 'Service / Lane requested', 'Service', 'Treatment', 'Campaign / Offer Name'),
        source: kind === 'widget' ? 'booking widget' : /incomplete/i.test(sourceText) ? 'incomplete booking' : /offer.*form/i.test(sourceText) ? 'offer form' : 'lead tracker: website',
        status: '', billed: null,
      };
      const candidate = { enquiry, widget: kind === 'widget' };
      if (!row.p9) { phoneless.push(candidate); continue; }
      const key = websiteIdentity(enquiry);
      groups.set(key, [...(groups.get(key) ?? []), candidate]);
    }
  }
  const selected: WebsiteEnquiry[] = [];
  for (const [key, candidates] of groups) {
    candidates.sort(byPreference);
    const chosen = { ...candidates[0].enquiry };
    // The earliest known time of the day, whichever row carried it.
    chosen.time = candidates.map((c) => c.enquiry.time).filter(Boolean).sort()[0] ?? '';
    chosen.key = `${key}#0`;
    selected.push(chosen);
  }
  phoneless.sort(byPreference);
  const occurrences = new Map<string, number>();
  for (const { enquiry } of phoneless) {
    const key = websiteIdentity(enquiry);
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    selected.push({ ...enquiry, key: `${key}#${occurrence}` });
  }
  return selected.sort((a, b) => `${a.date}T${a.time}|${a.key}`.localeCompare(`${b.date}T${b.time}|${b.key}`));
}
