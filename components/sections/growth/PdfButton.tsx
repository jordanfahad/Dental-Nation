'use client';

/**
 * Download-as-PDF for the Growth Platform: triggers the browser's print flow
 * (Save as PDF). The dashboard's print stylesheet strips navigation and the
 * interactive chrome (.no-print) so what lands in the PDF is the report
 * itself. The button hides itself in the printout.
 */
export function PdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-[11.5px] font-medium text-ink-soft transition hover:border-accent/40 hover:text-ink"
      title="Opens the print dialog — choose “Save as PDF”"
    >
      <span aria-hidden>⤓</span> Download PDF
    </button>
  );
}
