-- Retain removed reviews for history while live readers use removed_at IS NULL.
-- A returning review clears removed_at during its normal upsert.
alter table lane_e.gmb_reviews
  add column if not exists removed_at timestamptz;

create index if not exists gmb_reviews_active_location_idx
  on lane_e.gmb_reviews (location_path, review_id)
  where removed_at is null;
