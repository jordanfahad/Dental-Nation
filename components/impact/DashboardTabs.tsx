"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";

/**
 * In-page sub-tabs for the Growth Projects dashboard. The one-pager was too long
 * to scan, so it's split into focused tabs (Overview is the executive read).
 *
 * Each section is rendered server-side and passed in as a node; inactive panels
 * are kept mounted but `hidden` (so form state survives a tab switch and the
 * "Export PDF" print path can reveal every panel via the print rule in
 * globals.css). The active tab is mirrored to the URL hash, so a specific view
 * is bookmarkable / shareable (e.g. …/impact#tasks).
 */
export type TabKey = "overview" | "projects" | "tasks" | "impact" | "operating" | "evidence";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" },
  { key: "impact", label: "Impact & Effort" },
  { key: "operating", label: "Operating model" },
  { key: "evidence", label: "Evidence" },
];

export function DashboardTabs(panels: Record<TabKey, React.ReactNode>) {
  const [active, setActive] = useState<TabKey>("overview");

  // Deep-link via the URL hash — bookmarkable, and no RSC refetch on switch.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace("#", "") as TabKey;
      if (TABS.some((t) => t.key === h)) setActive(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const select = (k: TabKey) => {
    setActive(k);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${k}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <div className="no-print sticky top-14 z-20 -mx-5 mb-6 border-b border-dn-line bg-[#F7F5EF]/90 px-5 backdrop-blur">
        <div
          role="tablist"
          aria-label="Dashboard sections"
          className="flex gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={active === t.key}
              onClick={() => select(t.key)}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                active === t.key
                  ? "bg-dn-navy text-white"
                  : "text-dn-navy/70 hover:bg-dn-navy/5 hover:text-dn-navy",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {TABS.map((t) => (
        <div key={t.key} className={cn("tab-panel space-y-10", active === t.key ? "" : "hidden")}>
          {panels[t.key]}
        </div>
      ))}
    </>
  );
}
