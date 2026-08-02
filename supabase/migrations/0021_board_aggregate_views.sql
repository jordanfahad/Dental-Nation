-- Board report — AGGREGATE-ONLY read surface (build spec §2 hard requirement).
--
-- 🔒 WHY THIS IS A VIEW AND NOT AN APP-LAYER FILTER
--
-- The board link (/share/growth/[token]) is public: no login, forwardable to
-- investors. The underlying tables are full of UAE patient health data —
-- lane_e.crm_appointments carries patient_name and patient_phone,
-- practo_appointments_raw carries mr_no, and the growth read layer's
-- `mvmSelection.keys` is literally a list of patient identifiers.
--
-- So the share path is not allowed to touch those tables at all. It reads THIS
-- view, which can only ever emit counts, sums and dates — there is no column
-- here that could carry a name, a phone number, a message body or an
-- appointment-level record, no matter what the UI above it does. A future edit
-- to a component cannot leak PII through this surface, because the surface has
-- none to give.
--
-- One row per calendar month. Missing data stays NULL — the report renders a
-- visible "Data pending" state rather than a zero that reads as a real result.

create or replace view lane_e.board_monthly_kpis as
with bounds as (
  select
    least(
      coalesce((select min(date) from lane_e.meta_insights_raw), current_date),
      coalesce((select min(date) from lane_e.google_ads_insights_raw), current_date)
    ) as lo,
    greatest(
      coalesce((select max(date) from lane_e.meta_insights_raw), current_date),
      coalesce((select max(date) from lane_e.google_ads_insights_raw), current_date),
      current_date
    ) as hi
),
spine as (
  select generate_series(
           date_trunc('month', (select lo from bounds)),
           date_trunc('month', (select hi from bounds)),
           interval '1 month'
         )::date as month
),
meta as (
  select date_trunc('month', date)::date as month,
         sum(spend)       as spend,
         sum(impressions) as impressions,
         sum(clicks)      as clicks,
         sum(leads)       as leads
    from lane_e.meta_insights_raw
   group by 1
),
gads as (
  select date_trunc('month', date)::date as month,
         sum(spend)       as spend,
         sum(impressions) as impressions,
         sum(clicks)      as clicks,
         sum(conversions) as conversions
    from lane_e.google_ads_insights_raw
   group by 1
),
appts as (
  -- Practo is the booking system of record. Statuses are title-case here
  -- (Arrived / Completed / Noshow / Cancel); lower() keeps this resilient.
  select date_trunc('month', appt_date)::date as month,
         count(*)                                                              as booked,
         count(*) filter (where lower(status) in ('arrived', 'completed'))      as showed,
         count(*) filter (where lower(status) = 'noshow')                       as noshow,
         count(*) filter (where lower(status) like 'cancel%')                   as cancelled
    from lane_e.practo_appointments_raw
   where appt_date is not null
   group by 1
),
bills as (
  select date_trunc('month', bill_date)::date as month,
         sum(amount)         as revenue,
         count(*)            as bill_count
    from lane_e.practo_bills_raw
   where bill_date is not null
   group by 1
)
select
  s.month,
  -- Spend: null only when NEITHER platform reported that month.
  case when m.spend is null and g.spend is null then null
       else coalesce(m.spend, 0) + coalesce(g.spend, 0) end                     as spend_total,
  m.spend                                                                       as spend_meta,
  g.spend                                                                       as spend_google,
  case when m.impressions is null and g.impressions is null then null
       else coalesce(m.impressions, 0) + coalesce(g.impressions, 0) end        as impressions,
  case when m.clicks is null and g.clicks is null then null
       else coalesce(m.clicks, 0) + coalesce(g.clicks, 0) end                  as clicks,
  m.leads                                                                       as meta_leads,
  g.conversions                                                                 as google_conversions,
  a.booked                                                                      as appts_booked,
  a.showed                                                                      as appts_showed,
  a.noshow                                                                      as appts_noshow,
  a.cancelled                                                                   as appts_cancelled,
  b.revenue                                                                     as revenue,
  b.bill_count                                                                  as bill_count
from spine s
left join meta  m on m.month = s.month
left join gads  g on g.month = s.month
left join appts a on a.month = s.month
left join bills b on b.month = s.month
order by s.month;

comment on view lane_e.board_monthly_kpis is
  'AGGREGATE-ONLY monthly KPI surface for the public board share link. Counts, sums and dates only — structurally incapable of emitting patient names, phone numbers or appointment-level records. The /share/* routes must read this and never the underlying tables.';

-- ── Daily grain ─────────────────────────────────────────────────────────────
-- Same guarantee, day-by-day, so the board view's date-range presets ("last 30
-- days vs. prior 30", quarter-over-quarter, custom range) can compute real
-- windowed totals and deltas instead of snapping to whole months.

create or replace view lane_e.board_daily_kpis as
with bounds as (
  select
    least(
      coalesce((select min(date) from lane_e.meta_insights_raw), current_date),
      coalesce((select min(date) from lane_e.google_ads_insights_raw), current_date)
    ) as lo,
    greatest(
      coalesce((select max(date) from lane_e.google_ads_insights_raw), current_date),
      current_date
    ) as hi
),
spine as (
  select generate_series((select lo from bounds), (select hi from bounds), interval '1 day')::date as day
),
meta as (
  select date as day, sum(spend) spend, sum(impressions) impressions, sum(clicks) clicks, sum(leads) leads
    from lane_e.meta_insights_raw group by 1
),
gads as (
  select date as day, sum(spend) spend, sum(impressions) impressions, sum(clicks) clicks, sum(conversions) conversions
    from lane_e.google_ads_insights_raw group by 1
),
appts as (
  select appt_date as day,
         count(*) booked,
         count(*) filter (where lower(status) in ('arrived','completed')) showed,
         count(*) filter (where lower(status) = 'noshow') noshow,
         count(*) filter (where lower(status) like 'cancel%') cancelled
    from lane_e.practo_appointments_raw where appt_date is not null group by 1
),
bills as (
  select bill_date as day, sum(amount) revenue, count(*) bill_count
    from lane_e.practo_bills_raw where bill_date is not null group by 1
)
select
  s.day,
  case when m.spend is null and g.spend is null then null
       else coalesce(m.spend,0) + coalesce(g.spend,0) end as spend_total,
  m.spend as spend_meta,
  g.spend as spend_google,
  case when m.impressions is null and g.impressions is null then null
       else coalesce(m.impressions,0) + coalesce(g.impressions,0) end as impressions,
  case when m.clicks is null and g.clicks is null then null
       else coalesce(m.clicks,0) + coalesce(g.clicks,0) end as clicks,
  m.leads as meta_leads,
  g.conversions as google_conversions,
  a.booked as appts_booked,
  a.showed as appts_showed,
  a.noshow as appts_noshow,
  a.cancelled as appts_cancelled,
  b.revenue as revenue,
  b.bill_count as bill_count
from spine s
left join meta  m on m.day = s.day
left join gads  g on g.day = s.day
left join appts a on a.day = s.day
left join bills b on b.day = s.day
order by s.day;

comment on view lane_e.board_daily_kpis is
  'AGGREGATE-ONLY daily KPI surface for the public board share link (date-range presets and deltas compute from this). Counts, sums and dates only — no patient-identifying column exists here by construction.';
