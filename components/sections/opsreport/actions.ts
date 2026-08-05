'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/auth/role';
import { resolveEditToken } from '@/lib/board/shareLinks';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  SECTION_KINDS,
  fieldsToPayload,
  templatePayload,
  type SectionKind,
} from '@/lib/ops-report';

/**
 * Mutations for the Head of Operations report.
 *
 * WHO MAY EDIT — two credentials, checked server-side on every call:
 *  1. A signed-in admin, or any user whose tab grants include `operations`
 *     (Ms Shadi's login on the internal tab).
 *  2. An EDITOR share link: the form carries its token, and the token must
 *     resolve to a live operations link minted with can_edit — this is what
 *     lets Ms Shadi edit straight from a link with no login at all. Refresh
 *     shows the change immediately (the routes are force-dynamic).
 *  Read-only links carry no edit flag and fail this check; revoking an editor
 *  link kills its editing on the very next request.
 */

async function editor(formData?: FormData): Promise<{ name: string } | null> {
  const token = String(formData?.get('edit_token') ?? '').trim();
  if (token) {
    const link = await resolveEditToken(token);
    return link ? { name: link.label || 'editor link' } : null;
  }
  const me = await currentUser();
  if (!me) return null;
  if (me.role === 'admin' || me.extraTabs.includes('operations')) {
    return { name: me.name ?? me.role };
  }
  return null;
}

function refresh(): void {
  // The internal tab and the tokenised share pages are all force-dynamic;
  // revalidating the dashboard root is enough for the editing session itself.
  revalidatePath('/');
}

const num = (v: FormDataEntryValue | null): number | null => {
  const n = Number(String(v ?? ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export async function saveOpsSection(formData: FormData): Promise<void> {
  const who = await editor(formData);
  const db = getSupabaseAdmin();
  const id = num(formData.get('id'));
  const kind = String(formData.get('kind') ?? '') as SectionKind;
  if (!who || !db || !id || !SECTION_KINDS.includes(kind)) return;

  const payload = fieldsToPayload(kind, (name) => String(formData.get(name) ?? ''));
  await db
    .from('ops_report_sections')
    .update({
      title: String(formData.get('title') ?? '').slice(0, 300),
      subtitle: String(formData.get('subtitle') ?? '').slice(0, 1000),
      payload,
      updated_by: who.name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  refresh();
}

export async function addOpsSection(formData: FormData): Promise<void> {
  const who = await editor(formData);
  const db = getSupabaseAdmin();
  const kind = String(formData.get('kind') ?? '') as SectionKind;
  if (!who || !db || !SECTION_KINDS.includes(kind)) return;

  const { data } = await db
    .from('ops_report_sections')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (data ? Number(data.position) : 0) + 10;

  await db.from('ops_report_sections').insert({
    position,
    kind,
    title: String(formData.get('title') ?? 'New section').slice(0, 300) || 'New section',
    subtitle: '',
    payload: templatePayload(kind),
    visible: true,
    updated_by: who.name,
  });
  refresh();
}

export async function deleteOpsSection(formData: FormData): Promise<void> {
  const who = await editor(formData);
  const db = getSupabaseAdmin();
  const id = num(formData.get('id'));
  // The checkbox is the two-step: Delete does nothing unless it was ticked.
  if (!who || !db || !id || formData.get('confirm') !== 'on') return;
  await db.from('ops_report_sections').delete().eq('id', id);
  refresh();
}

export async function toggleOpsSection(formData: FormData): Promise<void> {
  const who = await editor(formData);
  const db = getSupabaseAdmin();
  const id = num(formData.get('id'));
  if (!who || !db || !id) return;
  const { data } = await db.from('ops_report_sections').select('visible').eq('id', id).maybeSingle();
  if (!data) return;
  await db
    .from('ops_report_sections')
    .update({ visible: !data.visible, updated_by: who.name, updated_at: new Date().toISOString() })
    .eq('id', id);
  refresh();
}

export async function moveOpsSection(formData: FormData): Promise<void> {
  const who = await editor(formData);
  const db = getSupabaseAdmin();
  const id = num(formData.get('id'));
  const dir = String(formData.get('dir') ?? '');
  if (!who || !db || !id || (dir !== 'up' && dir !== 'down')) return;

  const { data: all } = await db
    .from('ops_report_sections')
    .select('id,position')
    .order('position', { ascending: true });
  if (!all) return;
  const idx = all.findIndex((r) => Number(r.id) === id);
  const other = dir === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || other < 0 || other >= all.length) return;

  // Swap the two positions — a stable, closed operation whatever the values.
  await db.from('ops_report_sections').update({ position: Number(all[other].position) }).eq('id', id);
  await db.from('ops_report_sections').update({ position: Number(all[idx].position) }).eq('id', Number(all[other].id));
  refresh();
}
