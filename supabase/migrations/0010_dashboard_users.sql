-- Dashboard user directory — powers the admin "Users" tab (add / edit / disable
-- logins and assign access). Replaces the hardcoded staff_password_* → role map
-- with data-driven, per-user access.
--
-- Access model = a base role PLUS per-tab tweaks:
--   base_role    one of admin | viewer | staff | receptionist (the template)
--   extra_tabs   tab keys granted ON TOP of the base role (e.g. clinical-ops, group)
--   removed_tabs tab keys taken away from the base role
-- Effective tabs = visibleTabsFor(base_role) ∪ extra_tabs − removed_tabs.
--
-- Passwords are stored as-is (service-role only, RLS on), mirroring the existing
-- lane_e.app_secrets logins. Admin + Viewer can also stay env-configured
-- (DASHBOARD_PASSWORD / VIEWER_PASSWORD) as always-available system logins.
create table if not exists lane_e.dashboard_users (
  id           bigint generated always as identity primary key,
  name         text    not null,
  password     text    not null,
  base_role    text    not null default 'staff',   -- admin | viewer | staff | receptionist
  extra_tabs   text[]  not null default '{}',
  removed_tabs text[]  not null default '{}',
  active       boolean not null default true,
  note         text,                                -- optional: who this is / email
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table lane_e.dashboard_users enable row level security;  -- service-role only, mirrors other lane_e tables

create unique index if not exists dashboard_users_name_key on lane_e.dashboard_users (name);

comment on table lane_e.dashboard_users is
  'Dashboard logins for the admin Users tab. base_role + extra_tabs − removed_tabs = the tabs a user sees. Passwords stored service-role-only (RLS on), like lane_e.app_secrets.';
