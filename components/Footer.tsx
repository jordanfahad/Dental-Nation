import type { IngestionStatus } from '@/lib/types';
import { dubaiTime } from '@/lib/dates';

/** Thin footer + (if last sync was partial/failed) an unobtrusive amber banner
 *  naming which sheets failed (§13). */
export function Footer({ ingestion }: { ingestion: IngestionStatus | null }) {
  const status = ingestion?.status ?? 'success';
  const degraded = status === 'partial' || status === 'failed';
  const synced = ingestion?.finished_at ? dubaiTime(ingestion.finished_at) : '—';

  return (
    <footer className="mt-6">
      {degraded ? (
        <div className="mb-3 rounded-md border border-watch/30 bg-watch/5 px-3 py-2 text-[12.5px] text-watch">
          <span className="font-semibold">Sync {status}.</span>{' '}
          {ingestion?.sheets_failed?.length
            ? `Failed: ${ingestion.sheets_failed.join(', ')}.`
            : 'Some sources did not load.'}{' '}
          Figures may be incomplete.
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-3 text-[11.5px] text-ink-faint">
        <span>Last synced {synced} (Dubai)</span>
        <span aria-hidden>·</span>
        <span>source: Google Sheets</span>
        <span aria-hidden>·</span>
        <span>
          sync status:{' '}
          <span className={degraded ? 'text-watch' : 'text-good'}>{status}</span>
        </span>
        {ingestion?.rows_ingested != null ? (
          <>
            <span aria-hidden>·</span>
            <span className="tnum">{ingestion.rows_ingested} rows</span>
          </>
        ) : null}
      </div>
    </footer>
  );
}
