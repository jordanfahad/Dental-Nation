-- DN-015. Apply once before deploying the GBP sync/readers. No live execution by Codex.
begin;
create table lane_e.raw_gbp_daily_log (
  row_index integer primary key check (row_index > 1),
  data jsonb not null,
  synced_at timestamptz not null default now()
);
create table lane_e.gbp_daily_sync (
  id integer primary key check (id = 1),
  synced_at timestamptz not null,
  row_count integer not null,
  invalid_count integer not null
);
create table lane_e.performance_notes (
  key text primary key check (key = 'akbar-plan'),
  body text not null default '' check (length(body) <= 6000),
  updated_at timestamptz not null default now()
);
insert into lane_e.performance_notes (key) values ('akbar-plan');
-- A claim is acquired BEFORE transport. Ambiguous transport outcomes are not retried:
-- at-most-once delivery takes precedence over risking a second daily email.
create table lane_e.performance_email_claims (
  kind text not null check (kind in ('am:gbp-daily', 'am:akbar-perf')),
  day date not null,
  claimed_at timestamptz not null default now(),
  primary key (kind, day)
);
alter table lane_e.raw_gbp_daily_log enable row level security;
alter table lane_e.gbp_daily_sync enable row level security;
alter table lane_e.performance_notes enable row level security;
alter table lane_e.performance_email_claims enable row level security;
revoke all on lane_e.raw_gbp_daily_log, lane_e.gbp_daily_sync, lane_e.performance_notes, lane_e.performance_email_claims from anon, authenticated;
grant all on lane_e.raw_gbp_daily_log, lane_e.gbp_daily_sync, lane_e.performance_notes, lane_e.performance_email_claims to service_role;

-- Transactional snapshot replacement; failed imports preserve the last complete log.
create function lane_e.replace_gbp_daily_log(rows jsonb, invalid_count integer)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if jsonb_typeof(rows) <> 'array' or invalid_count < 0 then
    raise exception 'Invalid GBP snapshot';
  end if;
  perform pg_advisory_xact_lock(470015);
  delete from lane_e.raw_gbp_daily_log;
  insert into lane_e.raw_gbp_daily_log (row_index, data)
    select r.row_index, r.data from jsonb_to_recordset(rows) as r(row_index integer, data jsonb);
  insert into lane_e.gbp_daily_sync as s (id, synced_at, row_count, invalid_count)
    values (1, now(), jsonb_array_length(rows), invalid_count)
    on conflict (id) do update set synced_at = excluded.synced_at,
      row_count = excluded.row_count, invalid_count = excluded.invalid_count;
end;
$$;
revoke all on function lane_e.replace_gbp_daily_log(jsonb, integer) from public, anon, authenticated;
grant execute on function lane_e.replace_gbp_daily_log(jsonb, integer) to service_role;
commit;
