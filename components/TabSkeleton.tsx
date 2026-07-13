/**
 * Streaming placeholder shown while a tab's server component resolves. The page
 * shell (header, tab bar, footer) paints immediately; the active tab streams in
 * behind a <Suspense> boundary using this skeleton — so switching tabs feels
 * instant instead of blocking the whole render on the tab's data.
 */
export function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-hidden>
      <div className="h-28 rounded-card border border-line bg-panel" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-card border border-line bg-panel" />
        ))}
      </div>
      <div className="h-64 rounded-card border border-line bg-panel" />
      <div className="h-40 rounded-card border border-line bg-panel" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
