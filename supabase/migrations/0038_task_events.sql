-- Append-only activity trail for tracked tasks (Smile Club team calendar).
-- Every step moved, status change and note is one row: who, when, from → to.
create table if not exists lane_e.task_events (
  id bigserial primary key,
  task_id text not null references lane_e.tasks(id) on delete cascade,
  at timestamptz not null default now(),
  actor text not null,
  from_stage integer,
  to_stage integer,
  status text,
  note text
);

create index if not exists task_events_task_at_idx on lane_e.task_events (task_id, at desc);
create index if not exists task_events_at_idx on lane_e.task_events (at desc);

alter table lane_e.task_events enable row level security;
