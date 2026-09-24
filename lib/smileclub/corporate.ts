/**
 * Gautam's corporate pipeline (25 Sep): the company types he tracks, the
 * pipeline stages, and the calendar import that files each "SC – Company – …"
 * calendar entry against the company and the right corporate task.
 *
 * Client-safe: types, constants and the pure .ics parser. Rows live in
 * lane_e.sc_companies and lane_e.sc_calendar_events (migration 0039).
 */

export type CompanyType = 'warm' | 'sme' | 'frontline' | 'school' | 'enterprise' | 'unsorted';
export type Stage = 'target' | 'contacted' | 'meeting' | 'proposal' | 'signed' | 'launched' | 'lost';
export type EventKind = 'visit' | 'follow-up' | 'meeting' | 'proposal' | 'dental-day' | 'launch' | 'other';

export interface CompanyTypeDef {
  id: CompanyType;
  label: string;
  who: string;
  decides: string;
  approach: string;
  when: string;
}

/** The company types Gautam tracks — in this order. */
export const COMPANY_TYPES: CompanyTypeDef[] = [
  { id: 'warm', label: 'Warm introductions', who: 'Assembly Global, ArabyAds (staff), RBS, existing Dental Nation partners, Mr Akbar’s three introductions.', decides: 'Whoever the introducer knows — usually the CEO or HR head.', approach: 'Email or LinkedIn introduction by Fahad or Mr Akbar → Gautam proposes two meeting times the same day.', when: 'Now' },
  { id: 'sme', label: 'Small & mid-sized offices (20–200 staff)', who: 'Offices in JLT, Business Bay, DIFC and Al Quoz within 15 minutes of a branch — ideally several in one tower.', decides: 'Owner or general manager, often on the spot.', approach: 'Door visit, then a 20-minute meeting.', when: 'Door visits from Tue 29 Sep, Tue–Thu 10:00–12:00 and 14:00–16:00' },
  { id: 'frontline', label: 'Frontline employers', who: 'Hotels, restaurants, retail, facilities management, security — staff on basic insurance with little or no dental.', decides: 'HR or operations manager.', approach: 'Appointment first (phone or email), then the free on-site dental day.', when: 'From Tue 29 Sep' },
  { id: 'school', label: 'Schools & nurseries', who: 'Schools near a branch — staff first, parents later.', decides: 'Principal or HR.', approach: 'Appointment first; staff offer plus a dentist-led parent talk.', when: 'From Tue 29 Sep' },
  { id: 'enterprise', label: 'Large companies (1,000+ staff)', who: 'Only through a warm introduction or a broker.', decides: 'HR benefits team.', approach: 'Never a cold visit — introduction or broker meeting only.', when: 'Only when introduced' },
];

export const TYPE_LABEL: Record<CompanyType, string> = {
  ...Object.fromEntries(COMPANY_TYPES.map((t) => [t.id, t.label])) as Record<Exclude<CompanyType, 'unsorted'>, string>,
  unsorted: 'New from calendar — set the type',
};

export const STAGES: { id: Stage; label: string }[] = [
  { id: 'target', label: 'Target' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'meeting', label: 'Meeting held' },
  { id: 'proposal', label: 'Proposal sent' },
  { id: 'signed', label: 'Trial signed' },
  { id: 'launched', label: 'Staff launched' },
  { id: 'lost', label: 'Not now' },
];
export const STAGE_ORDER: Record<Stage, number> = Object.fromEntries(STAGES.map((s, i) => [s.id, i])) as Record<Stage, number>;

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  area: string | null;
  staffBand: string | null;
  source: string | null;
  stage: Stage;
  nextStep: string | null;
  nextDate: string | null;
  members: number;
  note: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface CalEvent {
  uid: string;
  startsAt: string;
  endsAt: string | null;
  title: string;
  location: string | null;
  companyId: string | null;
  company: string | null;
  kind: EventKind;
  taskKey: string;
}

export interface CorpState {
  companies: Company[];
  events: CalEvent[];
  lastUpload: { at: string; by: string } | null;
}

/** Calendar naming rule Gautam follows. */
export const CAL_RULE = 'SC – Company name – visit / follow-up / meeting / proposal / dental day / launch';

/** Only this window is imported. */
export const CAL_WINDOW = { from: '2026-09-22', to: '2026-10-31' };

