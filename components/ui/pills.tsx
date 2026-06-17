import type { Decision } from '@/lib/types';

const DECISION_STYLES: Record<Decision, string> = {
  Continue: 'bg-good/10 text-good ring-good/20',
  Fix: 'bg-watch/10 text-watch ring-watch/20',
  Hold: 'bg-na/10 text-ink-soft ring-na/30',
  Stop: 'bg-stop/10 text-stop ring-stop/20',
};

export function DecisionPill({ decision, size = 'lg' }: { decision: Decision; size?: 'lg' | 'sm' }) {
  const sizing = size === 'lg' ? 'px-5 py-2 text-2xl' : 'px-3 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-semibold ring-1 ${sizing} ${DECISION_STYLES[decision]}`}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{
          background:
            decision === 'Continue'
              ? 'var(--good)'
              : decision === 'Fix'
                ? 'var(--watch)'
                : decision === 'Stop'
                  ? 'var(--stop)'
                  : 'var(--na)',
        }}
      />
      {decision}
    </span>
  );
}

/** ✓ / ✕ / — tri-state cell for the channel activation grid (§B). */
export function StatusCell({ value }: { value: boolean | null }) {
  if (value === null) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-na/10 text-[11px] text-na">
        —
      </span>
    );
  }
  return value ? (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-good/10 text-[12px] font-semibold text-good">
      ✓
    </span>
  ) : (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-stop/10 text-[12px] font-semibold text-stop">
      ✕
    </span>
  );
}

const TYPE_STYLES: Record<string, string> = {
  channel: 'bg-accent/10 text-accent',
  creative: 'bg-violet-100 text-violet-700',
  tracking: 'bg-amber-100 text-amber-800',
  PAC: 'bg-sky-100 text-sky-800',
  clinic: 'bg-emerald-100 text-emerald-800',
  CRM: 'bg-rose-100 text-rose-800',
  website: 'bg-slate-200 text-slate-700',
};

export function TypeTag({ type }: { type: string | null }) {
  if (!type) return <span className="text-ink-ghost">—</span>;
  const style = TYPE_STYLES[type] ?? 'bg-na/10 text-ink-soft';
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${style}`}>
      {type}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-stop/10 text-stop',
  'in-progress': 'bg-watch/10 text-watch',
  done: 'bg-good/10 text-good',
};

export function StatusTag({ status }: { status: string | null }) {
  if (!status) return <span className="text-ink-ghost">—</span>;
  const style = STATUS_STYLES[status] ?? 'bg-na/10 text-ink-soft';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${style}`}>
      {status}
    </span>
  );
}

const IMPACT_STYLES: Record<string, string> = {
  high: 'text-stop',
  medium: 'text-watch',
  low: 'text-ink-faint',
};
export function ImpactDot({ impact }: { impact: string | null }) {
  const style = impact ? IMPACT_STYLES[impact] ?? 'text-na' : 'text-na';
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {impact ?? '—'}
    </span>
  );
}
