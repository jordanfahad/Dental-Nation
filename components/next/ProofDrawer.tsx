'use client';

/**
 * DN-032 proof drawer (mockup 05). The ONE client component on the /next
 * preview: every figure on the page is a server-rendered <button data-proof>
 * carrying plain strings (value, dates, scope, proof URL). This component
 * listens for clicks on any of them, looks the metric up in the registry and
 * opens a modal drawer with the definition and a "Open the detail view"
 * button. The closing line under the button is per metric: it claims email
 * parity or date pinning only for the figures where that is true. Escape
 * (native to <dialog>) and a backdrop click close it.
 */
import { useEffect, useRef, useState } from 'react';
import { METRICS, type MetricId } from '@/lib/metrics/registry';

export interface ProofPayload {
  id: MetricId;
  /** The figure exactly as displayed ("AED 120,000" or "Unavailable"). */
  value: string;
  /** Exact Dubai dates ("1 to 27 Oct 2026" or "Live when opened"). */
  dates: string;
  /** Clinic scope ("All clinics, together" / "Al Wasl"). */
  scope: string;
  /** The detail view that proves this figure. */
  url: string;
  /** Optional extra line (why a figure is unavailable). */
  note?: string;
}

const EMAIL_PINNED =
  'This is the view the morning email links for this figure, pinned to the same dates and clinic.';
const LIVE_EMAIL = 'This is the view the morning email links for this figure. The view is live, not pinned to dates.';

const NEAREST = 'The nearest detail view; this figure is not in the morning email.';

/* Clinic Activation (/next/activation) figures. */
const TRACKER_NEAREST =
  'The nearest detail view: Growth enquiries for the same dates and clinic. This figure is counted from the lead tracker, so the totals can differ.';
const FRONT_OFFICE =
  'Google\u2019s own figures, for comparison: the front office entries have no other view on the dashboard.';
const AMC_SHEET = 'The source sheet itself: the dashboard has no other view of the AMC daily reports.';

/**
 * Closing line under "Open the detail view", per metric - never promise more
 * than the link does. Partial on purpose (MetricId is open-ended), so the
 * line renders only when an entry exists; every figure the preview pages
 * show has one.
 */
const PROOF_FOOTNOTES: Partial<Record<MetricId, string>> = {
  M01: EMAIL_PINNED,
  M03: EMAIL_PINNED,
  M04: EMAIL_PINNED,
  M05: 'The Growth view this figure is read from, pinned to the same dates and clinic lens; the morning email does not show missed appointments.',
  M06: EMAIL_PINNED,
  M07: EMAIL_PINNED,
  M08: 'The nearest detail view for this figure; the morning email does not show a group cost per enquiry.',
  M11: 'The Social & Local view behind this figure, pinned to the same window of reported days; the morning email shows the latest reported day, not this month-to-date total.',
  M15: LIVE_EMAIL,
  M16: LIVE_EMAIL,
  M18: 'This view is live, not pinned to dates; when a single clinic has reviews waiting, the morning email links that clinic\u2019s view instead.',
  M19: 'The company-pipeline evidence behind this figure; the morning email links the Smile Club impact page instead.',
  M20: EMAIL_PINNED,
  M21: EMAIL_PINNED,
  M22: EMAIL_PINNED,
  M23: NEAREST,
  M24: NEAREST,
  M25: NEAREST,
  M28: 'This is the view the morning email links for this figure, pinned to the sample\u2019s own reported dates; when no sample is readable the link opens the live view instead.',
  M29: EMAIL_PINNED,
  M30: EMAIL_PINNED,
  M31: EMAIL_PINNED,
  M32: EMAIL_PINNED,
  M34: 'This is the view the morning email links for this figure; the email and the panel count the same assignments per reviewer. The view is live, not pinned to dates.',
  M26: 'Revenue by conducting doctor, the view the DN Ortho email uses, pinned to the same dates and clinic.',
  A01: TRACKER_NEAREST,
  A02: TRACKER_NEAREST,
  A03: TRACKER_NEAREST,
  A04: TRACKER_NEAREST,
  A05: TRACKER_NEAREST,
  A06: TRACKER_NEAREST,
  A07: FRONT_OFFICE,
  A08: FRONT_OFFICE,
  A09: FRONT_OFFICE,
  A10: FRONT_OFFICE,
  A11: FRONT_OFFICE,
  A12: 'The Executive view the morning performance email links, pinned to the same dates; its group total also includes Al Maher\u2019s Practo bills.',
  A13: AMC_SHEET,
  A14: AMC_SHEET,
  A15: AMC_SHEET,
  A16: AMC_SHEET,
  A17: AMC_SHEET,
  A18: AMC_SHEET,
  A19: AMC_SHEET,
  A20: AMC_SHEET,
  A21: AMC_SHEET,
  A22: AMC_SHEET,
};

