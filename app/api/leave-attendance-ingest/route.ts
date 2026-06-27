import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeEqual } from '@/lib/auth/session';
import { parseAttendanceCsv } from '@/lib/leave/csv';

export const runtime = 'nodejs';

/**
 * Machine-to-machine attendance ingest for IT's biometric integration.
 * Auth: header `Authorization: Bearer <LEAVE_INGEST_SECRET>` (or `x-ingest-secret`).
 * Body (JSON): { rows: [{ email, date, hours }, ...] }  OR  { csv: "email,date,hours\n..." }.
 * Records system-wide (no per-user scoping) — the secret is the gate.
 *
 * Example:
 *   curl -X POST https://<host>/api/leave-attendance-ingest \
 *     -H "Authorization: Bearer $LEAVE_INGEST_SECRET" -H "Content-Type: application/json" \
 *     -d '{"rows":[{"email":"sa.sultan@dentalnation.com","date":"2026-06-26","hours":8}]}'
 */
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const expected = process.env.LEAVE_INGEST_SECRET;
  if (!url || !key || !expected) {
    return NextResponse.json({ ok: false, error: 'Server not configured (LEAVE_INGEST_SECRET missing)' }, { status: 500 });
  }

  const auth = req.headers.get('authorization') || '';
  const provided = (auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : req.headers.get('x-ingest-secret') || '').trim();
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  let rows: { email: string; date: string; hours: number }[] = [];
  if (Array.isArray(body?.rows)) {
    rows = body.rows
      .map((r: Record<string, unknown>) => ({ email: String(r.email ?? '').toLowerCase().trim(), date: String(r.date ?? '').trim(), hours: Number(r.hours) }))
      .filter((r: { email: string; date: string; hours: number }) => r.email && r.date && Number.isFinite(r.hours));
  } else if (typeof body?.csv === 'string') {
    rows = parseAttendanceCsv(body.csv);
  }
  if (!rows.length) return NextResponse.json({ ok: false, error: 'No valid rows (expected rows[] of {email,date,hours} or csv)' }, { status: 400 });

  const sb = createClient(url, key, { db: { schema: 'public' }, auth: { persistSession: false } });
  const { data, error } = await sb.rpc('leave_attendance_bulk', { p_actor_email: null, p_rows: rows });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
