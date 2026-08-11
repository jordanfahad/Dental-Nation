-- 0032 · gmb_reviews — every Google review on the Business Profile, verbatim.
--
-- The Performance API gives counts (calls, directions, views); reviews come
-- from the My Business v4 API and carry the reviewer's public name, the star
-- rating, the text, and our reply (if any). Synced by the hourly cron via the
-- same OAuth credentials as the GMB performance pull; upserted by review_id so
-- edits and late replies update in place.
--
-- Applied to production via MCP (apply_migration).

create table if not exists lane_e.gmb_reviews (
  review_id text primary key,
  location_path text not null,          -- "locations/{id}"
  location_label text,                  -- human label from gmb_location_labels
  reviewer_name text,                   -- public display name on Google
  rating int not null check (rating between 1 and 5),
  comment text,                         -- review text (null = rating only)
  create_time timestamptz not null,
  update_time timestamptz,
  reply_comment text,                   -- our published reply, if any
  reply_time timestamptz,
  synced_at timestamptz not null default now()
);

create index if not exists gmb_reviews_created_idx on lane_e.gmb_reviews (create_time desc);

-- Service-role access only, like every lane_e table: RLS on, no policies.
alter table lane_e.gmb_reviews enable row level security;
