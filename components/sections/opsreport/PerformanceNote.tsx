'use client';

import { useActionState } from 'react';
import { savePerformanceNote } from '@/app/(app)/performance-actions';

export function PerformanceNote({ body }: { body: string }) {
  const [state, action, pending] = useActionState(savePerformanceNote, { message: '' });
  return <form action={action} className="space-y-2">
    <label htmlFor="performance-note" className="block text-sm font-medium">Plan of action for Mr Akbar&apos;s daily performance brief</label>
    <p id="performance-note-help" className="text-xs text-ink-soft">Shown verbatim in the next brief. Use business priorities only; no patient details. Leave blank to show &quot;Plan of action: to be updated&quot;.</p>
    <textarea id="performance-note" name="body" defaultValue={body} maxLength={6000} rows={5} aria-describedby="performance-note-help" className="w-full rounded border border-line bg-card p-3 text-sm" />
    <button type="submit" disabled={pending} className="rounded bg-accent px-4 py-2 text-sm text-white disabled:opacity-50">{pending ? 'Saving…' : 'Save action note'}</button>
    <p role="status" aria-live="polite" className="text-sm text-ink-soft">{state.message}</p>
  </form>;
}
