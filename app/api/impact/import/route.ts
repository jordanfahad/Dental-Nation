import { NextRequest, NextResponse } from "next/server";
import { getProjects, getTasks } from "@/lib/impact/data";
import { requireSupabaseAdmin } from "@/lib/supabase/server";
import { uploadIngestRaw } from "@/lib/ingest/storage";
import { isAdmin } from "@/lib/auth/role";
import { buildProposal, parseBulkWorkbook } from "@/lib/impact/bulk-edit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Re-import an edited export. Writes ONLY an ingestion_jobs row (a diff proposal,
// status pending_review). Nothing in projects/tasks changes until the bulk-edit
// review screen is confirmed — same one-human-gate guarantee as every other
// ingest path.
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Read-only access — admin only." }, { status: 403 });
    }
    const form = await req.formData();
    const fileEntry = form.get("file");
    if (!fileEntry || typeof fileEntry === "string") {
      return NextResponse.json({ error: "Choose the edited Excel file to import." }, { status: 400 });
    }
    const f = fileEntry as File;
    if (!f.size) return NextResponse.json({ error: "That file is empty." }, { status: 400 });

    const buf = Buffer.from(await f.arrayBuffer());
    let parsed;
    try {
      parsed = parseBulkWorkbook(buf);
    } catch {
      return NextResponse.json(
        { error: "Couldn't read that file as an Excel workbook. Re-download the export and try again." },
        { status: 400 },
      );
    }
    if (!parsed.Projects.length && !parsed.Tasks.length) {
      return NextResponse.json(
        {
          error:
            "No Projects/Tasks rows with IDs were found. Upload the file produced by “Export Excel” without renaming the sheets or the ID columns.",
        },
        { status: 400 },
      );
    }

    const [projects, tasks] = await Promise.all([getProjects(), getTasks()]);
    const proposal = buildProposal(parsed, projects, tasks);
    const changeCount = proposal.projectUpdates.length + proposal.taskUpdates.length;
    if (changeCount === 0 && proposal.unmatched.length === 0) {
      return NextResponse.json(
        { error: "No changes detected — every row already matches the dashboard." },
        { status: 400 },
      );
    }

    const storagePath = await uploadIngestRaw(buf, f.name, f.type || "");
    const db = requireSupabaseAdmin();
    const { data, error } = await db
      .from("ingestion_jobs")
      .insert({
        source_type: "excel",
        source_ref: `Bulk edit · ${f.name}`,
        status: "pending_review",
        extracted: proposal,
        storage_path: storagePath,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ jobId: data.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    );
  }
}
