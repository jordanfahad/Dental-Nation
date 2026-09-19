'use client';

import { useEffect, useState } from 'react';
import { TABS } from '@/components/tabs';
import { MARKETING_SUBTABS } from '@/components/sections/marketing/subtabs';

/**
 * "← Back to …" — a floating return pill that appears whenever this view was
 * reached from another dashboard view. It names the exact origin (tab,
 * sub-tab, drilldown) and uses history.back(), so the browser restores the
 * precise spot — scroll position and client state included (bfcache) — rather
 * than re-deriving an approximation of it.
 */

const CHANNEL_LABELS: Record<string, string> = {
  performance: 'Performance / Paid',
  affiliates: 'Affiliates',
  seo: 'SEO / Organic Search',
  social: 'Social / Organic',
  referrals: 'Referrals',
  direct: 'Direct',
  crm: 'Email / WhatsApp / SMS',
};

function labelFor(u: URL): string {
  const tab = u.searchParams.get('tab') ?? 'executive';
  const tabLabel = TABS.find((t) => t.key === tab)?.label ?? 'Dashboard';
  const parts = [tabLabel];
  if (tab === 'marketing') {
    const mtab = u.searchParams.get('mtab') ?? 'overview';
    const sub = MARKETING_SUBTABS.find((s) => s.key === mtab)?.label;
    if (sub) parts.push(sub);
    const mchan = u.searchParams.get('mchan');
    if (mchan && CHANNEL_LABELS[mchan]) parts.push(CHANNEL_LABELS[mchan]);
    const camp = u.searchParams.get('mcamp') ?? u.searchParams.get('gcamp');
    if (camp) parts.push(camp.length > 28 ? `${camp.slice(0, 28)}…` : camp);
  }
  return parts.join(' › ');
}

export function BackFrom() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    try {
      const ref = document.referrer;
      if (!ref) return;
      const from = new URL(ref);
      if (from.origin !== window.location.origin) return;
      // Same view (reload / self-link): nothing to go back to.
      const here = new URL(window.location.href);
      if (from.pathname === here.pathname && from.search === here.search) return;
      // Only dashboard views get a labelled return (share/login pages don't).
      if (from.pathname !== '/' && !from.pathname.startsWith('/impact')) return;
      setLabel(from.pathname.startsWith('/impact') ? 'Growth Projects' : labelFor(from));
    } catch {
      /* referrer parsing is a convenience, never an error */
    }
  }, []);

  if (!label) return null;
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className="no-print fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-[12px] font-medium text-ink shadow-lg transition hover:border-accent/50 hover:text-accent"
      title="Return to the exact spot you came from (scroll position and filters restored)"
    >
      <span aria-hidden>←</span> Back to {label}
    </button>
  );
}
