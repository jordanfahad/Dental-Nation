import { listUsers, usersConfigured, BASE_ROLES, BASE_ROLE_LABEL, type BaseRole } from '@/lib/auth/users';
import { grantableTabs, visibleTabsFor, effectiveVisibleTabs } from '@/components/tabs';
import { Card, SectionHeader } from '@/components/ui/Card';
import { UsersClient, type UserRow } from './UsersClient';

/**
 * Users & access — the admin-only directory tab. Lists managed dashboard logins
 * and lets an admin add / edit / disable them and set each person's access
 * (a base role + which tabs they can see). Backed by lane_e.dashboard_users.
 *
 * Admin + Viewer remain env-configured system logins (DASHBOARD_PASSWORD /
 * VIEWER_PASSWORD) and are managed outside this table.
 */
export async function UserManagement() {
  if (!usersConfigured()) {
    return (
      <Card>
        <SectionHeader eyebrow="Admin" title="Users & access" />
        <div className="px-5 pb-5 pt-4">
          <p className="rounded-card border border-dashed border-line bg-panel/40 px-4 py-6 text-center text-[13px] text-ink-soft">
            User management needs Supabase configured. Run{' '}
            <code className="rounded bg-panel px-1.5 py-0.5 text-[11.5px]">supabase/migrations/0010_dashboard_users.sql</code>{' '}
            then <code className="rounded bg-panel px-1.5 py-0.5 text-[11.5px]">supabase/seed/dashboard_users_data.sql</code>.
          </p>
        </div>
      </Card>
    );
  }

  const users = await listUsers();
  const grantable = grantableTabs();
  const grantKeys = new Set(grantable.map((g) => g.key as string));
  const baseDefaults = Object.fromEntries(
    BASE_ROLES.map((r) => [r, visibleTabsFor(r).filter((t) => grantKeys.has(t))]),
  ) as Record<BaseRole, string[]>;

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    baseRole: u.baseRole,
    active: u.active,
    note: u.note,
    selectedTabs: effectiveVisibleTabs(u.baseRole, u.extraTabs, u.removedTabs).filter((t) => grantKeys.has(t)),
  }));
  const roleOptions = BASE_ROLES.map((r) => ({ value: r, label: BASE_ROLE_LABEL[r] }));

  return (
    <Card>
      <SectionHeader
        eyebrow="Admin"
        title="Users & access"
        right={<span className="text-[11px] text-ink-faint">{rows.length} managed users</span>}
      />
      <div className="px-5 pb-5 pt-4">
        <p className="text-[12.5px] leading-snug text-ink-soft">
          Add, edit or disable dashboard logins and set each person&apos;s access — a{' '}
          <span className="font-medium text-ink-soft">base role</span> plus the exact{' '}
          <span className="font-medium text-ink-soft">tabs</span> they can see. Password changes take effect on next login;
          role/tab changes apply immediately.{' '}
          <span className="text-ink-faint">
            Admin &amp; Viewer are configured via environment variables and aren&apos;t listed here.
          </span>
        </p>
        <UsersClient users={rows} grantable={grantable} baseDefaults={baseDefaults} roleOptions={roleOptions} />
      </div>
    </Card>
  );
}
