import { getGmbReviewsReport } from '@/lib/analytics/gmb-reviews';
import { getGmbKeywordsReport } from '@/lib/analytics/gmb-keywords';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { HBarChart, type BarDatum } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';

/**
 * The two Google Business Profile local cards — reviews (reputation) and
 * search keywords (local discovery). Shared verbatim between Digital & SEO
 * and Social & Local: reputation genuinely belongs to both stories, and one
 * component means the numbers can never drift apart between tabs. Each card
 * fetches its own data so a host tab adds one line, not a data dependency.
 */

const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));
const pct1 = (n: number | null | undefined) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line p-4 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

/** Reputation — full review history (not range-filtered: the rating is a
    property of the clinic, not of the week being viewed). */
export async function GoogleReviewsCard({ tag }: { tag: string }) {
  const reviews = await getGmbReviewsReport();
  return (
    <Card>
      <SectionHeader tag={tag} eyebrow="Reputation · Google Business Profile" title="Google reviews" />
      <div className="px-5 pb-5 pt-4">
        {reviews ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Average rating" value={`${reviews.avg.toFixed(2)} ★`} />
              <Stat label="Total reviews" value={int(reviews.total)} />
              <Stat label="5-star share" value={pct1(reviews.fiveStarShare)} />
              <Stat label="Response rate" value={pct1(reviews.responseRate)} />
            </div>
            {reviews.unanswered > 0 ? (
              <p className="mt-3 text-[12px] font-medium text-watch">
                {int(reviews.unanswered)} written review{reviews.unanswered === 1 ? '' : 's'} still without a reply — responses
                are a local-ranking signal, and an unanswered complaint is public.
              </p>
            ) : null}
            {reviews.months.length > 1 ? (
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-ink-faint">Reviews per month (avg rating)</p>
                <HBarChart
                  data={reviews.months.map((m) => ({ label: `${m.month} · ${m.avg.toFixed(1)}★`, value: m.count })) as BarDatum[]}
                  valueFormat="int"
                />
              </div>
            ) : null}
            <div className="mt-4 space-y-2.5">
              {reviews.latest.map((r, i) => (
                <div key={i} className="rounded-card border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium text-ink">
                      {r.reviewer ?? 'Anonymous'}
                      <span className="ml-2 text-watch">{'★'.repeat(r.rating)}</span>
                    </p>
                    <p className="text-[10.5px] text-ink-faint">
                      {r.createdAt.slice(0, 10)}
                      {r.replied ? ' · replied' : r.comment ? ' · no reply yet' : ''}
                    </p>
                  </div>
                  {r.comment ? <p className="mt-1 text-[12px] leading-snug text-ink-soft">{r.comment}</p> : null}
                </div>
              ))}
            </div>
            <Takeaway>
              Every Google review on the profile, synced hourly — reviewer, rating, text and whether the clinic replied.
              The calls / directions / map-view counts from the same profile live on the ⭐ Growth Platform under GMB.
            </Takeaway>
          </>
        ) : (
          <DataGapInline
            detail="no reviews synced yet — the hourly sync fills this automatically (needs the Google My Business API enabled in the same Google Cloud project)"
            owner={ownerFor('channel')}
          />
        )}
      </div>
    </Card>
  );
}

/** Local discovery — the terms people typed into Google Search/Maps when the
    profile appeared. Latest closed month (Google revises the current one);
    counts under Google's privacy threshold render as a ceiling. */
export async function LocalSearchCard({ tag }: { tag: string }) {
  const localKw = await getGmbKeywordsReport();
  return (
    <Card>
      <SectionHeader tag={tag} eyebrow="Local search · Google Business Profile" title="What people searched to find the profile" />
      <div className="px-5 pb-5 pt-4">
        {localKw ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Month" value={localKw.month} />
              <Stat label="Distinct search terms" value={int(localKw.totalKeywords)} />
              <Stat label="Profile impressions" value={int(localKw.totalImpressions)} />
            </div>
            <div className="mt-4">
              <HBarChart
                data={localKw.top.map((k) => ({
                  label: k.isThreshold ? `${k.keyword} (<${k.impressions})` : k.keyword,
                  value: k.impressions,
                })) as BarDatum[]}
                valueFormat="int"
              />
            </div>
            <Takeaway>
              The terms people typed into Google Search or Maps when the Business Profile appeared — the local-search
              mirror of the website&apos;s Search Console queries. Terms marked <strong>&lt;N</strong> are below
              Google&apos;s privacy threshold: the profile appeared for them, but Google reports a ceiling instead of an
              exact count. Branded terms confirm reputation; non-branded terms (&quot;dentist near me&quot;, treatment
              names) are the growth signal to watch.
            </Takeaway>
          </>
        ) : (
          <DataGapInline
            detail="no keyword data synced yet — fills automatically after the next hourly sync (needs a closed month of Business Profile data)"
            owner={ownerFor('channel')}
          />
        )}
      </div>
    </Card>
  );
}
