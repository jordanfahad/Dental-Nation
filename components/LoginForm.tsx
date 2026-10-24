'use client';

import { useActionState, useEffect, useState } from 'react';
import { login } from '@/app/login/actions';

export function LoginForm({ from }: { from: string }) {
  const [state, formAction, pending] = useActionState(login, undefined);
  // The browser never sends a link's #anchor to the server, so `from` lacks it;
  // the browser keeps it across the redirect to this page. Keep a plain anchor
  // (e.g. #corp-pipeline) so the reader lands where the link pointed.
  const [hash, setHash] = useState('');
  useEffect(() => {
    const h = window.location.hash;
    if (/^#[\w-]+$/.test(h)) setHash(h);
  }, []);

  return (
    <form action={formAction} className="w-full max-w-sm">
      <div className="card p-6">
        <p className="eyebrow text-accent">Dental Nation</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">Performance Reports</h1>
        <p className="mt-1 text-[13px] text-ink-faint">
          Team sign-in. If you were given a report link, open that link directly — no password is needed.
        </p>

        <input type="hidden" name="from" value={from.includes('#') ? from : from + hash} />
        <label className="mt-5 block text-[12px] font-medium text-ink-soft" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2 text-[14px] text-ink focus:border-accent focus:outline-none"
        />

        {state?.error ? <p className="mt-2 text-[12.5px] text-stop">{state.error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full rounded-md bg-accent px-3 py-2 text-[14px] font-medium text-white transition hover:bg-accent-600 disabled:opacity-60"
        >
          {pending ? 'Checking…' : 'Enter'}
        </button>
      </div>
    </form>
  );
}
