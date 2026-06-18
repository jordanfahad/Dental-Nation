import Link from "next/link";
import { getIngestionJobs } from "@/lib/impact/data";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { JobDeleteButton } from "@/components/impact/JobDeleteButton";
import { formatRelativeTime } from "@/lib/impact/format";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, string> = {
  pending_review: "bg-warn-weak text-warn",
  applied: "bg-ok-weak text-ok",
  rejected: "bg-muted-weak text-ink-2",
  approved: "bg-accent-weak text-accent-strong",
};

export default async function ReviewIndexPage() {
  const jobs = await getIngestionJobs();
  const pending = jobs.filter((j) => j.status === "pending_review");
  const others = jobs.filter((j) => j.status !== "pending_review");

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link href="/impact" className="text-sm text-ink-2 hover:text-ink">
        ← Impact
      </Link>
      <div className="mt-3">
        <SectionHeading
          eyebrow="The one human gate"
          title="Ingestion review queue"
          description="Every paste / upload lands here as a proposal. Nothing reaches the dashboard until you open it and approve — reject and inaction write nothing."
        />
      </div>

      {pending.length === 0 ? (
        <EmptyState
          title="Nothing awaiting review"
          hint="Use “Add update” to paste a report, drop a file, or import a Zoho export."
        />
      ) : (
        <ul className="space-y-2">
          {pending.map((j) => (
            <li
              key={j.id}
              className="flex items-center gap-3 rounded-xl border border-hairline bg-paper p-4 hover:shadow-sm"
            >
              <Link href={`/impact/review/${j.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL.pending_review}`}>
                      pending review
                    </span>
                    <span className="text-sm font-medium capitalize text-ink">
                      {j.source_type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-3">{j.source_ref ?? "—"}</p>
                </div>
                <span className="shrink-0 text-xs text-ink-3">{formatRelativeTime(j.created_at)}</span>
              </Link>
              <JobDeleteButton jobId={j.id} />
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-ink">History</h2>
          <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {others.slice(0, 30).map((j) => (
              <li key={j.id} className="flex items-center gap-3 p-3 text-sm">
                <Link href={`/impact/review/${j.id}`} className="flex min-w-0 flex-1 items-center gap-2 hover:text-accent">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL[j.status] ?? STATUS_PILL.rejected}`}>
                    {j.status}
                  </span>
                  <span className="truncate capitalize text-ink-2">
                    {j.source_type.replace("_", " ")} · {j.source_ref ?? "—"}
                  </span>
                </Link>
                <span className="shrink-0 text-xs text-ink-3">
                  {formatRelativeTime(j.applied_at ?? j.reviewed_at ?? j.created_at)}
                </span>
                <JobDeleteButton jobId={j.id} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
