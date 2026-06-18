import { TopNav } from "@/components/shell/TopNav";
import { getComponents, getIngestionJobs, getProjects } from "@/lib/impact/data";

// The app shell (shared by the Lane E report at "/" and the Impact tab) sits
// behind the same password gate (middleware.ts) — one login, two tabs.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [components, projects, jobs] = await Promise.all([
    getComponents(),
    getProjects(),
    getIngestionJobs(),
  ]);
  const pending = jobs.filter((j) => j.status === "pending_review").length;

  return (
    <div className="min-h-screen">
      <TopNav components={components} projects={projects} pendingReviewCount={pending} />
      {children}
    </div>
  );
}
