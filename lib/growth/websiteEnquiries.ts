import { canonicalBranch } from '@/lib/lead-tracker/branch';
import { GMB_CLINICS } from '@/config/gmb-clinics';
import { minuteKey } from '@/lib/sync/mirrorHelpers';

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
export const widgetEnquiryChannel = (row: WidgetEnquiry) => row.hasLane ? 'affiliate' : row.paidSearch ? 'paid-search' : 'website';

/** Also reconstructible from the machine-owned sheet cells; no hidden PII key. */
export function websiteIdentity(row: Pick<WebsiteEnquiry, 'p9' | 'date' | 'time' | 'name' | 'branch' | 'service'>): string {
  const minute = minuteKey(`${row.date}T${row.time || '00:00'}`, '');
  return row.p9 ? `${row.p9}|${minute}` : JSON.stringify([minute, row.name, row.branch, row.service]);
}

/** The only website population selector. Source classification is supplied by
 * Growth's existing attribution preparation, never inferred again here.
 * Phone + minute is range-independent, unlike the old in-window phone grain.
 * Phoneless enquiries remain separate, with an occurrence suffix for readback.
 */
export function selectWebsiteEnquiries(
  widgetRows: WidgetEnquiry[], leadRows: TrackerEnquiry[],
  range: { from?: string | null; to?: string | null } = {},
): WebsiteEnquiry[] {
  const seen = new Set<string>();
  const occurrences = new Map<string, number>();
  const selected: WebsiteEnquiry[] = [];
  for (const [kind, rows] of [['widget', widgetRows], ['tracker', leadRows]] as const) {
    for (const row of rows) {
      if (!row.date || (range.from && row.date < range.from) || (range.to && row.date > range.to)) continue;
      const d = row.data;
      const channel = kind === 'widget' ? widgetEnquiryChannel(row as WidgetEnquiry) : (row as TrackerEnquiry).channel;
      const branchKey = canonicalBranch(pick(d, 'Clinic / Branch', 'Clinic', 'Clinic Name', 'Center'), d['_source_tab']);
      const sourceText = pick(d, 'Source', 'Source Type');
      const candidate: WebsiteEnquiry = {
        key: '', p9: row.p9, date: row.date, time: enquiryTime(d),
        name: pick(d, 'Full Name', 'Patient Name'), phone: pick(d, 'Phone Number', 'Contact Number'),
        branch: GMB_CLINICS.find((b) => b.key === branchKey)?.label ?? 'Unassigned',
        service: pick(d, 'Service / Lane requested', 'Service', 'Treatment', 'Campaign / Offer Name'),
        source: kind === 'widget' ? 'booking widget' : /incomplete/i.test(sourceText) ? 'incomplete booking' : /offer.*form/i.test(sourceText) ? 'offer form' : 'lead tracker: website',
        status: '', billed: null,
      };
      const key = websiteIdentity(candidate);
      if (row.p9 && seen.has(key)) continue;
      if (row.p9) seen.add(key); // earlier widget evidence wins across channels
      if (channel !== 'website') continue;
      const occurrence = occurrences.get(key) ?? 0;
      occurrences.set(key, occurrence + 1);
      candidate.key = `${key}#${occurrence}`;
      selected.push(candidate);
    }
  }
  return selected.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}
