import { NextRequest, NextResponse } from 'next/server';
import { EVIDENCE_BUCKET, requireSupabaseAdmin } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/role';
import { getDrop } from '@/lib/drop/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Downloads a dropped file via a short-lived signed URL. ADMIN ONLY: finance
// source files are sensitive — uploaders see their file listed with status,
// but only the growth/admin side retrieves the contents.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new NextResponse('Not found', { status: 404 });
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return new NextResponse('Not found', { status: 404 });
  const file = await getDrop(n);
  if (!file) return new NextResponse('Not found', { status: 404 });

  const db = requireSupabaseAdmin();
  const { data: signed, error } = await db.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(file.storagePath, 60, { download: file.filename });
  if (error || !signed) return new NextResponse('Unable to sign URL', { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
