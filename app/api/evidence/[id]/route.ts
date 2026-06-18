import { NextRequest, NextResponse } from "next/server";
import { EVIDENCE_BUCKET, requireSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serves an evidence file to the (authed) CEO via a short-lived (60s) signed URL.
// The bucket is private; gated by middleware so only password-holders reach it,
// and visible_to_ceo is enforced here.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = requireSupabaseAdmin();

  const { data: file } = await db.from("evidence_files").select("*").eq("id", id).maybeSingle();
  if (!file || !file.visible_to_ceo) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: signed, error } = await db.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(file.storage_path, 60);
  if (error || !signed) {
    return new NextResponse("Unable to sign URL", { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
