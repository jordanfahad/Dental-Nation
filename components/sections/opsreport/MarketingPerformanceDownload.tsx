'use client';

import { useState } from 'react';
import type { PerformanceExport } from '@/lib/opsreport/marketingPerformanceExport';

export function MarketingPerformanceDownload({ data }: { data: PerformanceExport }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      for (const table of data.sheets) {
        const sheet = XLSX.utils.aoa_to_sheet(table.rows);
        sheet['!cols'] = [16, 14, 13, 16, 14, 54, 18, 24, 72, 68, 100].map((wch) => ({ wch }));
        sheet['!autofilter'] = { ref: sheet['!ref'] ?? 'A1:K1' };
        XLSX.utils.book_append_sheet(workbook, sheet, table.name);
      }
      XLSX.writeFile(workbook, `marketing-performance-${data.asOf}.xlsx`, { compression: true });
    } catch {
      setError('The download could not be prepared. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print">
      <button type="button" onClick={download} disabled={busy} className="rounded-md border border-line bg-white px-3.5 py-2 text-[12px] font-semibold text-ink transition hover:border-accent disabled:cursor-wait disabled:opacity-60">
        {busy ? 'Preparing Excel file...' : 'Download four tables (Excel)'}
      </button>
      {error ? <p role="alert" className="mt-1 text-[11px] text-red-700">{error}</p> : null}
    </div>
  );
}
