import { Card, SectionHeader } from '@/components/ui/Card';
import { HBarChart, type BarDatum } from '@/components/charts/Charts';

/**
 * Dental Nation vs Dr Tosun comparison card — a small bar chart of the headline
 * metric plus optional detail columns per clinic. Reused on the Executive, CRM
 * and Practo tabs so the CEO always gets a side-by-side clinic view (even while
 * the tab itself is filtered to one clinic).
 */
export interface ClinicColumn {
  label: string;
  value: string;
  sub?: string;
}

export function ClinicCompare({
  tag,
  eyebrow,
  title,
  bars,
  barFormat = 'int',
  columns,
  note,
}: {
  tag?: string;
  eyebrow: string;
  title: string;
  bars: BarDatum[];
  barFormat?: 'int' | 'aed';
  columns?: ClinicColumn[];
  note?: string;
}) {
  return (
    <Card>
      <SectionHeader tag={tag} eyebrow={eyebrow} title={title} />
      <div className="px-5 pb-5 pt-4">
        <HBarChart data={bars} valueFormat={barFormat} />
        {columns && columns.length ? (
          <div
            className="mt-4 grid gap-3"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0,1fr))` }}
          >
            {columns.map((c) => (
              <div key={c.label} className="rounded-card border border-line p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{c.label}</p>
                <p className="tnum mt-1 text-[22px] font-semibold tracking-tight text-ink">{c.value}</p>
                {c.sub ? <p className="mt-0.5 text-[12px] text-ink-faint">{c.sub}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
        {note ? <p className="mt-3 text-[11.5px] leading-snug text-ink-faint">{note}</p> : null}
      </div>
    </Card>
  );
}
