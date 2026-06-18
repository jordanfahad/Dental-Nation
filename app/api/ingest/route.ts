import { NextRequest, NextResponse } from "next/server";
import { preprocess } from "@/lib/ingest/preprocess";
import { buildCatalog } from "@/lib/ingest/catalog";
import { runExtraction } from "@/lib/ingest/extract";
import { importZoho } from "@/lib/ingest/zoho";
import { uploadIngestRaw } from "@/lib/ingest/storage";
import { getComponents, getProjects } from "@/lib/impact/data";
import { requireSupabaseAdmin } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/role";
import type { ExtractionResult } from "@/lib/impact/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ingestion endpoint (§5). Writes ONLY to ingestion_jobs (status pending_review)
// for the LLM path; the Zoho path also upserts trusted task rows. Nothing in
// projects/tasks is created from the LLM extraction except by approving the job
// on the review screen — see app/(app)/impact/review/actions.ts.
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Read-only access — admin only." }, { status: 403 });
    }
    const db = requireSupabaseAdmin();
    const form = await req.formData();
    const text = typeof form.get("text") === "string" ? (form.get("text") as string) : undefined;

    let file: { name: string; buffer: Buffer; mime: string } | undefined;
    const fileEntry = form.get("file");
    if (fileEntry && typeof fileEntry !== "string") {
      const f = fileEntry as File;
      file = { name: f.name, buffer: Buffer.from(await f.arrayBuffer()), mime: f.type || "" };
    }

    const detected = preprocess({ text, file });
    if (detected.kind === "error") {
      return NextResponse.json({ error: detected.error }, { status: 400 });
    }

    const [components, projects] = await Promise.all([getComponents(db), getProjects(db)]);

    let storagePath: string | null = null;
    if (file) storagePath = await uploadIngestRaw(file.buffer, file.name, file.mime);

    let extracted: ExtractionResult;
    let sourceType: string;
    let sourceRef: string;

    if (detected.kind === "zoho") {
      // Introspection aid (spec §5b): log headers + sample rows on import.
      console.log("[zoho-import] headers:", detected.headers);
      console.log("[zoho-import] sample rows:", detected.rows.slice(0, 3));
      const res = await importZoho({
        headers: detected.headers,
        rows: detected.rows,
        filename: detected.filename,
        components,
        projects,
      });
      extracted = res.extracted;
      sourceType = "zoho";
      sourceRef = detected.filename;
    } else {
      extracted = await runExtraction({
        catalog: buildCatalog(components, projects),
        text: detected.kind === "pdf" ? text : (detected as { text?: string }).text,
        pdfBase64: detected.kind === "pdf" ? detected.pdfBase64 : undefined,
      });
      sourceType = detected.sourceType;
      sourceRef = file?.name ?? (text ? text.slice(0, 60) : "pasted text");
    }

    const { data, error } = await db
      .from("ingestion_jobs")
      .insert({
        source_type: sourceType,
        source_ref: sourceRef,
        status: "pending_review",
        extracted,
        storage_path: storagePath,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ jobId: data.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ingestion failed" },
      { status: 500 }
    );
  }
}
