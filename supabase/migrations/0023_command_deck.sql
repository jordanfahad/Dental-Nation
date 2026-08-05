-- Command Deck (build spec v3) — board/investor instrument one-pager.
--
-- Adds the AGGREGATE-ONLY views behind the revenue waterfall, the journey
-- strip and the status lights, seeds the module registry, and gives each
-- share link per-module toggles. Applied to production 5 Aug 2026.
--
-- Same rule as migration 0021: counts, sums and dates only. The /share/*
-- routes read these views and never the underlying tables, which carry
-- patient names, phone numbers and mr_no.
--
-- (deck_modules and report_share_links.view were created ahead of this
-- migration; every statement below is written to be re-runnable.)

alter table lane_e.report_share_links add column if not exists sections jsonb;
alter table lane_e.report_share_links alter column view set default 'command_deck';
update lane_e.report_share_links set view = 'funnel' where view is null;

comment on column lane_e.report_share_links.view is
  'Which board-facing view this link renders: command_deck (the instrument one-pager) or funnel (the storytelling report). Links minted before the Command Deck were backfilled to funnel.';
comment on column lane_e.report_share_links.sections is
  'Optional per-link module toggles: {"module_key": false} hides that Command Deck module on this link.';

-- ── Module registry — the car gets new instruments without a rebuild ────────
insert into lane_e.deck_modules (key, title, status, sort, enabled, source_note) values
  ('website',    'Website',                     'LIVE',         1,  true, 'GA4 sessions · booking-widget submissions'),
  ('widget',     'Booking widget',              'LIVE',         2,  true, 'Widget submissions · 15-minute availability monitor'),
  ('seo',        'SEO / Organic',               'PENDING_DATA', 3,  true, 'Search Console access pending — impressions and clicks arrive with it'),
  ('google_ads', 'Google Ads',                  'LIVE',         4,  true, 'Google Ads API — spend, clicks, conversions'),
  ('meta',       'Meta — Facebook & Instagram', 'LIVE',         5,  true, 'Meta Marketing API — spend, clicks, lead events'),
  ('crm',        'CRM / Marketing OS',          'LIVE',         6,  true, 'Zavis CRM — conversations and booking origin'),
  ('smile_club', 'Smile Club',                  'PENDING_DATA', 7,  true, 'Membership plan live; member and MRR feed pending'),
  ('voice',      'Voice agent',                 'RD',           8,  true, 'Infrastructure live, in development'),
  ('creative',   'Creative engine',             'PENDING_DATA', 9,  true, 'In-house asset production; output feed pending'),
  ('partner',    'Partner campaigns',           'PENDING_DATA', 10, true, 'Affiliate delivery — reconciliation feed pending')
on conflict (key) do update
  set title = excluded.title, status = excluded.status,
      sort = excluded.sort, source_note = excluded.source_note;

-- ── Component revenue — the waterfall's data ────────────────────────────────
-- Attribution: BOOKING ORIGIN per patient from the CRM's own source field,
-- joined to billed revenue through the practice-management record
-- (bill -> mr_no -> phone -> CRM origin). Digital routes win over the clinic
-- default (widget > AI agent > CRM); otherwise direct, or no CRM record.
--
-- HONESTY: paid media and organic search are deliberately absent. There is no
-- click-to-patient identity chain, so no bill can truthfully be assigned to
-- them; the deck shows those as "leads only — revenue attribution pending"
-- instead of inventing a share. These bars sum to total billed revenue.
create or replace view lane_e.board_component_revenue as
with bill as (
  select bill_key, data->>'mr_no' as mr_no, bill_date, coalesce(amount, 0) as amt
    from lane_e.practo_bills_raw where bill_date is not null
),
mr_phone as (
  select mr_no, min(right(regexp_replace(patient_phone, '\D', '', 'g'), 9)) as ph
    from lane_e.practo_appointments_raw
   where mr_no is not null and patient_phone is not null
     and length(regexp_replace(patient_phone, '\D', '', 'g')) >= 9
   group by 1
),
ph_src as (
  select right(regexp_replace(patient_phone, '\D', '', 'g'), 9) as ph,
         min(case source when 'widget' then 1 when 'aiAgent' then 2 when 'crm' then 3 else 9 end) as rnk
    from lane_e.crm_appointments
   where coalesce(is_test, false) = false and patient_phone is not null
     and length(regexp_replace(patient_phone, '\D', '', 'g')) >= 9
   group by 1
)
select b.bill_date as day,
       case s.rnk when 1 then 'widget' when 2 then 'ai_agent' when 3 then 'crm'
                  when 9 then 'direct' else 'unattributed' end as component,
       count(*) as bills,
       sum(b.amt) as revenue
  from bill b
  left join mr_phone m on m.mr_no = b.mr_no
  left join ph_src   s on s.ph    = m.ph
 group by 1, 2;

comment on view lane_e.board_component_revenue is
  'AGGREGATE-ONLY billed revenue per acquisition component per day for the Command Deck waterfall. Bars sum to total billed revenue; channels with no identity chain are absent rather than estimated.';

-- ── Journey strip — one row per day, six stages ─────────────────────────────
create or replace view lane_e.board_deck_daily as
with widget as (
  select to_date(split_part(data->>'Timestamp', ',', 1), 'MM/DD/YYYY') as day,
         count(*) as widget_enquiries
    from lane_e.raw_zavis
   where (data ? 'Full Name' or data ? 'Phone Number')
     and data->>'Timestamp' ~ '^\d{2}/\d{2}/\d{4}'
     and coalesce(data->>'Email', '')             !~* '(zavis|test)'
     and coalesce(data->>'Full Name', '')         !~* '(test|sagar)'
     and coalesce(data->>'Booking Reference', '') !~* '^BK'
   group by 1
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
  select appt_date as day, count(*) booked,
         count(*) filter (where lower(status) in ('arrived','completed')) showed,
         count(*) filter (where lower(status) = 'noshow') noshow,
         count(*) filter (where lower(status) like 'cancel%') cancelled
    from lane_e.practo_appointments_raw where appt_date is not null group by 1
),
bills as (
  select bill_date as day, sum(amount) revenue, count(*) treatments
    from lane_e.practo_bills_raw where bill_date is not null group by 1
),
spine as (
  select day from widget union select day from meta union select day from gads
  union select day from appts union select day from bills
)
select s.day,
       case when m.impressions is null and g.impressions is null then null
            else coalesce(m.impressions,0) + coalesce(g.impressions,0) end as impressions,
       case when m.clicks is null and g.clicks is null then null
            else coalesce(m.clicks,0) + coalesce(g.clicks,0) end           as clicks,
       case when m.spend is null and g.spend is null then null
            else coalesce(m.spend,0) + coalesce(g.spend,0) end             as spend_total,
       m.spend as spend_meta, g.spend as spend_google,
       m.impressions as impressions_meta, g.impressions as impressions_google,
       m.clicks as clicks_meta, g.clicks as clicks_google,
       m.leads as meta_leads, g.conversions as google_conversions,
       w.widget_enquiries,
       case when w.widget_enquiries is null and m.leads is null and g.conversions is null then null
            else coalesce(w.widget_enquiries,0) + coalesce(m.leads,0) + coalesce(g.conversions,0) end as enquiries_total,
       a.booked, a.showed, a.noshow, a.cancelled,
       b.treatments, b.revenue
  from spine s
  left join widget w on w.day = s.day
  left join meta   m on m.day = s.day
  left join gads   g on g.day = s.day
  left join appts  a on a.day = s.day
  left join bills  b on b.day = s.day
 where s.day is not null;

comment on view lane_e.board_deck_daily is
  'AGGREGATE-ONLY daily surface for the Command Deck journey strip and module headlines. Counts, sums and dates only.';

-- ── Availability + site uptime, daily ───────────────────────────────────────
create or replace view lane_e.board_deck_uptime as
select (checked_at at time zone 'UTC')::date as day,
       count(*) filter (where conclusive is not false)        as checks,
       count(*) filter (where conclusive is not false and ok) as ok_checks,
       count(*) filter (where site_ok is not null)            as site_checks,
       count(*) filter (where site_ok)                        as site_ok_checks
  from lane_e.widget_health
 group by 1;

comment on view lane_e.board_deck_uptime is
  'AGGREGATE-ONLY daily uptime counts from the 15-minute availability monitor. Powers the Command Deck status lights.';
