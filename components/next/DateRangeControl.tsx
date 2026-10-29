/**
 * Date control of the /next leadership pages. Server component with no
 * JavaScript: the presets are plain links and the From / To pair is a GET
 * form, so the page simply reloads with ?preset= or ?from=&to=. `keep`
 * carries the page's other params (the Overview's clinic lens) through both.
 * The range rules (default, caps, fallbacks) live in lib/overview/range.ts.
 */
import { addDaysIso } from '@/lib/alerts/links';
import {
  RANGE_PRESETS, activePreset, hrefWith, rangeHeading, type ViewRange,
} from '@/lib/overview/range';

const chip = 'rounded-md border px-2.5 py-1.5 text-xs no-underline';
const chipOff = 'border-dn-line bg-white text-dn-navy';
const chipOn = 'border-dn-navy bg-dn-navy font-semibold text-white';
const dateInput = 'rounded-md border border-dn-line bg-white px-2 py-1 text-xs text-dn-navy';

export function DateRangeControl({
  range, path, keep = {},
}: {
  range: ViewRange;
  /** The page's own path, e.g. "/next/channels". */
  path: string;
  /** Other params to keep (empty values are dropped). */
  keep?: Record<string, string | undefined>;
}) {
  const active = activePreset(range);
  const latest = addDaysIso(range.today, -1);
  return (
    <>
      <span className="rounded-md border border-dn-line bg-white px-2.5 py-1.5 text-xs text-dn-navy">{rangeHeading(range)}</span>
      <span className="flex flex-wrap gap-1.5" role="group" aria-label="Date range">
        {RANGE_PRESETS.map((p) => (
          <a
            key={p.key}
            href={hrefWith(path, { ...keep, preset: p.key })}
            aria-current={p.key === active ? 'true' : undefined}
            className={`${chip} ${p.key === active ? chipOn : chipOff}`}
          >
            {p.label}
          </a>
        ))}
      </span>
      <form method="get" action={path} className="flex flex-wrap items-center gap-1.5" aria-label="Custom dates">
        {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        <label className="flex items-center gap-1 text-xs text-[#617075]">
          From
          <input type="date" name="from" defaultValue={range.from} max={latest} required className={dateInput} aria-label="From date" />
        </label>
        <label className="flex items-center gap-1 text-xs text-[#617075]">
          To
          <input type="date" name="to" defaultValue={range.to} max={latest} required className={dateInput} aria-label="To date" />
        </label>
        <button type="submit" className={`${chip} ${chipOn} cursor-pointer`}>
          Apply
        </button>
      </form>
    </>
  );
}