export function ProofDrawer() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [proof, setProof] = useState<ProofPayload | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('[data-proof]') : null;
      if (!target) return;
      const raw = target.getAttribute('data-proof');
      if (!raw) return;
      try {
        const payload = JSON.parse(raw) as ProofPayload;
        if (!METRICS[payload.id]) return;
        setProof(payload);
        dialogRef.current?.showModal();
      } catch {
        /* a malformed payload opens nothing */
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const close = () => dialogRef.current?.close();
  const def = proof ? METRICS[proof.id] : null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="proof-title"
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-[10px] border border-dn-line border-t-4 border-t-dn-navy bg-white p-0 text-dn-ink shadow-[0_9px_26px_#2442600c] backdrop:bg-[#18334866]"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      onClose={() => setProof(null)}
    >
      {def && proof ? (
        <div className="p-6 sm:p-7">
          <div className="mb-3 flex items-start justify-between gap-3">
            <span className="inline-block rounded bg-dn-mint px-2 py-1 text-[10px] font-semibold text-dn-navy">LIVE FIGURE</span>
            <button type="button" className="text-xs font-semibold text-dn-navy underline underline-offset-4" onClick={close}>
              Close
            </button>
          </div>
          <h2 id="proof-title" className="m-0 text-lg font-bold tracking-[-0.3px] text-dn-navy">{def.name}</h2>
          <p className="m-0 text-xs text-[#617075]">{def.id} · Definition version {def.definitionVersion}</p>
          <p className="my-3 text-[34px] font-bold leading-tight tracking-[-1px] text-dn-navy sm:text-[42px]">{proof.value}</p>
          <p className="m-0 text-xs text-[#617075]">{proof.scope}</p>
          <div className="mt-4 rounded-md bg-[#f2f6f2] p-4 text-xs leading-relaxed">
            <strong className="text-dn-navy">What this number means</strong>
            <p className="mb-0 mt-1">{def.definition}</p>
          </div>
          <dl className="my-4 grid grid-cols-[94px_1fr] gap-2 text-xs sm:grid-cols-[125px_1fr]">
            <dt className="text-[#647478]">Dates</dt>
            <dd className="m-0 font-medium text-dn-navy">{/\d/.test(proof.dates) ? `${proof.dates} (Dubai)` : proof.dates}</dd>
            <dt className="text-[#647478]">Clinic scope</dt>
            <dd className="m-0 font-medium text-dn-navy">{proof.scope}</dd>
            <dt className="text-[#647478]">Source</dt>
            <dd className="m-0 font-medium text-dn-navy">{def.source}</dd>
            <dt className="text-[#647478]">Freshness</dt>
            <dd className="m-0 font-medium text-dn-navy">Figures are live at the time you opened this page.</dd>
          </dl>
          {proof.note ? <p className="mb-4 mt-0 text-xs text-[#617075]">{proof.note}</p> : null}
          <a
            className="inline-block rounded-md border border-dn-navy bg-dn-navy px-4 py-2 text-xs font-semibold text-white"
            href={proof.url}
          >
            Open the detail view
          </a>
          {PROOF_FOOTNOTES[proof.id] ? (
            <p className="mb-0 mt-3 text-[11px] text-[#627277]">{PROOF_FOOTNOTES[proof.id]}</p>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
