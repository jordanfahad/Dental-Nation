import { FlowChart } from "./FlowChart";
import type { Flowchart } from "@/lib/impact/types";

/** Operating-architecture + roadmap flowcharts. Seeded, and (re)generated from
 *  uploaded reports through the review gate. */
export function FlowchartsSection({ flowcharts }: { flowcharts: Flowchart[] }) {
  if (!flowcharts.length) return null;
  return (
    <section className="print-break">
      <div className="mb-4">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-dn-soft">How it works</div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-dn-navy">Operating architecture &amp; roadmaps</h2>
      </div>
      <div className="space-y-4">
        {flowcharts.map((f) => (
          <div
            key={f.id}
            className="rounded-2xl border border-dn-line bg-white p-5 shadow-[0_10px_30px_rgba(36,66,96,.06)] print-avoid-break"
          >
            <h3 className="text-base font-semibold text-dn-navy">{f.title}</h3>
            {f.subtitle && <p className="mt-1 text-sm text-dn-ink/65">{f.subtitle}</p>}
            <div className="mt-6">
              <FlowChart spec={f.spec} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
