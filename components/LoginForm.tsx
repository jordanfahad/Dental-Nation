'use client';

import { useActionState } from 'react';
import { login } from '@/app/login/actions';

export function LoginForm({ from }: { from: string }) {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="w-full max-w-sm">
      <div className="card p-6">
        <p className="eyebrow text-accent">Dental Nation · Paid Acquisition</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">Daily Control Report</h1>
        <p className="mt-1 text-[13px] text-ink-faint">Enter the password to continue.</p>

        <input type="hidden" name="from" value={from} />
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
