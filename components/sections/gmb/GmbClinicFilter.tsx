'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { GMB_CLINICS, type GmbClinicFilter as Filter } from '@/config/gmb-clinics';

export function GmbClinicFilter({ active }: { active: Filter }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  return (
    <div className="no-print flex flex-wrap items-center gap-1.5" aria-label="Business Profile branch">
      {[{ key: 'all' as const, label: 'All branches' }, ...GMB_CLINICS].map((branch) => (
        <button key={branch.key} type="button" disabled={pending} aria-pressed={active === branch.key}
          className={`rounded-full border px-3 py-1 text-[11.5px] font-medium disabled:opacity-60 ${active === branch.key ? 'border-accent bg-accent text-white' : 'border-line bg-card text-ink-soft'}`}
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            if (branch.key === 'all') next.delete('bpclinic');
            else next.set('bpclinic', branch.key);
            startTransition(() => router.push(`/?${next.toString()}`));
          }}>
          {branch.label}
        </button>
      ))}
    </div>
  );
}
