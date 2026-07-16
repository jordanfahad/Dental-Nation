'use client';

import { useMemo, useState } from 'react';
import type { SocialPost } from '@/lib/social/report';
import { Card, SectionHeader } from '@/components/ui/Card';

const int = (v: number) => Math.round(v).toLocaleString('en-US');
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const short = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(Math.round(v)));

function dayLabel(iso: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'Asia/Dubai' });
  } catch {
    return iso.slice(0, 10);
  }
}

function typeBadge(p: SocialPost) {
  const t = (p.mediaType ?? '').toUpperCase();
  if (p.isStory) return 'Story';
  if (t.includes('REEL')) return 'Reel';
  if (t.includes('CAROUSEL')) return 'Carousel';
  if (t.includes('VIDEO')) return 'Video';
  return 'Post';
}

const SORTS = [
  { key: 'recent', label: 'Most recent' },
  { key: 'reach', label: 'Top reach' },
  { key: 'engagement', label: 'Top engagement' },
  { key: 'rate', label: 'Best eng. rate' },
] as const;
type SortKey = (typeof SORTS)[number]['key'];

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[13px] font-semibold tabular-nums text-ink">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  );
}

function Thumb({ p }: { p: SocialPost }) {
  const badge = typeBadge(p);
  return (
    <a
      href={p.permalink ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block aspect-square w-full overflow-hidden rounded-lg bg-panel-2"
      title={p.caption ?? badge}
    >
      {p.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.thumbnailUrl}
          alt={badge}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl text-ink-faint">
          {p.isStory ? '🟣' : '🖼️'}
        </div>
      )}
      <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">
        {badge}
      </span>
    </a>
  );
}

function PostCard({ p }: { p: SocialPost }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-3">
      <Thumb p={p} />
      <div className="min-h-[32px] text-[11.5px] leading-snug text-ink-soft line-clamp-2">
        {p.caption || <span className="text-ink-faint">No caption</span>}
      </div>
      <div className="flex items-center justify-between text-[10px] text-ink-faint">
        <span>{dayLabel(p.postedAt)}</span>
        <span className="rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent">{pct(p.engagementRate)} eng.</span>
      </div>
      <div className="grid grid-cols-3 gap-y-2">
        <Metric label="Reach" value={short(p.reach)} />
        <Metric label="Likes" value={short(p.likes)} />
        <Metric label="Comments" value={short(p.comments)} />
        <Metric label="Saves" value={short(p.saves)} />
        <Metric label="Shares" value={short(p.shares)} />
        <Metric label={p.videoViews > 0 ? 'Views' : 'Eng.'} value={short(p.videoViews > 0 ? p.videoViews : p.engagement)} />
      </div>
    </div>
  );
}

function StoryCard({ p }: { p: SocialPost }) {
  const completion = p.reach > 0 ? Math.max(0, 1 - p.exits / p.reach) : 0;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-3">
      <Thumb p={p} />
      <div className="flex items-center justify-between text-[10px] text-ink-faint">
        <span>{dayLabel(p.postedAt)}</span>
        <span className="rounded-full bg-good/10 px-2 py-0.5 font-medium text-good">{pct(completion)} kept</span>
      </div>
      <div className="grid grid-cols-3 gap-y-2">
        <Metric label="Reach" value={short(p.reach)} />
        <Metric label="Replies" value={short(p.replies)} />
        <Metric label="Exits" value={short(p.exits)} />
        <Metric label="Fwd taps" value={short(p.tapsForward)} />
        <Metric label="Back taps" value={short(p.tapsBack)} />
        <Metric label="Eng." value={short(p.engagement)} />
      </div>
    </div>
  );
}

export function PostPerformance({ posts, stories }: { posts: SocialPost[]; stories: SocialPost[] }) {
  const [sort, setSort] = useState<SortKey>('recent');
  const [showStories, setShowStories] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...posts];
    if (sort === 'reach') arr.sort((a, b) => b.reach - a.reach);
    else if (sort === 'engagement') arr.sort((a, b) => b.engagement - a.engagement);
    else if (sort === 'rate') arr.sort((a, b) => b.engagementRate - a.engagementRate);
    else arr.sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? ''));
    return arr;
  }, [posts, sort]);

  if (posts.length === 0 && stories.length === 0) return null;

  // Averages for the summary strip (posts only).
  const avgReach = posts.length ? posts.reduce((s, p) => s + p.reach, 0) / posts.length : 0;
  const avgRate = posts.length ? posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length : 0;
  const best = sorted.length ? [...posts].sort((a, b) => b.engagement - a.engagement)[0] : null;

  return (
    <Card>
      <SectionHeader
        eyebrow="Instagram · content"
        title="Individual post & story performance"
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowStories(false)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                !showStories ? 'bg-accent text-white' : 'bg-panel-2 text-ink-soft hover:text-ink'
              }`}
            >
              Posts · {posts.length}
            </button>
            <button
              onClick={() => setShowStories(true)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                showStories ? 'bg-accent text-white' : 'bg-panel-2 text-ink-soft hover:text-ink'
              }`}
            >
              Stories · {stories.length}
            </button>
          </div>
        }
      />
      <div className="px-5 pb-5 pt-4">
        {!showStories ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-[15px] font-semibold text-ink">{int(avgReach)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-ink-faint">Avg reach / post</p>
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-ink">{pct(avgRate)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-ink-faint">Avg eng. rate</p>
                </div>
                {best ? (
                  <div className="max-w-[220px]">
                    <p className="truncate text-[13px] font-semibold text-ink">🏆 {best.caption?.slice(0, 32) || typeBadge(best)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-ink-faint">Top post · {int(best.engagement)} eng.</p>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1">
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSort(s.key)}
                    className={`rounded-md px-2 py-1 text-[10.5px] font-medium transition-colors ${
                      sort === s.key ? 'bg-ink text-panel' : 'bg-panel-2 text-ink-soft hover:text-ink'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {sorted.map((p) => (
                <PostCard key={p.mediaId} p={p} />
              ))}
            </div>
          </>
        ) : stories.length > 0 ? (
          <>
            <p className="mb-3 text-[11.5px] text-ink-soft">
              Only stories from the last 24&nbsp;hours are retrievable from Meta — older stories expire and can&apos;t be pulled
              historically. &ldquo;Kept&rdquo; = share of reach that did not exit.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {stories.map((p) => (
                <StoryCard key={p.mediaId} p={p} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-[12.5px] text-ink-soft">
            No active stories right now. Stories appear here for the 24&nbsp;hours they are live; the daily sync captures whatever is
            active when it runs.
          </p>
        )}
      </div>
    </Card>
  );
}
