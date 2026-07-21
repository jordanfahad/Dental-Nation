import 'server-only';
import { cache } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { safeEqual } from '@/lib/auth/session';

/**
 * Data access for the dashboard user directory (lane_e.dashboard_users) that
 * powers the admin Users tab. A user has a base role plus per-tab tweaks:
 *   effective tabs = visibleTabsFor(base_role) ∪ extra_tabs − removed_tabs
 * Passwords are compared with a constant-time equal (safeEqual), mirroring the
 * existing app_secrets logins. Everything runs service-role only.
 */

export type BaseRole = 'admin' | 'viewer' | 'staff' | 'receptionist';
export const BASE_ROLES: BaseRole[] = ['admin', 'viewer', 'staff', 'receptionist'];
export const BASE_ROLE_LABEL: Record<BaseRole, string> = {
  admin: 'Admin (full access)',
  viewer: 'Viewer (read-only)',
  staff: 'Staff (restricted)',
  receptionist: 'Receptionist (Clinical Ops only)',
};

export interface DashboardUser {
  id: number;
  name: string;
  baseRole: BaseRole;
  extraTabs: string[];
  removedTabs: string[];
  active: boolean;
  note: string | null;
}

interface Row {
  id: number;
  name: string;
  password: string;
  base_role: string;
  extra_tabs: string[] | null;
  removed_tabs: string[] | null;
  active: boolean;
  note: string | null;
}

const COLS = 'id,name,password,base_role,extra_tabs,removed_tabs,active,note';

const toUser = (r: Row): DashboardUser => ({
  id: r.id,
  name: r.name,
  baseRole: (BASE_ROLES.includes(r.base_role as BaseRole) ? r.base_role : 'staff') as BaseRole,
  extraTabs: r.extra_tabs ?? [],
  removedTabs: r.removed_tabs ?? [],
  active: r.active,
  note: r.note,
});

/** True when the users table can be reached (Supabase configured). */
export function usersConfigured(): boolean {
  return getSupabaseAdmin() != null;
}

/** Look up a user by id — cached per request (page + role helper both call it). */
export const getUserById = cache(async (id: string | number | null): Promise<DashboardUser | null> => {
  if (id == null || String(id) === '') return null;
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from('dashboard_users').select(COLS).eq('id', Number(id)).maybeSingle();
  if (error || !data) return null;
  return toUser(data as Row);
});

/** Active user whose password matches `entered`, or null. Constant-time compare. */
export async function findUserByPassword(entered: string): Promise<DashboardUser | null> {
  const sb = getSupabaseAdmin();
  if (!sb || !entered) return null;
  const { data, error } = await sb.from('dashboard_users').select(COLS).eq('active', true);
  if (error || !data) return null;
  for (const r of data as Row[]) {
    if (r.password && safeEqual(entered, r.password)) return toUser(r);
  }
  return null;
}

export async function listUsers(): Promise<DashboardUser[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data } = await sb.from('dashboard_users').select(COLS).order('name');
  return ((data ?? []) as Row[]).map(toUser);
}

export interface UserInput {
  name: string;
  password?: string; // omitted on edit = keep existing
  baseRole: BaseRole;
  extraTabs: string[];
  removedTabs: string[];
  active: boolean;
  note?: string | null;
}

export async function createUser(u: UserInput): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: 'Supabase not configured.' };
  if (!u.name.trim() || !u.password) return { ok: false, error: 'Name and password are required.' };
  const { error } = await sb.from('dashboard_users').insert({
    name: u.name.trim(),
    password: u.password,
    base_role: u.baseRole,
    extra_tabs: u.extraTabs,
    removed_tabs: u.removedTabs,
    active: u.active,
    note: u.note ?? null,
  });
  if (error) return { ok: false, error: error.code === '23505' ? 'A user with that name already exists.' : error.message };
  return { ok: true };
}

export async function updateUser(id: number, u: UserInput): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: 'Supabase not configured.' };
  if (!u.name.trim()) return { ok: false, error: 'Name is required.' };
  const patch: Record<string, unknown> = {
    name: u.name.trim(),
    base_role: u.baseRole,
    extra_tabs: u.extraTabs,
    removed_tabs: u.removedTabs,
    active: u.active,
    note: u.note ?? null,
    updated_at: new Date().toISOString(),
  };
  if (u.password) patch.password = u.password; // only rotate when a new one is entered
  const { error } = await sb.from('dashboard_users').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.code === '23505' ? 'A user with that name already exists.' : error.message };
  return { ok: true };
}

export async function deleteUser(id: number): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: 'Supabase not configured.' };
  const { error } = await sb.from('dashboard_users').delete().eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
