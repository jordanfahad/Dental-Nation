-- Bronze mirror for the booking sheet's "Leads" tab — enquiries that started the
-- website booking flow but never completed WhatsApp/OTP verification.
--
-- The existing raw_zavis mirrors the "Bookings" + "Cancellations" tabs, i.e. only
-- VERIFIED bookings. The Leads tab captures the step before that: the widget
-- writes a row as soon as it has contact + treatment details and an OTP is
-- requested. Those people never reach reception today — this table makes them
-- visible so the call centre can work them.
--
-- Same shape as every other bronze table (row_index + jsonb data): the sync
-- truncates and reloads it each run, so no unique keys or upserts are needed.
create table if not exists lane_e.raw_dn_leads (
  id         bigint generated always as identity primary key,
  row_index  int not null,
  data       jsonb not null,
  synced_at  timestamptz not null default now()
);

alter table lane_e.raw_dn_leads enable row level security;  -- service-role read only, mirrors other lane_e tables

comment on table lane_e.raw_dn_leads is
  'Bronze mirror of the booking sheet''s "Leads" tab — website enquiries that requested an OTP but never completed WhatsApp verification (raw_zavis holds the verified ones). Truncate-and-reload each sync.';
