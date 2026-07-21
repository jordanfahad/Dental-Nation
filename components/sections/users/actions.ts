'use server';

import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/auth/role';
import { createUser, updateUser, deleteUser, BASE_ROLES, type BaseRole } from '@/lib/auth/users';
import { visibleTabsFor, grantableTabs } from '@/components/tabs';

/**
 * Users-tab mutations (admin only). The client sends the EFFECTIVE grantable tab
 * selection; we derive extra_tabs / removed_tabs relative to the base role's
 * default set, so the stored model stays "base role + tweaks".
 */
function deriveTabs(baseRole: BaseRole, selected: string[]): { extra: string[]; removed: string[] } {
  const grant = new Set<string>(grantableTabs().map((t) => t.key));
  const base = new Set<string>(visibleTabsFor(baseRole).filter((t) => grant.has(t)));
  const sel = new Set<string>(selected.filter((t) => grant.has(t)));
  const extra = [...sel].filter((t) => !base.has(t));
  const removed = [...base].filter((t) => !sel.has(t));
  return { extra, removed };
}

export interface SaveResult {
  ok: boolean;
  error?: string;
}

export async function saveUser(_prev: SaveResult | undefined, formData: FormData): Promise<SaveResult> {
  if (!(await isAdmin())) return { ok: false, error: 'Admin only.' };

  const idRaw = formData.get('id');
  const id = idRaw ? Number(idRaw) : null;
  const name = String(formData.get('name') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const baseRoleRaw = String(formData.get('baseRole') ?? 'staff');
  const baseRole = (BASE_ROLES.includes(baseRoleRaw as BaseRole) ? baseRoleRaw : 'staff') as BaseRole;
  const active = formData.get('active') === 'true';
  const note = (String(formData.get('note') ?? '').trim() || null) as string | null;
  const selected = formData.getAll('tabs').map(String);

  if (!name) return { ok: false, error: 'Name is required.' };
  if (!id && !password) return { ok: false, error: 'A password is required for a new user.' };

  const { extra, removed } = deriveTabs(baseRole, selected);
  const input = {
    name,
    password: password || undefined,
    baseRole,
    extraTabs: extra,
    removedTabs: removed,
    active,
    note,
  };

  const res = id ? await updateUser(id, input) : await createUser(input);
  if (res.ok) revalidatePath('/');
  return res;
}

export async function removeUser(id: number): Promise<SaveResult> {
  if (!(await isAdmin())) return { ok: false, error: 'Admin only.' };
  const res = await deleteUser(id);
  if (res.ok) revalidatePath('/');
  return res;
}
