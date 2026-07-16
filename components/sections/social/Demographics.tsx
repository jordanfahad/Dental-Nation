import type { SocialDemographics, DemographicDimension } from '@/lib/social/report';
import { Card, SectionHeader } from '@/components/ui/Card';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const int = (v: number) => Math.round(v).toLocaleString('en-US');

// A calm, distinct hue per dimension so the four blocks read as separate lenses.
const DIM_COLOR: Record<string, string> = {
  gender: '#3B82A6',
  age: '#2C5E86',
  country: '#57A0BE',
  city: '#7CBBD1',
};

function Bar({ label, share, value, color }: { label: string; share: number; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 truncate text-[11.5px] text-ink-soft" title={label}>
        {label}
      </span>
      <div className="h-4 flex-1 overflow-hidden rounded bg-panel-2">
        <div
          className="flex h-full items-center rounded"
          style={{ width: `${Math.max(share * 100, 2)}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-ink">
        {pct(share)} <span className="text-ink-faint">· {int(value)}</span>
      </span>
    </div>
  );
}

function DimensionBlock({ dim }: { dim: DemographicDimension }) {
  const color = DIM_COLOR[dim.dimension] ?? '#3B82A6';
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{dim.label}</p>
      <div className="space-y-2">
        {dim.buckets.map((b) => (
          <Bar key={b.bucket} label={b.bucket} share={b.share} value={b.value} color={color} />
        ))}
      </div>
    </div>
  );
}

export function Demographics({ demo }: { demo: SocialDemographics | null }) {
  if (!demo || demo.dimensions.length === 0) return null;
  return (
    <Card>
      <SectionHeader
        eyebrow="Instagram · audience"
        title="Who follows Dental Nation"
        right={demo.asOf ? <span className="text-[11px] text-ink-faint">as of {demo.asOf}</span> : null}
      />
      <div className="px-5 pb-5 pt-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {demo.dimensions.map((d) => (
            <DimensionBlock key={d.dimension} dim={d} />
          ))}
        </div>
        <p className="mt-3 text-[11.5px] leading-snug text-ink-soft">
          Follower demographics from Meta — a snapshot of the audience the clinic reaches organically. Age &amp; gender guide
          creative tone; top cities/countries confirm you&apos;re reaching the local UAE market vs. diaspora.
        </p>
      </div>
    </Card>
  );
}
