-- Smile Club scheduled email alerts (24 Sep): one row per alert per Dubai day,
-- so the 15-minute cron sends each alert at most once a day.
create table if not exists lane_e.sc_alert_log (
  id bigserial primary key,
  kind text not null,
  day date not null,
  sent_at timestamptz not null default now(),
  ok boolean not null,
  recipients text[] not null default '{}',
  note text,
  unique (kind, day)
);

alter table lane_e.sc_alert_log enable row level security;
