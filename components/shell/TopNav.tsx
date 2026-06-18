"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { AddUpdateDrawer } from "@/components/impact/AddUpdateDrawer";
import { logout } from "@/app/(app)/actions";
import type { Component, Project } from "@/lib/impact/types";

// The performance report lives at "/" in this app; the Growth Projects dashboard is the new tab.
const TABS: [string, string][] = [
  ["/impact", "Growth Projects"],
  ["/", "Performance Report"],
];

export function TopNav({
  components,
  projects,
  pendingReviewCount,
  canEdit = true,
}: {
  components: Component[];
  projects: Project[];
  pendingReviewCount: number;
  canEdit?: boolean;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header className="no-print sticky top-0 z-30 border-b border-hairline bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-[11px] font-bold text-white">
              DN
            </span>
            <span className="text-sm font-semibold text-ink">Dental Nation</span>
          </div>

          <nav className="flex items-center gap-1">
            {TABS.map(([href, label]) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-panel text-ink" : "text-ink-2 hover:text-ink"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {canEdit && pendingReviewCount > 0 && (
              <Link
                href={`/impact/review`}
                className="inline-flex items-center gap-1.5 rounded-full bg-warn-weak px-2.5 py-1 text-xs font-medium text-warn"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                {pendingReviewCount} pending review
              </Link>
            )}
            {canEdit ? (
              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add update
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-xs font-medium text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
                Viewer · read-only
              </span>
            )}
            <button
              onClick={() => window.print()}
              title="Print / export PDF"
              className="rounded-lg border border-hairline-strong px-2.5 py-1.5 text-sm text-ink-2 transition-colors hover:bg-panel"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
              </svg>
            </button>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-hairline-strong px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-panel"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {canEdit && (
        <AddUpdateDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          components={components}
          projects={projects}
        />
      )}
    </>
  );
}
