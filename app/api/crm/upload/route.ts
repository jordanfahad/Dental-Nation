import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/role';
import { ingestZavisCsv } from '@/lib/crm/ingest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin-only re-ingest of a fresh Zavis CSV export. Accepts a multipart file
 * field ("file") OR a raw "text" field. Detects the report type, parses, and
 * upserts into the matching lane_e.crm_* table. Viewers are rejected (same gate
 * as the Impact import routes). Never crashes — always returns JSON.
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Read-only access — admin only.' }, { status: 403 });
    }

    let text: string | undefined;
    const contentType = req.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const fileEntry = form.get('file');
      const textEntry = form.get('text');
      if (fileEntry && typeof fileEntry !== 'string') {
        const f = fileEntry as File;
        if (!f.size) return NextResponse.json({ error: 'That file is empty.' }, { status: 400 });
        text = await f.text();
      } else if (typeof textEntry === 'string' && textEntry.trim()) {
        text = textEntry;
      }
    } else {
      // raw text body
      const raw = await req.text();
      if (raw.trim()) text = raw;
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Choose a Zavis CSV export to upload (or paste its contents).' },
        { status: 400 },
      );
    }

    const result = await ingestZavisCsv(text);
    return NextResponse.json({ ok: true, type: result.type, rowsIngested: result.rowsIngested });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload failed.' },
      { status: 400 },
    );
  }
}
