'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { BaseRole } from '@/lib/auth/users';
import { saveUser, removeUser } from './actions';

export interface UserRow {
  id: number;
  name: string;
  baseRole: BaseRole;
  active: boolean;
  note: string | null;
  selectedTabs: string[];
}

interface Props {
  users: UserRow[];
  grantable: { key: string; label: string }[];
  baseDefaults: Record<BaseRole, string[]>;
  roleOptions: { value: BaseRole; label: string }[];
}

interface Draft {
  id: number | null;
  name: string;
  password: string;
  baseRole: BaseRole;
  active: boolean;
  note: string;
  tabs: string[];
}

const ROLE_SHORT: Record<BaseRole, string> = {
  admin: 'Admin',
  viewer: 'Viewer',
  staff: 'Staff',
  receptionist: 'Receptionist',
};

function blankDraft(baseDefaults: Record<BaseRole, string[]>): Draft {
  return { id: null, name: '', password: '', baseRole: 'staff', active: true, note: '', tabs: [...(baseDefaults.staff ?? [])] };
}

export function UsersClient({ users, grantable, baseDefaults, roleOptions }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const labelFor = (key: string) => grantable.find((g) => g.key === key)?.label ?? key;

  const openNew = () => {
    setError(null);
    setDraft(blankDraft(baseDefaults));
  };
  const openEdit = (u: UserRow) => {
    setError(null);
    setDraft({ id: u.id, name: u.name, password: '', baseRole: u.baseRole, active: u.active, note: u.note ?? '', tabs: [...u.selectedTabs] });
  };
  const close = () => {
    setDraft(null);
    setError(null);
  };

  const setRole = (role: BaseRole) => {
    if (!draft) return;
    // Switching role resets the tab selection to that role's default grantable set.
    setDraft({ ...draft, baseRole: role, tabs: [...(baseDefaults[role] ?? [])] });
  };
  const toggleTab = (key: string) => {
    if (!draft) return;
    const has = draft.tabs.includes(key);
    setDraft({ ...draft, tabs: has ? draft.tabs.filter((t) => t !== key) : [...draft.tabs, key] });
  };

  const submit = () => {
    if (!draft) return;
    setError(null);
    const fd = new FormData();
    if (draft.id != null) fd.set('id', String(draft.id));
    fd.set('name', draft.name);
    fd.set('password', draft.password);
    fd.set('baseRole', draft.baseRole);
    fd.set('active', draft.active ? 'true' : 'false');
    fd.set('note', draft.note);
    for (const t of draft.tabs) fd.append('tabs', t);
    startTransition(async () => {
      const res = await saveUser(undefined, fd);
      if (res.ok) {
        close();
        router.refresh();
      } else {
        setError(res.error ?? 'Could not save.');
      }
    });
  };

  const del = (u: UserRow) => {
    if (!confirm(`Delete ${u.name}? They will no longer be able to log in.`)) return;
    startTransition(async () => {
      const res = await removeUser(u.id);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'Could not delete.');
    });
  };

  const isAdminRole = draft?.baseRole === 'admin';

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-ink">Managed logins</h3>
        {!draft ? (
          <button
            onClick={openNew}
            className="rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-accent-600"
          >
            + Add user
          </button>
        ) : null}
      </div>

      {/* Editor */}
      {draft ? (
        <div className="mb-5 rounded-card border border-line bg-panel/30 p-4">
          <p className="mb-3 text-[12.5px] font-semibold text-ink">{draft.id != null ? `Edit ${draft.name || 'user'}` : 'New user'}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Name</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[13px] text-ink"
                placeholder="e.g. Dr Luvi"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                Password {draft.id != null ? <span className="text-ink-faint">(blank = keep current)</span> : null}
              </span>
              <input
                type="text"
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[13px] text-ink"
                placeholder={draft.id != null ? 'leave blank to keep' : 'set a password'}
                autoComplete="new-password"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Base role</span>
              <select
                value={draft.baseRole}
                onChange={(e) => setRole(e.target.value as BaseRole)}
                className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[13px] text-ink"
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Note (optional)</span>
              <input
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[13px] text-ink"
                placeholder="e.g. email / who this is"
              />
            </label>
          </div>

          <div className="mt-4">
            <span className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Tabs this user can see</span>
            {isAdminRole ? (
              <p className="rounded-md border border-line bg-card px-3 py-2 text-[12px] text-ink-soft">
                Admins see every tab (including Status &amp; Users) and can manage everyone. Tab selection doesn&apos;t apply.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                {grantable.map((t) => (
                  <label key={t.key} className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-soft">
                    <input
                      type="checkbox"
                      checked={draft.tabs.includes(t.key)}
                      onChange={() => toggleTab(t.key)}
                      className="h-3.5 w-3.5 accent-[#1F3A5F]"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            )}
            {!isAdminRole ? (
              <p className="mt-2 text-[10.5px] text-ink-faint">
                Ticked = visible. Changing the base role resets this to that role&apos;s defaults; then tick / untick to fine-tune.
                Status &amp; Users stay admin-only.
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-soft">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                className="h-3.5 w-3.5 accent-[#1F3A5F]"
              />
              Active (can log in)
            </label>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={close} className="rounded-md border border-line px-3 py-1.5 text-[12.5px] text-ink-soft transition hover:text-ink">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={pending}
                className="rounded-md bg-accent px-4 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-accent-600 disabled:opacity-60"
              >
                {pending ? 'Saving…' : draft.id != null ? 'Save changes' : 'Create user'}
              </button>
            </div>
          </div>
          {error ? <p className="mt-2 text-[12px] text-stop">{error}</p> : null}
        </div>
      ) : null}

      {/* List */}
      {users.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-[12.5px] text-ink-soft">
          No managed users yet. Click “Add user” to create one.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Tabs</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line/60 align-top">
                  <td className="py-2.5 pr-3">
                    <span className="font-medium text-ink">{u.name}</span>
                    {u.note ? <span className="block text-[10.5px] text-ink-faint">{u.note}</span> : null}
                  </td>
                  <td className="py-2.5 pr-3 text-ink-soft">{ROLE_SHORT[u.baseRole]}</td>
                  <td className="py-2.5 pr-3 text-ink-soft">
                    {u.baseRole === 'admin' ? (
                      <span className="text-ink-faint">all tabs</span>
                    ) : u.selectedTabs.length === 0 ? (
                      <span className="text-ink-faint">none</span>
                    ) : (
                      u.selectedTabs.map((t) => labelFor(t)).join(', ')
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    {u.active ? (
                      <span className="rounded-full bg-good/10 px-2 py-0.5 text-[11px] font-medium text-good">Active</span>
                    ) : (
                      <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] font-medium text-ink-soft">Disabled</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    <button onClick={() => openEdit(u)} className="text-[12px] font-medium text-accent hover:underline">
                      Edit
                    </button>
                    <button
                      onClick={() => del(u)}
                      disabled={pending}
                      className="ml-3 text-[12px] font-medium text-stop hover:underline disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
