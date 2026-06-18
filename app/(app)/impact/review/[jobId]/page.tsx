import Link from "next/link";
import { notFound } from "next/navigation";
import { getComponents, getIngestionJob, getProjects } from "@/lib/impact/data";
import { currentRole } from "@/lib/auth/role";
import { ReviewClient } from "./ReviewClient";

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

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link href="/impact" className="text-sm text-ink-2 hover:text-ink">
        ← Impact
      </Link>
      <ReviewClient job={job} components={components} projects={projects} canEdit={role === "admin"} />
    </div>
  );
}
