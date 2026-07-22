'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveCommentary } from './commentary-actions';

/**
 * An editable prose block for the Board Report. The saved text prints into the
 * PDF; the edit affordances are no-print. The board report is admin-only, so any
 * viewer here may edit. Text is stored privately (app_secrets), never in source.
 */
export function CommentaryBlock({ slug, body, placeholder }: { slug: string; body: string; placeholder?: string }) {
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

  const paras = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  if (editing) {
    return (
      <div className="no-print">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          placeholder={placeholder}
          className="w-full rounded-md border border-line bg-card px-3 py-2 text-[13px] leading-relaxed text-ink"
        />
        <div className="mt-2 flex items-center gap-2">
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
          <span className="text-[11px] text-ink-faint">Blank line = new paragraph. Private — not in the codebase.</span>
        </div>
        {error ? <p className="mt-1 text-[12px] text-stop">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="group relative">
      {paras.length ? (
        <div className="space-y-2 text-[13.5px] leading-relaxed text-ink">
          {paras.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : (
        <p className="no-print text-[13px] italic text-ink-faint">{placeholder ?? 'No commentary yet — click Edit to add.'}</p>
      )}
      <button
        onClick={() => {
          setDraft(body);
          setEditing(true);
        }}
        className="no-print mt-2 text-[12px] font-medium text-accent hover:underline"
      >
        {paras.length ? 'Edit commentary' : 'Add commentary'}
      </button>
    </div>
  );
}
