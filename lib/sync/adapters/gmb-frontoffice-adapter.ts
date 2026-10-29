import 'server-only';
import type { sheets_v4 } from 'googleapis';
import type { AdminClient } from '@/lib/supabase/server';
import { activationSources } from '@/config/sheet-mapping';
import { discoveredGmbClinic, inferGmbClinic, type GmbClinicKey } from '@/config/gmb-clinics';
import { canonicalBranch } from '@/lib/lead-tracker/branch';
import { reportDateForSync } from '@/lib/dates';
import { cellCount, cellText, isMissingTable, labelText } from './sheet-cells';

/**
 * Front-office "GMB" tab of the Inhouse Lead Tracker → lane_e.gmb_frontoffice_daily.
 *
 * The front office OVERWRITES this tab every day (reviews asked for today,
 * photos and videos posted), so the sync snapshots it: one row per (Dubai sync
 * day, clinic), upserted so the latest sync of the day wins.
 *
 * Layout (Oct 2026): row 1 a merged title ("Google My Business - October
 * 2026"); row 2 merged group headers ("Google Reviews today" over A-E, "Posts"
 * over H-I); row 3 the headers: Branch Name, FO Name, Google Reviews today,
 * Google Reviews (Individual), Google Reviews total, (blank), branch name
 * again, Photos, Videos. Columns are found by header text, never by letter, and
 * the posts block is matched by its own branch column (it may be ordered
 * differently from the reviews block).
 */

export interface GmbFrontOfficeRow {
  clinic: GmbClinicKey;
  branch_label: string;
  /** First name only (staff). */
  fo_name: string | null;
  reviews_today: number | null;
  reviews_individual: number | null;
  reviews_total: number | null;
  photos: number | null;
  videos: number | null;
  month_title: string | null;
  source_row: number;
}

export interface GmbFrontOfficeParse {
  monthTitle: string | null;
  rows: GmbFrontOfficeRow[];
  warnings: string[];
}

/**
 * Branch text → clinic. The lead tracker's exact desk spellings first
 * (canonicalBranch), then the Business Profile allowlist (discoveredGmbClinic),
 * then inferGmbClinic — but only when the text names a clinic, because its
 * fallback is Dental Nation for anything. Unknown → null (reported, not guessed).
 */
export function gmbClinicOfBranch(label: string): GmbClinicKey | null {
  const text = cellText(label);
  if (!text) return null;
  const desk = canonicalBranch(text);
  if (desk !== 'unassigned') return desk;
  const listed = discoveredGmbClinic(text);
  if (listed) return listed;
  const lc = text.toLowerCase();
  if (/tosun|maher|\bamc\b/.test(lc)) return inferGmbClinic(text);
  if (/\bwasl\b|\bdn\b|dental nation|\btdc\b/.test(lc)) return 'dental-nation';
  return null;
}

const firstName = (v: unknown): string | null => cellText(v).split(' ')[0] || null;

type ColKey = keyof typeof activationSources.gmbFrontOffice.columns;
const FALLBACK: Record<ColKey, RegExp> = {
  branch: /\bbranch\b/,
  foName: /^f\.?o\.?\b|front ?office/,
  reviewsToday: /reviews?.*today/,
  reviewsIndividual: /individual/,
  reviewsTotal: /reviews?.*total/,
  photos: /photo/,
  videos: /video/,
};

