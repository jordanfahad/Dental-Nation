'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveCommentary } from './commentary-actions';
import {
  parseTimeline,
  parseWorkstreams,
  tallyWorkstreams,
  type TimelineKind,
  type WorkStatus,
} from '@/lib/report/boardVisuals';

/**
 * The at-a-glance layer above the written commentary: a dated timeline of the
 * period, and a status board of where each workstream stands.
 *
 * Built from divs and borders only — no charting library and no SVG — because
 * this prints into the board PDF, and anything canvas-based drops out. Status is
 * carried by an explicit word AND a colour, never colour alone.
 *
 * Editing reuses the same admin-only saveCommentary action and the same plain
 * textarea as the prose blocks, so there's one way to edit the report.
 */

const KIND: Record<TimelineKind, { dot: string; label: string }> = {
  milestone: { dot: 'bg-accent', label: 'Milestone' },
  issue: { dot: 'bg-stop', label: 'Issue' },
  fix: { dot: 'bg-good', label: 'Resolved' },
  pending: { dot: 'bg-watch', label: 'Pending' },
};

const STATUS: Record<WorkStatus, { chip: string; bar: string; label: string }> = {
  done: { chip: 'bg-good/10 text-good', bar: 'bg-good', label: 'Done' },
  progress: { chip: 'bg-accent/10 text-accent', bar: 'bg-accent', label: 'In progress' },
  blocked: { chip: 'bg-stop/10 text-stop', bar: 'bg-stop', label: 'Blocked' },
  pending: { chip: 'bg-watch/10 text-watch', bar: 'bg-watch', label: 'Not started' },
};

const ORDER: WorkStatus[] = ['blocked', 'progress', 'done', 'pending'];

export function BoardVisualBlock({
  slug,
  body,
  variant,
  placeholder,
}: {
  slug: string;
  body: string;
  variant: 'timeline' | 'status';
  placeholder?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveCommentary(slug, draft);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error ?? 'Could not save.');
      }
    });
  };

  if (editing) {
    return (
      <div className="no-print">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={10}
          placeholder={placeholder}
          className="w-full rounded-md border border-line bg-card px-3 py-2 font-mono text-[12px] leading-relaxed text-ink"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            onClick={save}
            disabled={pending}
            className="rounded-md bg-accent px-3.5 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-accent-600 disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => {
              setDraft(body);
              setEditing(false);
              setError(null);
            }}
            className="rounded-md border border-line px-3.5 py-1.5 text-[12.5px] text-ink-soft transition hover:text-ink"
          >
            Cancel
          </button>
          <span className="text-[11px] text-ink-faint">
            {variant === 'timeline'
              ? 'One per line:  date | milestone/issue/fix/pending | what happened'
              : 'One per line:  done/progress/blocked/pending | workstream | note'}
          </span>
        </div>
        {error ? <p className="mt-1 text-[12px] text-stop">{error}</p> : null}
      </div>
    );
  }

  const edit = (
    <button
      onClick={() => {
        setDraft(body);
        setEditing(true);
      }}
      className="no-print mt-2 text-[12px] font-medium text-accent hover:underline"
    >
      {body.trim() ? 'Edit' : 'Add'}
    </button>
  );

  if (variant === 'timeline') {
    const items = parseTimeline(body);
    if (!items.length)
      return (
        <div>
          <p className="no-print text-[13px] italic text-ink-faint">{placeholder ?? 'No timeline yet.'}</p>
          {edit}
        </div>
      );
    return (
      <div>
        <ol className="relative ms-1 border-s border-line ps-5">
          {items.map((i, n) => (
            <li key={n} className="relative pb-4 last:pb-0">
              <span
                className={`absolute -start-[25px] top-[5px] h-2.5 w-2.5 rounded-full ring-2 ring-card ${KIND[i.kind].dot}`}
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[12px] font-semibold tabular-nums text-ink">{i.date}</span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">{KIND[i.kind].label}</span>
              </div>
              <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">{i.label}</p>
            </li>
          ))}
        </ol>
        {edit}
      </div>
    );
  }

  const items = parseWorkstreams(body);
  if (!items.length)
    return (
      <div>
        <p className="no-print text-[13px] italic text-ink-faint">{placeholder ?? 'No workstreams yet.'}</p>
        {edit}
      </div>
    );

  const tally = tallyWorkstreams(items);
  const sorted = [...items].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {ORDER.filter((s) => tally[s] > 0).map((s) => (
          <span key={s} className={`rounded px-2 py-1 text-[11px] font-medium ${STATUS[s].chip}`}>
            {tally[s]} {STATUS[s].label.toLowerCase()}
          </span>
        ))}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {sorted.map((i, n) => (
          <div key={n} className="flex overflow-hidden rounded-card border border-line bg-panel/30">
            <span className={`w-1 shrink-0 ${STATUS[i.status].bar}`} aria-hidden />
            <div className="min-w-0 flex-1 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[13px] font-semibold text-ink">{i.name}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS[i.status].chip}`}>
                  {STATUS[i.status].label}
                </span>
              </div>
              {i.note ? <p className="mt-1 text-[12px] leading-snug text-ink-soft">{i.note}</p> : null}
            </div>
          </div>
        ))}
      </div>
      {edit}
    </div>
  );
}
