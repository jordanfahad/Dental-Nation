'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { CLINICS, type ClinicFilterKey } from '@/config/clinics';

/**
 * Clinic selector — All clinics / Dental Nation / Dr Tosun. Sets `?clinic=` while
 * preserving the other params (date range etc.), staying on `basePath`. Shown on
 * the clinic-aware tabs (Executive / CRM / Practo). Acquisition tabs are shared
 * across both clinics, so they don't render this.
 */
const OPTS: { key: ClinicFilterKey; label: string }[] = [
  { key: 'all', label: 'All clinics' },
  ...CLINICS.map((c) => ({ key: c.key as ClinicFilterKey, label: c.label })),
];

export function ClinicFilter({ active, basePath = '/' }: { active: ClinicFilterKey; basePath?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function go(key: ClinicFilterKey) {
    const next = new URLSearchParams(params.toString());
    if (key === 'all') next.delete('clinic');
    else next.set('clinic', key);
    startTransition(() => router.push(`${basePath}?${next.toString()}`));
  }

  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Clinic</span>
      {OPTS.map((o) => {
        const isActive = o.key === active;
        return (
          <button
            key={o.key}
            onClick={() => go(o.key)}
            disabled={pending}
            aria-pressed={isActive}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition disabled:opacity-60 ${
              isActive ? 'bg-accent text-white' : 'border border-line bg-card text-ink-soft hover:bg-na/10'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
