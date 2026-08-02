'use client';

/**
 * Save-as-PDF for the share views. The print stylesheet (globals.css + the
 * `no-print` class) strips the nav and controls, so what prints is the document
 * itself — a clean board packet, not a screenshot of an app.
 */
export function PrintButton({ label = 'Save as PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-md border border-line bg-card px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition hover:bg-panel"
    >
      {label}
    </button>
  );
}
