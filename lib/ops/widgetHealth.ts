import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Booking-widget uptime, from the synthetic "robot patient" checks.
 *
 * The check drives the real widget the way a patient does and asserts the time
 * dropdown actually fills. That matters because the failure mode here is not a
 * dead site: during an outage the page still returns 200 and the widget still
 * renders — only the slot list is empty. Anything ping-based would report 100%
 * uptime straight through it.
 *
 * Never throws: a missing table (migration 0013 not run) reports 'missing'
 * rather than a fabricated 100%.
 */

export interface WidgetCheck {
  checkedAt: string;
  ok: boolean;
  slotsFound: number | null;
  stage: string | null;
  detail: string | null;
  /** False when the run couldn't determine the widget's state at all. */
  conclusive: boolean;
}

export interface WidgetIncident {
  /** First failing check. */
  startIso: string;
  /** Last failing check before recovery — equal to startIso for a single blip. */
  endIso: string;
  /** Still failing as of the newest check. */
  ongoing: boolean;
  checks: number;
  minutes: number;
  detail: string | null;
}

export interface WidgetHealthReport {
  source: 'live' | 'empty' | 'missing';
  /** Newest check, or null when there are none. */
  latest: WidgetCheck | null;
  /** Newest check that actually determined the widget's state. */
  latestConclusive: WidgetCheck | null;
  /** Checks that determined a state — the denominator for uptime. */
  totalChecks: number;
  failedChecks: number;
  /** Runs that couldn't determine anything (monitor/browser/network error). */
  inconclusiveChecks: number;
  /** Passing ÷ conclusive, 0–1. Null when nothing conclusive has run. */
  uptime: number | null;
  incidents: WidgetIncident[];
  /**
   * The WEBSITE itself, measured on the same runs but reported separately.
   * "Site down" and "site up but widget broken" are different emergencies.
   */
  site: {
    /** Null when no run has measured the site yet. */
    up: boolean | null;
    checkedAtIso: string | null;
    totalChecks: number;
    failedChecks: number;
    uptime: number | null;
    incidents: WidgetIncident[];
  };
}

const empty = (source: WidgetHealthReport['source']): WidgetHealthReport => ({
  source,
  latest: null,
  latestConclusive: null,
  totalChecks: 0,
  failedChecks: 0,
  inconclusiveChecks: 0,
  uptime: null,
  incidents: [],
  site: { up: null, checkedAtIso: null, totalChecks: 0, failedChecks: 0, uptime: null, incidents: [] },
});

/**
 * Collapse a run of consecutive failures into one incident with a real start and
 * end — "which day and time was it down", rather than a count of failed checks.
 * Input must be oldest-first.
 */
function buildIncidents(asc: { at: string; ok: boolean; detail: string | null }[]): WidgetIncident[] {
  const out: WidgetIncident[] = [];
  let open: { start: string; end: string; checks: number; detail: string | null } | null = null;
  for (const r of asc) {
    if (!r.ok) {
      if (open) {
        open.end = r.at;
        open.checks += 1;
      } else {
        open = { start: r.at, end: r.at, checks: 1, detail: r.detail };
      }
    } else if (open) {
      out.push(closeIncident(open, false));
      open = null;
    }
  }
  if (open) out.push(closeIncident(open, true)); // still failing at the newest check
  return out.reverse(); // newest first
}

export async function recordWidgetCheck(input: {
  ok: boolean;
  slotsFound: number | null;
  stage: string | null;
  detail: string | null;
  durationMs: number | null;
  conclusive?: boolean;
  siteOk?: boolean | null;
  siteStatus?: number | null;
  siteMs?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: 'Supabase not configured.' };
  try {
    const { error } = await db.from('widget_health').insert({
      ok: input.ok,
      slots_found: input.slotsFound,
      stage: input.stage,
      detail: input.detail,
      duration_ms: input.durationMs,
      conclusive: input.conclusive !== false,
      site_ok: input.siteOk ?? null,
      site_status: input.siteStatus ?? null,
      site_ms: input.siteMs ?? null,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'save failed' };
  }
}

/** Uptime + incidents over the last `days` (default 7). */
export async function getWidgetHealth(days = 7): Promise<WidgetHealthReport> {
  const db = getSupabaseAdmin();
  if (!db) return empty('missing');

  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const res = await db
    .from('widget_health')
    .select('checked_at, ok, slots_found, stage, detail, conclusive, site_ok')
    .gte('checked_at', since)
    .order('checked_at', { ascending: false })
    .order('id', { ascending: false }); // stable tiebreak; checked_at defaults to now()
  if (res.error) return empty('missing');

  type Row = {
    checked_at: string;
    ok: boolean;
    slots_found: number | null;
    stage: string | null;
    detail: string | null;
    conclusive: boolean | null;
    site_ok: boolean | null;
  };
  const all = (res.data as Row[] | null) ?? [];
  if (all.length === 0) return empty('empty');

  const toCheck = (r: Row): WidgetCheck => ({
    checkedAt: r.checked_at,
    ok: r.ok,
    slotsFound: r.slots_found,
    stage: r.stage,
    detail: r.detail,
    conclusive: r.conclusive !== false,
  });

  // Uptime and outages are computed ONLY over checks that determined a state.
  // A monitor that crashed says nothing about whether patients could book, and
  // counting it as downtime would make the percentage a lie.
  const rows = all.filter((r) => r.conclusive !== false);
  const inconclusiveChecks = all.length - rows.length;
  const latest = toCheck(all[0]);
  const latestConclusive = rows.length ? toCheck(rows[0]) : null;

  // The site verdict is independent of the widget verdict and of `conclusive`:
  // a run whose widget lookup failed may still have loaded the page fine.
  const siteRows = all.filter((r) => typeof r.site_ok === 'boolean');
  const siteFailed = siteRows.filter((r) => !r.site_ok).length;
  const site = {
    up: siteRows.length ? Boolean(siteRows[0].site_ok) : null,
    checkedAtIso: siteRows.length ? siteRows[0].checked_at : null,
    totalChecks: siteRows.length,
    failedChecks: siteFailed,
    uptime: siteRows.length ? (siteRows.length - siteFailed) / siteRows.length : null,
    incidents: buildIncidents(
      [...siteRows].reverse().map((r) => ({ at: r.checked_at, ok: Boolean(r.site_ok), detail: 'Website did not respond' })),
    ),
  };

  if (rows.length === 0) {
    return { ...empty('live'), latest, inconclusiveChecks, site };
  }

  const failedChecks = rows.filter((r) => !r.ok).length;

  const incidents = buildIncidents(
    [...rows].reverse().map((r) => ({ at: r.checked_at, ok: r.ok, detail: r.detail })),
  );

  return {
    source: 'live',
    latest,
    latestConclusive,
    totalChecks: rows.length,
    failedChecks,
    inconclusiveChecks,
    uptime: (rows.length - failedChecks) / rows.length,
    incidents,
    site,
  };
}

function closeIncident(
  o: { start: string; end: string; checks: number; detail: string | null },
  ongoing: boolean,
): WidgetIncident {
  const ms = Math.max(0, Date.parse(o.end) - Date.parse(o.start));
  return {
    startIso: o.start,
    endIso: o.end,
    ongoing,
    checks: o.checks,
    minutes: Math.round(ms / 60000),
    detail: o.detail,
  };
}
