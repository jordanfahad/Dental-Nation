import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { AttachEvidence } from "@/components/forms/AttachEvidence";
import { formatBytes, formatDate } from "@/lib/impact/format";
import type { Component, EvidenceFile } from "@/lib/impact/types";

export function EvidenceLocker({
  evidence,
  components,
  canEdit = true,
}: {
  evidence: EvidenceFile[];
  components: Component[];
  canEdit?: boolean;
}) {
  const visible = evidence.filter((e) => e.visible_to_ceo);
  const nameOf = (id: string | null) =>
    id ? components.find((c) => c.id === id)?.name ?? "Other" : "Board-level";

  const groups = new Map<string, EvidenceFile[]>();
  for (const f of visible) {
    const key = f.component_id ?? "_board";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  return (
    <section className="print-break">
      <SectionHeading
        eyebrow="Evidence"
        title="Evidence locker"
        description="Source files for the CEO to review — each opens via a short-lived signed link from a private bucket."
        right={canEdit ? <AttachEvidence label="+ Attach file" /> : undefined}
      />
      {visible.length === 0 ? (
        <EmptyState
          title="No evidence files yet"
          hint="Attach PDFs, decks, exports or screenshots from a project page or the Add-update drawer."
        />
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([key, files]) => (
            <div key={key} className="card p-4">
              <h3 className="mb-1 text-sm font-semibold text-ink">
                {key === "_board" ? "Board-level" : nameOf(key)}
              </h3>
              <ul className="divide-y divide-hairline">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-panel text-ink-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={`/api/evidence/${f.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-medium text-ink hover:text-accent"
                      >
                        {f.filename}
                      </a>
                      {f.description && <p className="truncate text-xs text-ink-3">{f.description}</p>}
                    </div>
                    <div className="shrink-0 text-right text-xs text-ink-3">
                      <div className="tnum">{formatBytes(f.size_bytes)}</div>
                      <div>{formatDate(f.uploaded_at)}</div>
                    </div>
                    <a
                      href={`/api/evidence/${f.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="no-print shrink-0 rounded-md border border-hairline-strong px-2.5 py-1 text-xs text-ink-2 hover:bg-panel"
                    >
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
