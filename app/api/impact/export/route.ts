import { NextResponse } from "next/server";
import { getComponents, getProjects, getTasks } from "@/lib/impact/data";
import { isAdmin } from "@/lib/auth/role";
import { buildWorkbook } from "@/lib/impact/bulk-edit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Download every project + task as one editable .xlsx (the bulk-edit round-trip).
// Admin only — the same write-side role that can re-import the edits.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Read-only access — admin only." }, { status: 403 });
  }
  const [components, projects, tasks] = await Promise.all([getComponents(), getProjects(), getTasks()]);
  const componentName = new Map(components.map((c) => [c.id, c.name]));
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  const buf = buildWorkbook({ projects, tasks, componentName, projectName });
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="growth-projects-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
