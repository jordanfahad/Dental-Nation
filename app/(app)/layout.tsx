import { TopNav } from "@/components/shell/TopNav";
import { getComponents, getIngestionJobs, getProjects } from "@/lib/impact/data";
import { currentUser } from "@/lib/auth/role";
import { canSeeGrowthProjects, canSeeLeaveCalendar, type Role } from "@/lib/auth/session";

// The app shell (shared by the Lane E report at "/" and the Impact tab) sits
// behind the same password gate (middleware.ts) — one login, role-aware
// (admin = full, viewer = read-only, staff = restricted read-only).
export const dynamic = "force-dynamic";

/** What the top-right chip says. Named users show their name so a screenshot
 *  proves WHICH login the session belongs to (viewer vs a personal password). */
const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  viewer: "Viewer · read-only",
  staff: "Staff · read-only",
  clinician: "Staff · read-only",
  opsstaff: "Staff · read-only",
  receptionist: "Reception · read-only",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [components, projects, jobs, me] = await Promise.all([
    getComponents(),
    getProjects(),
    getIngestionJobs(),
    currentUser(),
  ]);
  const role = me?.role ?? null;
  const canEdit = role === "admin";
  const identity = role ? (me?.name ? `${me.name} · ${ROLE_LABEL[role]}` : ROLE_LABEL[role]) : null;
  const showGrowth = canSeeGrowthProjects(role);
  const showLeave = canSeeLeaveCalendar(role);
  // Only surface impact-review work to editors who can actually see Growth Projects.
  const pending = showGrowth ? jobs.filter((j) => j.status === "pending_review").length : 0;

  return (
    <div className="min-h-screen">
      <TopNav
        components={components}
        projects={projects}
        pendingReviewCount={pending}
        canEdit={canEdit}
        showGrowthProjects={showGrowth}
        showLeaveCalendar={showLeave}
        identity={identity}
      />
      {children}
    </div>
  );
}
