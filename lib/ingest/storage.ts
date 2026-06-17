import { EVIDENCE_BUCKET, requireSupabaseAdmin } from "@/lib/supabase/server";

/** Persist the raw upload to Storage (under ingest/) and return its path (§5). */
export async function uploadIngestRaw(
  buffer: Buffer,
  filename: string,
  mime: string
): Promise<string | null> {
  const db = requireSupabaseAdmin();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `ingest/${Date.now()}-${safe}`;
  const { error } = await db.storage.from(EVIDENCE_BUCKET).upload(path, buffer, {
    contentType: mime || "application/octet-stream",
    upsert: false,
  });
  return error ? null : path;
}
