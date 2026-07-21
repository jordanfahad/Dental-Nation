-- Migrate the existing app_secrets logins into lane_e.dashboard_users. Run AFTER
-- 0010_dashboard_users.sql. Idempotent (on conflict on name → do nothing), and
-- it pulls each password straight from app_secrets so no credential is written
-- into this file.
--
--   Dr Luvi  → staff + Clinical Operations + Group Revenue
--   Gautam   → staff + Clinical Operations
--   La Dayag → receptionist (Clinical Operations only)
--
-- Admin + Viewer stay env-configured (DASHBOARD_PASSWORD / VIEWER_PASSWORD) as
-- always-available system logins, so they are intentionally NOT seeded here.
insert into lane_e.dashboard_users (name, password, base_role, extra_tabs, note)
select v.name, s.value, v.base_role, v.extra_tabs, v.note
from (values
  ('Dr Luvi',  'staff_password_luvi',           'staff',        array['clinical-ops','group']::text[], 'migrated from staff_password_luvi'),
  ('Gautam',   'staff_password_gautam',         'staff',        array['clinical-ops']::text[],         'migrated from staff_password_gautam'),
  ('La Dayag', 'receptionist_password_ladayag', 'receptionist', array[]::text[],                       'reception desk')
) as v(name, secret_key, base_role, extra_tabs, note)
join lane_e.app_secrets s on s.key = v.secret_key
on conflict (name) do nothing;
