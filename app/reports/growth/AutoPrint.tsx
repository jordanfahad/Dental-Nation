'use client';

import { useEffect } from 'react';

/**
 * Print chrome for the standalone Growth report: a Save-as-PDF button, and —
 * when the page was opened from the dashboard's Download-PDF button
 * (?print=1) — the print dialog opens itself once the page has painted.
 */
export function AutoPrint({ auto }: { auto: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, [auto]);
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-md bg-accent px-4 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90"
    >
      Save as PDF
    </button>
  );
}
