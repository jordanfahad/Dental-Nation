/**
 * Prominent link to the Year-1 Marketing Plan (DN × wearefast.io) deliverable —
 * the live HTML report + the source Excel. Shown on the Growth Projects overview.
 */
export function Y1PlanBanner() {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-hairline bg-[linear-gradient(135deg,#15233C,#22345a)] text-white shadow-sm">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9FB0C9]">
            Deliverable · Year-1 Plan
          </div>
          <h3 className="mt-1 text-xl font-extrabold leading-tight">
            Year-1 Marketing Plan — Dental Nation × wearefast.io
          </h3>
          <p className="mt-1 max-w-xl text-sm text-[#C7D3E6]">
            Spend capacity <b className="text-white">AED 5.32M</b> · the{" "}
            <b className="text-white">AED 4.34M</b> creative-unlock case · 12-month envelope, the
            5-lane engine, live actuals and governance.
          </p>
          <div className="mt-2.5 text-[11.5px] text-[#9FB0C9]">
            Prepared for Faisal, Founder · wearefast.io — by Dental Nation Growth · July 2026
          </div>
        </div>
        <div className="flex flex-none flex-wrap gap-2">
          <a
            href="/reports/DentalNation_Y1_Plan_Actuals.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-white/90"
          >
            Open report →
          </a>
          <a
            href="/reports/DentalNation_x_wearefast_Y1_Plan_v5_ACTUALS.xlsx"
            download
            className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            ⬇ Excel (14 tabs)
          </a>
        </div>
      </div>
    </section>
  );
}