/* ── .ics parsing (RFC 5545 subset: VEVENT, SUMMARY, LOCATION, DTSTART, DTEND, UID, STATUS) ── */

export interface IcsEvent { uid: string; start: string; end: string | null; summary: string; location: string | null; cancelled: boolean }

const unescapeIcs = (s: string) => s.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

/** ICS date/time → ISO string. Floating and TZID times are taken as Dubai time (UTC+4, no daylight saving). */
function icsDate(params: string, value: string): string | null {
  const v = value.trim();
  if (/VALUE=DATE(?!-)/i.test(params) || /^\d{8}$/.test(v)) {
    const m = v.match(/^(\d{4})(\d{2})(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}T00:00:00+04:00` : null;
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? '00'}`;
  return m[7] ? `${iso}Z` : `${iso}+04:00`;
}

export function parseIcs(text: string): IcsEvent[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const out: IcsEvent[] = [];
  let cur: Partial<IcsEvent> | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = { location: null, end: null, cancelled: false }; continue; }
    if (line === 'END:VEVENT') {
      if (cur?.uid && cur.start && cur.summary) out.push(cur as IcsEvent);
      cur = null;
      continue;
    }
    if (!cur) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const head = line.slice(0, i);
    const value = line.slice(i + 1);
    const [name, ...rest] = head.split(';');
    const params = rest.join(';');
    switch (name.toUpperCase()) {
      case 'UID': cur.uid = value.trim().slice(0, 300); break;
      case 'SUMMARY': cur.summary = unescapeIcs(value).slice(0, 200); break;
      case 'LOCATION': cur.location = unescapeIcs(value).slice(0, 200) || null; break;
      case 'DTSTART': cur.start = icsDate(params, value) ?? undefined; break;
      case 'DTEND': cur.end = icsDate(params, value); break;
      case 'STATUS': cur.cancelled = value.trim().toUpperCase() === 'CANCELLED'; break;
    }
  }
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();

/** "SC – Acme Trading – visit" → { company: 'Acme Trading', kindText: 'visit' }. */
export function parseScTitle(summary: string): { company: string; kindText: string } | null {
  const m = summary.match(/^\s*(?:SC|Smile Club)\s*[-–—:|]\s*(.+?)\s*(?:[-–—:|]\s*(.+))?$/i);
  if (!m) return null;
  return { company: m[1].trim(), kindText: (m[2] ?? '').trim() };
}

export function kindOf(text: string): EventKind {
  const t = text.toLowerCase();
  if (/dental day|on-?site|check day/.test(t)) return 'dental-day';
  if (/launch|staff message/.test(t)) return 'launch';
  if (/proposal|contract|sign/.test(t)) return 'proposal';
  if (/follow|chase|call back|reminder/.test(t)) return 'follow-up';
  if (/visit|door|walk-?in|drop/.test(t)) return 'visit';
  if (/meet|call|demo|present|lunch|coffee/.test(t)) return 'meeting';
  return 'other';
}

/** Which Smile Club corporate task an event belongs to. */
export function taskFor(kind: EventKind, dateIso: string): string {
  const d = dateIso.slice(0, 10);
  if (kind === 'dental-day') return 'g-onsite';
  if (kind === 'launch') return 'g-launch';
  if (kind === 'proposal') return d <= '2026-10-09' ? 'g-pilot' : 'g-launch';
  if (d <= '2026-10-02') return 'g-doors-20';
  if (d <= '2026-10-09') return 'g-pilot';
  if (d <= '2026-10-16') return 'g-onsite';
  return 'g-launch';
}

/** Match a calendar event to a pipeline company (exact SC title first, then name mentioned anywhere). */
export function matchCompany(ev: IcsEvent, companies: { id: string; name: string }[]): { id: string | null; name: string | null; kindText: string } | null {
  const sc = parseScTitle(ev.summary);
  if (sc) {
    const hit = companies.find((c) => norm(c.name) === norm(sc.company));
    return { id: hit?.id ?? null, name: hit?.name ?? sc.company, kindText: sc.kindText || ev.summary };
  }
  const hay = ` ${norm(`${ev.summary} ${ev.location ?? ''}`)} `;
  const hit = companies.filter((c) => norm(c.name).length >= 3).find((c) => hay.includes(` ${norm(c.name)} `));
  return hit ? { id: hit.id, name: hit.name, kindText: ev.summary } : null;
}
