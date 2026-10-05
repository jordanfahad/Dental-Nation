-- Lead clicks by phone (5 Oct): day × event (whatsapp_click, phone_click,
-- generate_lead) × OS × device × brand × model × channel. Shows which phones
-- the website's WhatsApp and phone taps come from. Aggregate only.
create table if not exists lane_e.ga4_lead_devices (
  day date not null,
  event_name text not null,
  os text not null,
  device text not null,
  brand text not null,
  model text not null,
  channel text not null,
  events integer not null default 0,
  fetched_at timestamptz not null default now(),
  primary key (day, event_name, os, device, brand, model, channel)
);

alter table lane_e.ga4_lead_devices enable row level security;
