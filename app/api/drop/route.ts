import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/role';
import {
  DROP_MAX_BYTES,
  confirmDrop,
  isDropArea,
  signDropUpload,
} from '@/lib/drop/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Data Drop API — two-step direct-to-Storage upload (see lib/drop/data.ts):
 *   { op: 'sign', area, filename, size }  → { signedUrl, path }
 *   { op: 'confirm', area, path, filename, mime, size, note } → { ok }
 * Gated to signed-in dashboard users (any role but receptionist); the bytes
 * themselves go straight to the private bucket via the signed URL.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role === 'receptionist') {
    return NextResponse.json({ error: 'Sign in to upload.' }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  const area = body.area;
  if (!isDropArea(area)) return NextResponse.json({ error: 'Unknown drop area.' }, { status: 400 });
  const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
  if (!filename) return NextResponse.json({ error: 'Missing filename.' }, { status: 400 });
  const size = typeof body.size === 'number' && Number.isFinite(body.size) ? body.size : 0;
  if (size > DROP_MAX_BYTES) {
    return NextResponse.json(
      { error: `"${filename}" is larger than the 50 MB limit — please split or compress it.` },
      { status: 400 },
    );
  }

  try {
    if (body.op === 'sign') {
      const signed = await signDropUpload(area, filename);
      return NextResponse.json(signed);
    }
    if (body.op === 'confirm') {
      const path = typeof body.path === 'string' ? body.path : '';
      if (!path) return NextResponse.json({ error: 'Missing path.' }, { status: 400 });
      await confirmDrop({
        area,
        path,
        filename,
        mime: typeof body.mime === 'string' ? body.mime : '',
        sizeBytes: size,
        note: typeof body.note === 'string' ? body.note.trim() : '',
        uploadedBy: user.name ?? user.role,
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown op.' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
