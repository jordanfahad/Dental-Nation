-- DN-029. Applied to production 21 Oct 2026 by Claude after QA (functions as single-statement SQL).
-- Aggregate counts only. Website team verdicts must never enter leads.
create table lane_e.website_review_snapshot (
  id text primary key check (id = 'website'),
  available boolean not null default false,
  synced_at timestamptz not null default now(),
  days jsonb not null default '[]'::jsonb check (jsonb_typeof(days) = 'array'),
  lease_token uuid,
  lease_until timestamptz
);
alter table lane_e.website_review_snapshot enable row level security;
revoke all on lane_e.website_review_snapshot from public, anon, authenticated;
grant select, insert, update on lane_e.website_review_snapshot to service_role;

insert into lane_e.website_review_snapshot (id) values ('website');

-- A manual sync and cron may overlap on different workers. Serialize the
-- read/append/readback sequence so both cannot append the same enquiry.
create function lane_e.claim_website_mirror(p_token uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with claimed as (
    update lane_e.website_review_snapshot
      set lease_token = p_token, lease_until = now() + interval '30 minutes'
      where id = 'website' and (lease_until is null or lease_until < now())
      returning 1
  )
  select exists (select 1 from claimed)
$$;
create function lane_e.release_website_mirror(p_token uuid)
returns void language sql security invoker set search_path = '' as $$
  update lane_e.website_review_snapshot set lease_token = null, lease_until = null
    where id = 'website' and lease_token = p_token
$$;
revoke all on function lane_e.claim_website_mirror(uuid), lane_e.release_website_mirror(uuid) from public, anon, authenticated;
grant execute on function lane_e.claim_website_mirror(uuid), lane_e.release_website_mirror(uuid) to service_role;
