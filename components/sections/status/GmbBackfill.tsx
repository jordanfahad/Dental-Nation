'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, SectionHeader } from '@/components/ui/Card';

export function GmbBackfill() {
  const [from, setFrom] = useState('2026-01-01');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  return (
    <Card>
      <SectionHeader eyebrow="Admin · data sync" title="Backfill Business Profile" />
      <form className="space-y-3 px-5 pb-5 pt-4" onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setMessage('Backfill running for the configured branches…');
        try {
          const response = await fetch('/api/gmb/probe', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from }),
          });
          const result = await response.json();
          const details = [result.performance, result.reviews, result.keywords];
          if (result.error) setMessage(result.error);
          else setMessage(`${result.ok ? 'Complete' : 'Partially completed'}: ${result.performance.stored} daily metrics, ${result.reviews.stored} reviews, ${result.keywords.stored} keyword rows stored. ${details.flatMap((r) => r?.error ? [r.error] : []).join('; ')}`);
          router.refresh();
        } catch {
          setMessage('The request did not finish. Retry from the same date; existing rows update in place.');
        } finally { setPending(false); }
      }}>
        <p className="text-[12px] text-ink-soft">Fetch available daily history for every connected branch, refresh reviews, and load up to 12 months of search keywords. This can take a few minutes.</p>
        <label className="block text-[12px] text-ink-soft" htmlFor="gmb-backfill-from">Start date</label>
        <input id="gmb-backfill-from" type="date" value={from} required max={new Date().toISOString().slice(0, 10)}
          disabled={pending} onChange={(e) => setFrom(e.target.value)} className="rounded border border-line bg-card px-3 py-2 text-sm" />
        <button type="submit" disabled={pending} className="ml-3 rounded bg-accent px-3 py-2 text-sm text-white disabled:opacity-60">
          {pending ? 'Backfilling…' : `Backfill Business Profile from ${from}`}
        </button>
        <p role="status" aria-live="polite" className="text-[12px] text-ink-soft">{message}</p>
      </form>
    </Card>
  );
}
