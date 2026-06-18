import { TopNav } from "@/components/shell/TopNav";
import { getComponents, getIngestionJobs, getProjects } from "@/lib/impact/data";
import { currentRole } from "@/lib/auth/role";

// The app shell (shared by the Lane E report at "/" and the Impact tab) sits
// behind the same password gate (middleware.ts) — one login, role-aware
// (admin = full, viewer = read-only).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [components, projects, jobs, role] = await Promise.all([
    getComponents(),
    getProjects(),
    getIngestionJobs(),
    currentRole(),
  ]);
  const canEdit = role === "admin";
  const pending = jobs.filter((j) => j.status === "pending_review").length;

  return (
    <div className="min-h-screen">
      <TopNav
        components={components}
        projects={projects}
        pendingReviewCount={pending}
        canEdit={canEdit}
      />
      {children}
    </div>
  );
}
