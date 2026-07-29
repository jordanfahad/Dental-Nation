'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { GROWTH_CLINIC_OPTS, type GrowthClinicKey } from '@/config/clinics';

/**
 * Growth Platform clinic pills — All / Dental Nation Al Wasl / Dr Tosun / AMC.
 * Sets `?gclinic=` while preserving every other param and staying on the
 * current tab, so the same control works on the Group tab and the Executive
 * mirror. Server components read the param and scope the report.
 */
export function GrowthClinicFilter({ active }: { active: GrowthClinicKey }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function go(key: GrowthClinicKey) {
    const next = new URLSearchParams(params.toString());
    if (key === 'all') next.delete('gclinic');
    else next.set('gclinic', key);
    next.delete('gchan'); // a drill-down from another clinic's numbers would mislead
    startTransition(() => router.push(`/?${next.toString()}`));
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Clinic</span>
      {GROWTH_CLINIC_OPTS.map((o) => {
        const isActive = o.key === active;
        return (
          <button
            key={o.key}
            onClick={() => go(o.key)}
            disabled={pending}
            aria-pressed={isActive}
            className={`rounded-full border px-3 py-1 text-[11.5px] font-medium transition disabled:opacity-60 ${
              isActive
                ? 'border-accent bg-accent text-white'
                : 'border-line bg-card text-ink-soft hover:border-accent/40 hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
