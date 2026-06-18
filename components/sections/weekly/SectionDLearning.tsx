import type { RangeReport } from '@/lib/types';
import type { WeeklyModel } from './prepare';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';
import { biggestLeakage } from '@/lib/metrics/funnel';

/**
 * §D — Weekly Learning. The spec's question list, each answered with a derived
 * answer where the data supports one, else an explicit, owned data gap.
 */
export function SectionDLearning({
  report,
  model,
}: {
  report: RangeReport;
  model: WeeklyModel;
}) {
  const { content, ga4 } = report;

  const gap = (detail: string, area: string) => (
    <DataGapInline detail={detail} owner={ownerFor(area)} />
  );

  // Missing content — derived from objective coverage in the content source.
  const objectives = new Set(content.map((c) => c.objective).filter(Boolean) as string[]);
  const wanted: { key: string; label: string }[] = [
    { key: 'awareness', label: 'awareness' },
    { key: 'proof', label: 'proof / testimonial' },
    { key: 'conversion', label: 'conversion / offer' },
    { key: 'retargeting', label: 'retargeting / objection-handling' },
  ];
  const missingObjectives = wanted.filter((w) => !objectives.has(w.key)).map((w) => w.label);

  // Website / landing issue — derived from the GA4 on-site booking-funnel drop.
  const ga4Leak =
    ga4 && ga4.onsite_funnel.length > 1
      ? biggestLeakage(
          ga4.onsite_funnel.map((s) => ({
            key: s.key,
            label: s.label,
            today: s.count,
            yesterday: null,
            total: null,
            conversionFromPrev: s.conversionFromPrev,
          })),
        )
      : null;

  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: 'Which audience responded best?',
      a: gap('no per-audience response metric sourced', 'creative'),
    },
    {
      q: 'Which message / angle converted best?',
      a: gap('no per-message conversion metric sourced', 'creative'),
    },
    {
      q: 'Which channel produced quality, not just volume?',
      a: model.qualityChannel ? (
        <span className="text-ink">
          <span className="font-medium text-good">{model.qualityChannel}</span> — lowest cost per
          qualified inquiry among channels with real volume
        </span>
      ) : (
        gap('no channel had enough judgeable volume', 'channel')
      ),
    },
    {
      q: 'Which creative should we scale?',
      a: gap('no per-creative performance metric in the content source', 'creative'),
    },
    {
      q: 'Which creative should we stop?',
      a: gap('no per-creative performance metric in the content source', 'creative'),
    },
    {
      q: 'What objection keeps repeating?',
      a: gap('no PAC objection feedback source', 'pac'),
    },
    {
      q: 'What content is missing?',
      a:
        missingObjectives.length > 0 ? (
          <span className="text-ink">
            Content mix is missing{' '}
            <span className="font-medium">{missingObjectives.join(', ')}</span> assets
            <span className="text-ink-faint"> · owner: {ownerFor('content')}</span>
          </span>
        ) : content.length === 0 ? (
          gap('no content source rows this week', 'content')
        ) : (
          <span className="text-good">All four content objectives are represented.</span>
        ),
    },
    {
      q: 'Biggest PAC / booking issue?',
      a: gap('no PAC / booking-feedback source', 'pac'),
    },
    {
      q: 'Biggest website / landing issue?',
      a: ga4Leak ? (
        <span className="text-ink">
          On-site funnel drops most at{' '}
          <span className="font-medium">
            {ga4Leak.from} → {ga4Leak.to}
          </span>{' '}
          ({Math.round(ga4Leak.drop * 100)}% drop)
          <span className="text-ink-faint"> · owner: {ownerFor('channel')}</span>
        </span>
      ) : (
        gap('GA4 on-site funnel unavailable', 'tracking')
      ),
    },
    {
      q: 'Biggest tracking issue?',
      a:
        model.totals.unattributed != null && model.totals.unattributed > 0 ? (
          <span className="text-ink">
            {Math.round(model.totals.unattributed)} unattributed inquiries this week + missing
            channel / UTM identifiers
            <span className="text-ink-faint"> · owner: {ownerFor('attribution')}</span>
          </span>
        ) : (
          gap('attribution coverage not sourced', 'attribution')
        ),
    },
  ];

  return (
    <Card>
      <SectionHeader tag="D" eyebrow="Weekly review" title="Weekly learning" />
      <div className="px-5 pb-5 pt-4">
        <dl className="space-y-3">
          {items.map((it) => (
            <div key={it.q} className="border-b border-line/60 pb-3 last:border-0 last:pb-0">
              <dt className="text-[12.5px] font-medium text-ink-faint">{it.q}</dt>
              <dd className="mt-1 text-[13px] leading-snug text-ink">{it.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}