/** Pure: parse the GMB tab's value grid. Throws only when no header row exists. */
export function parseGmbFrontOffice(values: unknown[][]): GmbFrontOfficeParse {
  const cfg = activationSources.gmbFrontOffice.columns;
  const warnings: string[] = [];
  const headerIdx = values.slice(0, 10).findIndex((r) => (r ?? []).some((c) => labelText(c) === labelText(cfg.branch)));
  if (headerIdx < 0) throw new Error(`header row with "${cfg.branch}" not found in the first 10 rows`);
  const header = (values[headerIdx] ?? []).map(labelText);

  const col = {} as Record<ColKey, number>;
  for (const key of Object.keys(cfg) as ColKey[]) {
    let i = header.findIndex((h) => h === labelText(cfg[key]));
    if (i < 0) i = header.findIndex((h) => FALLBACK[key].test(h));
    col[key] = i;
    if (i < 0) warnings.push(`column "${cfg[key]}" not found`);
  }
  if (col.branch < 0) throw new Error(`column "${cfg.branch}" not found`);

  // The posts block's own branch column: a second "Branch" header after the
  // first, else the column just left of Photos when its header is blank.
  let postsBranch = header.findIndex((h, i) => i > col.branch && FALLBACK.branch.test(h));
  const postsCol = col.photos >= 0 ? col.photos : col.videos;
  if (postsBranch < 0 && postsCol > 0) {
    const left = postsCol - 1;
    if (left > col.branch && !header[left] && !Object.values(col).includes(left)) postsBranch = left;
  }

  let monthTitle: string | null = null;
  for (const r of values.slice(0, headerIdx)) {
    const hit = (r ?? []).map(cellText).find((c) => /google my business|\b(19|20)\d{2}\b/i.test(c));
    if (hit) { monthTitle = hit; break; }
  }
  if (!monthTitle) monthTitle = (values[0] ?? []).map(cellText).find(Boolean) ?? null;

  const at = (r: unknown[], i: number) => (i >= 0 ? r[i] : undefined);
  const byClinic = new Map<GmbClinicKey, GmbFrontOfficeRow>();
  const posts = new Map<GmbClinicKey, { photos: number | null; videos: number | null }>();
  /** Clinics seen so far only in the posts block (their reviews row may come later). */
  const postsOnly = new Set<GmbClinicKey>();
  const blank = (clinic: GmbClinicKey, label: string, row: number): GmbFrontOfficeRow => ({
    clinic, branch_label: label, fo_name: null, reviews_today: null, reviews_individual: null, reviews_total: null,
    photos: null, videos: null, month_title: monthTitle, source_row: row,
  });
  const count = (r: unknown[], i: number, what: string, rowNo: number) => {
    const raw = at(r, i);
    const n = cellCount(raw);
    if (n == null && cellText(raw)) warnings.push(`row ${rowNo}: ${what} "${cellText(raw)}" is not a count`);
    return n;
  };

  for (let i = headerIdx + 1; i < values.length; i++) {
    const r = values[i] ?? [];
    const rowNo = i + 1;
    const label = cellText(at(r, col.branch));
    if (label && !/^(total|grand total)\b/i.test(label)) {
      const clinic = gmbClinicOfBranch(label);
      if (!clinic) warnings.push(`row ${rowNo}: branch "${label}" not recognised`);
      else if (byClinic.has(clinic) && !postsOnly.has(clinic)) warnings.push(`row ${rowNo}: second row for ${clinic} ignored`);
      else {
        postsOnly.delete(clinic);
        byClinic.set(clinic, {
          ...blank(clinic, label, rowNo),
          fo_name: col.foName >= 0 ? firstName(at(r, col.foName)) : null,
          reviews_today: count(r, col.reviewsToday, 'reviews today', rowNo),
          reviews_individual: count(r, col.reviewsIndividual, 'reviews (individual)', rowNo),
          reviews_total: count(r, col.reviewsTotal, 'reviews total', rowNo),
        });
      }
    }
    // Posts: matched by the posts block's branch cell, else this row's branch.
    const postLabel = cellText(at(r, postsBranch)) || label;
    if (postLabel && !/^(total|grand total)\b/i.test(postLabel) && (col.photos >= 0 || col.videos >= 0)) {
      const clinic = gmbClinicOfBranch(postLabel);
      if (!clinic) {
        if (postLabel !== label) warnings.push(`row ${rowNo}: posts branch "${postLabel}" not recognised`);
      } else if (!posts.has(clinic)) {
        posts.set(clinic, { photos: count(r, col.photos, 'photos', rowNo), videos: count(r, col.videos, 'videos', rowNo) });
        if (!byClinic.has(clinic) && postLabel !== label) { byClinic.set(clinic, blank(clinic, postLabel, rowNo)); postsOnly.add(clinic); }
      }
    }
  }
  for (const [clinic, p] of posts) {
    const row = byClinic.get(clinic);
    if (row) { row.photos = p.photos; row.videos = p.videos; }
  }
  return { monthTitle, rows: [...byClinic.values()], warnings };
}

export interface GmbFrontOfficeSyncResult {
  ok: boolean;
  stored: number;
  day: string;
  warnings: string[];
  /** The table is not there yet (migration 0051 not applied). */
  missingTable?: boolean;
  error?: string;
}

/** Read the GMB tab and upsert today's (Dubai) snapshot. Never throws. */
export async function syncGmbFrontOffice(
  supabase: AdminClient, sheets: sheets_v4.Sheets, now: Date = new Date(),
): Promise<GmbFrontOfficeSyncResult> {
  const src = activationSources.gmbFrontOffice;
  const day = reportDateForSync(now);
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: src.spreadsheetId,
      range: `'${src.tab.replace(/'/g, "''")}'`,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });
    const values = (res.data.values ?? []) as unknown[][];
    if (values.length === 0) return { ok: false, stored: 0, day, warnings: [], error: 'tab is empty' };
    const parsed = parseGmbFrontOffice(values);
    if (parsed.rows.length === 0) return { ok: false, stored: 0, day, warnings: parsed.warnings, error: 'no branch rows found' };
    const syncedAt = now.toISOString();
    const payload = parsed.rows.map((r) => ({ ...r, snapshot_day: day, synced_at: syncedAt }));
    const { error } = await supabase.from(src.table).upsert(payload, { onConflict: 'snapshot_day,clinic' });
    if (error) {
      return { ok: false, stored: 0, day, warnings: parsed.warnings, missingTable: isMissingTable(error), error: `upsert failed: ${error.message}` };
    }
    return { ok: true, stored: payload.length, day, warnings: parsed.warnings };
  } catch (err) {
    return { ok: false, stored: 0, day, warnings: [], error: (err as Error).message };
  }
}
