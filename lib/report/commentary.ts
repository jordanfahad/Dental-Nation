import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Editable Board-Report commentary. The manager's narrative for the boss changes
 * every period and often contains sensitive internal notes (personnel, vendor
 * disputes), so it lives in the PRIVATE app_secrets store — never in source (the
 * repo is public). Keyed `board_commentary_<slug>`; service-role only.
 */

const keyFor = (slug: string) => `board_commentary_${slug.replace(/[^a-z0-9_]/gi, '')}`;

export async function getCommentary(slug: string): Promise<string> {
  const db = getSupabaseAdmin();
  if (!db) return '';
  try {
    const { data } = await db.from('app_secrets').select('value').eq('key', keyFor(slug)).maybeSingle();
    return (data as { value?: string } | null)?.value ?? '';
  } catch {
    return '';
  }
}

export async function setCommentary(slug: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: 'Supabase not configured.' };
  try {
    const { error } = await db.from('app_secrets').upsert({ key: keyFor(slug), value: body }, { onConflict: 'key' });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'save failed' };
  }
}
