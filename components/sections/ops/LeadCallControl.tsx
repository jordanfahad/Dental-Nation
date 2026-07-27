'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logLeadCall } from './lead-call-actions';
import type { CallOutcome, LeadCall } from '@/lib/ops/unverifiedLeads';

export const CALL_OUTCOME_LABEL: Record<CallOutcome, string> = {
  booked: 'Booked',
  callback: 'Call back',
  noanswer: 'No answer',
  notinterested: 'Not interested',
  wrongnumber: 'Wrong number',
};

const CHIP: Record<CallOutcome, string> = {
  booked: 'bg-good/10 text-good',
  callback: 'bg-accent/10 text-accent',
  noanswer: 'bg-watch/10 text-watch',
  notinterested: 'bg-panel-2 text-ink-soft',
  wrongnumber: 'bg-panel-2 text-ink-soft',
};

const ORDER: CallOutcome[] = ['booked', 'callback', 'noanswer', 'notinterested', 'wrongnumber'];

function when(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'Asia/Dubai' });
}

/**
 * Per-lead call dispositioning for the unverified-enquiry worklist. Shows the
 * last logged outcome (with who and when) and lets reception log another
 * attempt. Every attempt is kept, so the history is visible as a count.
 */
export function LeadCallControl({ leadRef, call }: { leadRef: string; call: LeadCall | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<CallOutcome>('noanswer');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await logLeadCall(leadRef, outcome, note);
      if (res.ok) {
        setOpen(false);
        setNote('');
        router.refresh();
      } else {
        setError(res.error ?? 'Could not save.');
      }
    });
  };

  if (open) {
    return (
      <div className="min-w-[190px]">
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as CallOutcome)}
          className="w-full rounded border border-line bg-card px-1.5 py-1 text-[11.5px] text-ink"
        >
          {ORDER.map((o) => (
            <option key={o} value={o}>
              {CALL_OUTCOME_LABEL[o]}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="Note (optional)"
          className="mt-1 w-full rounded border border-line bg-card px-1.5 py-1 text-[11.5px] text-ink"
        />
        <div className="mt-1 flex items-center gap-1.5">
          <button
            onClick={save}
            disabled={pending}
            className="rounded bg-accent px-2 py-1 text-[11.5px] font-medium text-white transition hover:bg-accent-600 disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setNote('');
              setError(null);
            }}
            className="rounded border border-line px-2 py-1 text-[11.5px] text-ink-soft transition hover:text-ink"
          >
            Cancel
          </button>
        </div>
        {error ? <p className="mt-1 text-[11px] leading-snug text-stop">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="min-w-[150px]">
      {call ? (
        <>
          <span className={`inline-block rounded px-1.5 py-0.5 text-[10.5px] font-medium ${CHIP[call.outcome]}`}>
            {CALL_OUTCOME_LABEL[call.outcome]}
          </span>
          <span className="mt-0.5 block text-[10.5px] text-ink-faint">
            {[call.by, when(call.atIso)].filter(Boolean).join(' · ')}
            {call.attempts > 1 ? ` · ${call.attempts} attempts` : ''}
          </span>
          {call.note ? (
            <span className="block max-w-[190px] truncate text-[10.5px] text-ink-faint" title={call.note}>
              “{call.note}”
            </span>
          ) : null}
        </>
      ) : (
        <span className="block text-[10.5px] text-ink-faint">Not called yet</span>
      )}
      <button onClick={() => setOpen(true)} className="mt-1 text-[11px] font-medium text-accent hover:underline">
        {call ? 'Log another call' : 'Log a call'}
      </button>
    </div>
  );
}
