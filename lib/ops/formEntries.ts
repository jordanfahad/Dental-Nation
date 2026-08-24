import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { ARABY_LANES } from '@/lib/arabyads/report';

/**
 * Watched-form entries read layer (Clinical Operations). Reads the mirrored
 * OPS_WATCHED_TABS rows (ops_form_entries) and presents ONE row per person:
 *
 *   · entries sharing a phone number collapse into the newest submission,
 *     with a repeat count — the same person filling two forms (or the same
 *     form twice) is one lead to call, not two;
 *   · entries whose phone also appears in the booking-widget worklist
 *     (raw_zavis) are flagged, so reception sees they are already being
 *     worked from the main list instead of calling twice.
 *
 * Lane counts feed the ArabyAds views — lane tags come from the sync's
 * parseArabySource mapping, the same rule every other araby panel uses.
 */

export interface FormEntry {
  key: string;
  submittedIso: string | null;
  submittedMs: number | null;
  tab: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  treatment: string | null;
  source: string | null;
  laneKey: string | null;
  laneLabel: string | null;
  /** How many submissions collapsed into this row (1 = no repeats). */
  submissions: number;
  /** Same phone already in the booking-widget lead-forms worklist. */
  alsoInWidget: boolean;
}

export interface FormEntriesReport {
  source: 'live' | 'empty';
  total: number; // deduped people
  rawEntries: number; // submissions before dedupe
  last7d: number;
  alsoInWidget: number;
  byLane: { key: string; label: string; count: number }[];
  untagged: number; // deduped rows with no araby lane
  rows: FormEntry[];
}

interface Row {
  entry_id: string;
  tab_title: string | null;
  submitted_at: string | null;
  name: string | null;
  phone: string | null;
  phone9: string | null;
  email: string | null;
  treatment: string | null;
  source: string | null;
  lane_key: string | null;
}

const empty: FormEntriesReport = {
  source: 'empty', total: 0, rawEntries: 0, last7d: 0, alsoInWidget: 0, byLane: [], untagged: 0, rows: [],
};

const laneLabelOf = (key: string | null): string | null =>
  key ? ARABY_LANES.find((l) => l.key === key)?.label ?? key : null;

const phone9 = (v: string): string => {
  const d = v.replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};

export async function getFormEntries(range: { from?: string; to?: string } = {}): Promise<FormEntriesReport> {
  const db = getSupabaseAdmin();
  if (!db) return empty;

  let rows: Row[] = [];
  const widgetPhones = new Set<string>();
  try {
    const [entries, widget] = await Promise.all([
      db
        .from('ops_form_entries')
        .select('entry_id, tab_title, submitted_at, name, phone, phone9, email, treatment, source, lane_key')
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .limit(5000),
      db.from('raw_zavis').select('data'),
    ]);
    rows = (entries.data as Row[] | null) ?? [];
    for (const r of (widget.data as { data: Record<string, unknown> }[] | null) ?? []) {
      const p = phone9(String(r.data?.['Phone Number'] ?? r.data?.['Phone'] ?? ''));
      if (p) widgetPhones.add(p);
    }
  } catch {
    return empty;
  }
  if (rows.length === 0) return empty;

  const { from, to } = range;
  const inRange = rows.filter((r) => {
    const day = r.submitted_at ? r.submitted_at.slice(0, 10) : null;
    if (from && day && day < from) return false;
    if (to && day && day > to) return false;
    return true;
  });

  // Dedupe by person: phone when present, else the entry itself. Rows are
  // newest-first, so the first occurrence is the one that stays.
  const byPerson = new Map<string, { row: Row; submissions: number }>();
  for (const r of inRange) {
    const k = r.phone9 || r.entry_id;
    const cur = byPerson.get(k);
    if (cur) cur.submissions += 1;
    else byPerson.set(k, { row: r, submissions: 1 });
  }

  const out: FormEntry[] = [...byPerson.values()].map(({ row: r, submissions }) => {
    const ms = r.submitted_at ? Date.parse(r.submitted_at) : NaN;
    return {
      key: r.entry_id,
      submittedIso: r.submitted_at,
      submittedMs: Number.isNaN(ms) ? null : ms,
      tab: r.tab_title,
      name: r.name,
      phone: r.phone,
      email: r.email,
      treatment: r.treatment,
      source: r.source,
      laneKey: r.lane_key,
      laneLabel: laneLabelOf(r.lane_key),
      submissions,
      alsoInWidget: Boolean(r.phone9 && widgetPhones.has(r.phone9)),
    };
  });
  out.sort((a, b) => (b.submittedMs ?? 0) - (a.submittedMs ?? 0));

  const now = Date.now();
  const byLane = ARABY_LANES.map((l) => ({
    key: l.key,
    label: l.label,
    count: out.filter((r) => r.laneKey === l.key).length,
  })).filter((l) => l.count > 0);

  return {
    source: 'live',
    total: out.length,
    rawEntries: inRange.length,
    last7d: out.filter((r) => r.submittedMs && now - r.submittedMs < 7 * 86400_000).length,
    alsoInWidget: out.filter((r) => r.alsoInWidget).length,
    byLane,
    untagged: out.filter((r) => !r.laneKey).length,
    rows: out.slice(0, 200),
  };
}
