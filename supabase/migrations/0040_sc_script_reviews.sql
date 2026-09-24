-- Smile Club script sign-off (25 Sep): Fahad sends each dentist's scripts for
-- review; Ms Shadi, Dr Luvi and Gautam approve, request changes or add input.
-- `hash` pins each decision to the exact wording it was made on.
create table if not exists lane_e.sc_script_reviews (
  id bigserial primary key,
  dentist_id text not null,
  reviewer text not null check (reviewer in ('shadi', 'luvi', 'gautam', 'fahad', 'system')),
  decision text not null check (decision in ('approved', 'changes', 'input', 'sent', 'reminder')),
  note text,
  hash text not null,
  actor text not null,
  at timestamptz not null default now()
);
create index if not exists sc_script_reviews_dentist_idx on lane_e.sc_script_reviews (dentist_id, at);

alter table lane_e.sc_script_reviews enable row level security;
