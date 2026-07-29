'use client';

/**
 * Download-as-PDF for the Growth Platform. Opens the dedicated PRINT EDITION
 * (/reports/growth) — a standalone A4-designed report that fetches one read
 * layer and auto-opens the print dialog (?print=1) — instead of printing the
 * interactive dashboard through, which produced whitespace pages and washed-
 * out charts. Carries the active window + clinic scope.
 */
export function PdfButton({ from, to, gclinic }: { from?: string; to?: string; gclinic?: string }) {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  if (gclinic && gclinic !== 'all') qs.set('gclinic', gclinic);
  qs.set('print', '1');
  return (
    <a
      href={`/reports/growth?${qs.toString()}`}
      target="_blank"
      rel="noopener"
      className="no-print inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-[11.5px] font-medium text-ink-soft transition hover:border-accent/40 hover:text-ink"
      title="Opens the print edition in a new tab — choose “Save as PDF”"
    >
      <span aria-hidden>⤓</span> Download PDF
    </a>
  );
}
