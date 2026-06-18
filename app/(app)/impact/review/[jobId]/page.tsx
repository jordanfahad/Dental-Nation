import Link from "next/link";
import { notFound } from "next/navigation";
import { getComponents, getIngestionJob, getProjects } from "@/lib/impact/data";
import { currentRole } from "@/lib/auth/role";
import { isBulkEdit } from "@/lib/impact/bulk-edit";
import { ReviewClient } from "./ReviewClient";
import { BulkEditReview } from "./BulkEditReview";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const [job, components, projects, role] = await Promise.all([
    getIngestionJob(jobId),
    getComponents(),
    getProjects(),
    currentRole(),
  ]);
  if (!job) notFound();

  // Excel bulk edit → the diff/confirm screen; everything else → the LLM/Zoho review.
  const extracted: unknown = job.extracted;
  if (isBulkEdit(extracted)) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-8">
        <Link href="/impact/review" className="text-sm text-ink-2 hover:text-ink">
          ← Review queue
        </Link>
        <BulkEditReview
          jobId={job.id}
          proposal={extracted}
          status={job.status}
          sourceRef={job.source_ref}
          canEdit={role === "admin"}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link href="/impact" className="text-sm text-ink-2 hover:text-ink">
        ← Impact
      </Link>
      <ReviewClient job={job} components={components} projects={projects} canEdit={role === "admin"} />
    </div>
  );
}
