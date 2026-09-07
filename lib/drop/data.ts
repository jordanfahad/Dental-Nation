import 'server-only';
import { EVIDENCE_BUCKET, requireSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Data Drop — the file handover lane for the Mega Board Report inputs.
 * Jawad (Finance) and Dr Luvi (Operations) drop their source files here
 * instead of an external Dropbox: files land in the PRIVATE evidence bucket
 * under drops/<area>/, each registered in lane_e.data_drops so the growth
 * team can see, download and process them. Uploads go DIRECTLY to Storage
 * via short-lived signed upload URLs — the file bytes never pass through a
 * serverless function, so the ~4.5 MB Vercel body cap does not apply.
 */

export type DropArea = 'finance' | 'operations';
export const DROP_AREAS: readonly DropArea[] = ['finance', 'operations'] as const;
export const isDropArea = (v: unknown): v is DropArea => DROP_AREAS.includes(v as DropArea);

/** Storage free-tier object limit is 50 MB — enforced here with a clear message. */
export const DROP_MAX_BYTES = 50 * 1024 * 1024;

export interface DropFile {
  id: number;
  area: DropArea;
  filename: string;
  mime: string;
  sizeBytes: number;
  note: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
  status: 'received' | 'processed';
  processedNote: string | null;
}

interface Row {
  id: number;
  area: string;
  filename: string;
  mime: string;
  size_bytes: number;
  note: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  status: string;
  processed_note: string | null;
}

export async function listDrops(): Promise<DropFile[]> {
  const db = requireSupabaseAdmin();
  const { data, error } = await db
    .from('data_drops')
    .select('id,area,filename,mime,size_bytes,note,uploaded_by,uploaded_at,status,processed_note')
    .order('uploaded_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    area: (isDropArea(r.area) ? r.area : 'finance') as DropArea,
    filename: r.filename,
    mime: r.mime,
    sizeBytes: r.size_bytes,
    note: r.note,
    uploadedBy: r.uploaded_by,
    uploadedAt: r.uploaded_at,
    status: r.status === 'processed' ? 'processed' : 'received',
    processedNote: r.processed_note,
  }));
}

/** Mint a signed upload URL for one file; the client PUTs the bytes to it. */
export async function signDropUpload(
  area: DropArea,
  filename: string,
): Promise<{ signedUrl: string; path: string }> {
  const db = requireSupabaseAdmin();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'file';
  const path = `drops/${area}/${Date.now()}-${safe}`;
  const { data, error } = await db.storage.from(EVIDENCE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? 'could not sign upload');
  return { signedUrl: data.signedUrl, path: data.path };
}

/** Register an uploaded file. Verifies the object actually exists in Storage
 *  (the row must never claim a file the PUT failed to deliver). */
export async function confirmDrop(input: {
  area: DropArea;
  path: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  note: string;
  uploadedBy: string;
}): Promise<void> {
  const db = requireSupabaseAdmin();
  if (!input.path.startsWith(`drops/${input.area}/`)) throw new Error('path/area mismatch');
  const dir = input.path.slice(0, input.path.lastIndexOf('/'));
  const base = input.path.slice(input.path.lastIndexOf('/') + 1);
  const { data: listed } = await db.storage.from(EVIDENCE_BUCKET).list(dir, { search: base, limit: 1 });
  if (!listed?.some((f) => f.name === base)) throw new Error('upload not found in storage');
  const { error } = await db.from('data_drops').insert({
    area: input.area,
    filename: input.filename.slice(0, 300),
    storage_path: input.path,
    mime: input.mime.slice(0, 120),
    size_bytes: Math.max(0, Math.round(input.sizeBytes)),
    note: input.note ? input.note.slice(0, 1000) : null,
    uploaded_by: input.uploadedBy.slice(0, 120) || null,
  });
  if (error) throw new Error(error.message);
}

export async function getDrop(id: number): Promise<{ storagePath: string; filename: string } | null> {
  const db = requireSupabaseAdmin();
  const { data } = await db
    .from('data_drops')
    .select('storage_path,filename')
    .eq('id', id)
    .maybeSingle();
  return data ? { storagePath: data.storage_path as string, filename: data.filename as string } : null;
}
