import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { clinicLabel, clinicOfCenter } from '@/config/clinics';

/**
 * Recent WEBSITE-WIDGET submissions, read straight from the fresh sheet mirror
 * (lane_e.raw_zavis) — the Google Sheet every on-site booking flows into, synced
 * on the cron. This is the FAST path: a booking shows here within one sync cycle,
 * carrying the sheet's "Source" column (col T) so ArabyAds bookings are attributed
 * by landing page + PID/SUB, and INCLUDING test/seed orders (flagged) so a test
 * lead can be confirmed end to end. Scope is website-widget ONLY — WhatsApp and
 * direct/Practo bookings arrive through the CRM/Practo feeds, not this sheet.
 *
 * We deliberately do NOT read the derived `bookings` table here: that one strips
 * every test row at sync time and lags. Degrades to a well-formed empty state.
 */
const num = (v: unknown): number | null => {
  if (v == null) return null;
  const t = String(v).replace(/[^\d.-]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** Same test rule as the sync (normalize.ts isTestBooking + ArabyAds report):
 *  seed name/email, a "test" PID, or a Booking Reference starting with "BK". */
function isTestRow(email: string, name: string, pid: string | null, bookingRef: string): boolean {
  if (/zavis|test/i.test(email) || /test|sagar/i.test(name)) return true;
  if (pid && /test/i.test(pid)) return true;
  if (/^BK/i.test(bookingRef.trim())) return true;
  return false;
}

const ARABY_LANE_LABEL: Record<string, string> = {
  glowup: 'Glow-Up',
  sos: 'SOS',
  scan: 'Scan',
};

/** Parse the widget "Source" cell → a human label + ArabyAds PID/SUB when present. */
function parseSource(raw: string): { label: string; pid: string | null; sub: string | null; isAraby: boolean } {
  const s = (raw ?? '').trim();
  if (!s) return { label: 'Website (direct/organic)', pid: null, sub: null, isAraby: false };
  if (/arabyads/i.test(s)) {
    const m = s.match(/dental_nation_(glowup|sos|scan)/i);
    const lane = m ? ARABY_LANE_LABEL[m[1].toLowerCase()] ?? m[1] : null;
    const pidM = s.match(/PID:\s*([^,)]*)/i);
    const subM = s.match(/SUB:\s*([^,)]*)/i);
    return {
      label: lane ? `ArabyAds · ${lane}` : 'ArabyAds',
      pid: pidM ? pidM[1].trim() || null : null,
      sub: subM ? subM[1].trim() || null : null,
      isAraby: true,
    };
  }
  return { label: s, pid: null, sub: null, isAraby: false };
}

/** "07/14/2026, 14:38:21" → "2026-07-14" (booked-on). null on bad input. */
function bookedOnDate(ts: string): string | null {
  const m = (ts ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/** "07/14/2026, 14:38:21" → "14 Jul 2026 · 14:38". */
function bookedOnLabel(ts: string): string | null {
  const d = bookedOnDate(ts);
  if (!d) return null;
  const tm = (ts ?? '').match(/(\d{1,2}):(\d{2})/);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [y, mo, da] = d.split('-');
  const label = `${Number(da)} ${MONTHS[Number(mo) - 1]} ${y}`;
  return tm ? `${label} · ${tm[1].padStart(2, '0')}:${tm[2]}` : label;
}

/** Appointment slot from Date (YYYY-MM-DD) + Time (ISO) → "16 Jul 2026 · 12:30". */
function apptLabel(dateISO: string, timeISO: string): string | null {
  const d = (dateISO ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [y, mo, da] = d.split('-');
  const label = `${Number(da)} ${MONTHS[Number(mo) - 1]} ${y}`;
  const tm = (timeISO ?? '').match(/T(\d{2}):(\d{2})/);
  return tm ? `${label} · ${tm[1]}:${tm[2]}` : label;
}

export interface WidgetBookingRow {
  bookedOn: string | null; // YYYY-MM-DD sort key (when the booking was placed)
  bookedOnLabel: string | null; // e.g. "14 Jul 2026 · 14:38"
  apptLabel: string | null; // appointment slot, e.g. "16 Jul 2026 · 12:30"
  patientName: string;
  treatment: string | null;
  doctor: string | null;
  clinic: string; // derived clinic label (Dental Nation / Dr Tosun) from Clinic Name
  sourceLabel: string; // parsed Source (col T): "ArabyAds · Glow-Up" / "Website (direct/organic)"
  pid: string | null;
  sub: string | null;
  price: number | null;
  bookingRef: string | null;
  isTest: boolean;
}

export interface RecentWidgetBookings {
  source: 'live' | 'empty';
  rows: WidgetBookingRow[]; // most recent first, capped at `limit`
  total: number; // full count before the cap
  real: number; // non-test count in range
  test: number; // test/seed count in range
}

const empty: RecentWidgetBookings = { source: 'empty', rows: [], total: 0, real: 0, test: 0 };

export async function getRecentWidgetBookings(opts: {
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<RecentWidgetBookings> {
  const limit = opts.limit ?? 50;
  const db = getSupabaseAdmin();
  if (!db) return empty;
  try {
    const { data, error } = await db.from('raw_zavis').select('data');
    if (error || !Array.isArray(data) || data.length === 0) return empty;

    const raw = data as { data: Record<string, string> }[];
    let real = 0;
    let test = 0;

    const rows: WidgetBookingRow[] = [];
    for (const r of raw) {
      const d = r.data ?? {};
      const ts = String(d['Timestamp'] ?? '').trim();
      // Scope on booked-on (Timestamp) so a booking placed today shows now, even
      // when its appointment date is in the future. Fall back to the appt Date.
      const bookedOn = bookedOnDate(ts) ?? (String(d['Date'] ?? '').slice(0, 10) || null);
      if (opts.from && (!bookedOn || bookedOn < opts.from)) continue;
      if (opts.to && (!bookedOn || bookedOn > opts.to)) continue;

      const name = String(d['Full Name'] ?? '').trim();
      const email = String(d['Email'] ?? '').trim();
      const parsed = parseSource(String(d['Source'] ?? ''));
      const isTest = isTestRow(email, name, parsed.pid, String(d['Booking Reference'] ?? ''));
      if (isTest) test += 1;
      else real += 1;

      rows.push({
        bookedOn,
        bookedOnLabel: ts ? bookedOnLabel(ts) : null,
        apptLabel: apptLabel(String(d['Date'] ?? ''), String(d['Time'] ?? '')),
        patientName: name || '—',
        treatment: String(d['Treatment'] ?? '').trim() || null,
        doctor: String(d['Doctor Name'] ?? '').trim() || null,
        clinic: clinicLabel(clinicOfCenter(String(d['Clinic Name'] ?? ''))),
        sourceLabel: parsed.label,
        pid: parsed.pid,
        sub: parsed.sub,
        price: num(d['Price']),
        bookingRef: String(d['Booking Reference'] ?? '').trim() || null,
        isTest,
      });
    }

    if (rows.length === 0) return empty;
    rows.sort((a, b) => (b.bookedOn ?? '').localeCompare(a.bookedOn ?? ''));
    return { source: 'live', rows: rows.slice(0, limit), total: rows.length, real, test };
  } catch {
    return empty;
  }
}
