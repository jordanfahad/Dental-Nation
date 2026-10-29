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

/** The new leadership pages (/next, made the home page on 29 Oct 2026). */
const NEXT_PAGES: Record<string, string> = {
  '/next': 'Overview', '/next/channels': 'Channels', '/next/clinics': 'Clinics', '/next/programmes': 'Programmes',
};

export function BackFrom() {
  const [label, setLabel] = useState<string | null>(null);
  const [fromNext, setFromNext] = useState(false);

  useEffect(() => {
    try {
      const ref = document.referrer;
      if (!ref) return;
      const from = new URL(ref);
      if (from.origin !== window.location.origin) return;
      // Same view (reload / self-link): nothing to go back to.
      const here = new URL(window.location.href);
      if (from.pathname === here.pathname && from.search === here.search) return;
      // A proof link on the new leadership pages: offer a clear way back there.
      const next = NEXT_PAGES[from.pathname.replace(/\/$/, '') || '/'];
      if (next) {
        setFromNext(true);
        setLabel(next);
        return;
      }
      // Only dashboard views get a labelled return (share/login pages don't).
      if (from.pathname !== '/' && !from.pathname.startsWith('/impact')) return;
      setLabel(from.pathname.startsWith('/impact') ? 'Growth Projects' : labelFor(from));
    } catch {
      /* referrer parsing is a convenience, never an error */
    }
  }, []);

  if (!label) return null;
  if (fromNext) {
    // Arrived from a number on the new pages: a full-width bar, hard to miss.
    return (
      <div className="no-print fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 bg-dn-navy px-4 py-2.5 text-[13px] text-white shadow-lg md:px-8">
        <span className="min-w-0">You opened this detail view from the new {label} page.</span>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex-none rounded-md bg-dn-mint px-3 py-1.5 text-[13px] font-semibold text-dn-navy hover:bg-white"
        >
          <span aria-hidden>←</span> Back to {label}
        </button>
      </div>
    );
  }
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
