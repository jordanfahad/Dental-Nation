-- DN-017. Additive, service-role-only state. Apply after review; not run by Codex.
begin;
create table lane_e.lead_alert_seen (
  id text primary key,
  first_seen_at timestamptz not null default now(),
  alerted_at timestamptz
);
-- Separate durable claims preserve the seen-table contract. A failed/uncertain
-- transport keeps its claim, like performance_email_claims, without falsely
-- setting alerted_at. A rolling interval uses claims AND successful send times.
create table lane_e.lead_alert_claims (
  id text primary key references lane_e.lead_alert_seen(id),
  claimed_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table lane_e.lead_alert_seen enable row level security;
alter table lane_e.lead_alert_claims enable row level security;
revoke all on lane_e.lead_alert_seen, lane_e.lead_alert_claims from public, anon, authenticated;
grant all on lane_e.lead_alert_seen, lane_e.lead_alert_claims to service_role;

-- One transaction seeds ALL current lead ids, including non-WhatsApp rows.
-- With no leads yet, subsequent runs continue seeding until history exists.
create function lane_e.seed_lead_alert_seen()
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(480017);
  if exists (select 1 from lane_e.lead_alert_seen) then return false; end if;
  insert into lane_e.lead_alert_seen (id, alerted_at)
    select id, now() from lane_e.leads;
  return true;
end;
$$;

-- Serialize the rolling throttle and per-lead claims across cron invocations.
-- Already claimed rows are excluded even if transport failed or marking failed.
create function lane_e.claim_lead_alerts(lead_ids text[], min_interval_minutes integer)
returns text[] language plpgsql security invoker set search_path = '' as $$
declare last_attempt timestamptz; claimed_ids text[];
begin
  if min_interval_minutes < 0 or min_interval_minutes is null then
    raise exception 'Invalid lead alert interval';
  end if;
  perform pg_advisory_xact_lock(480017);
  select max(greatest(c.claimed_at, c.sent_at)) into last_attempt from lane_e.lead_alert_claims c;
  if last_attempt > now() - make_interval(mins => min_interval_minutes) then return '{}'::text[]; end if;
  -- A scalar array avoids PostgREST's row limit truncating a large claimed batch.
  with claimed as (
    insert into lane_e.lead_alert_claims (id)
      select s.id from lane_e.lead_alert_seen s
      where s.id = any(lead_ids) and s.alerted_at is null
        and not exists (select 1 from lane_e.lead_alert_claims c where c.id = s.id)
      returning lead_alert_claims.id
  ) select coalesce(array_agg(c.id), '{}'::text[]) into claimed_ids from claimed c;
  return claimed_ids;
end;
$$;

create function lane_e.mark_lead_alerts_sent(lead_ids text[])
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(480017);
  update lane_e.lead_alert_claims set sent_at = now()
    where id = any(lead_ids) and sent_at is null;
  update lane_e.lead_alert_seen s set alerted_at = c.sent_at
    from lane_e.lead_alert_claims c
    where s.id = c.id and s.id = any(lead_ids) and c.sent_at is not null;
end;
$$;
revoke all on function lane_e.seed_lead_alert_seen(), lane_e.claim_lead_alerts(text[], integer), lane_e.mark_lead_alerts_sent(text[]) from public, anon, authenticated;
grant execute on function lane_e.seed_lead_alert_seen(), lane_e.claim_lead_alerts(text[], integer), lane_e.mark_lead_alerts_sent(text[]) to service_role;
commit;
