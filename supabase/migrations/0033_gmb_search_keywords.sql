-- 0033 · gmb_search_keywords — what people typed into Google Search/Maps when
-- the Business Profile appeared, monthly, with impression counts.
--
-- The local-search equivalent of the Search Console query list: Google's
-- Business Profile Performance API reports the terms per month. Counts under
-- Google's privacy threshold arrive as a ceiling ("<15") — stored with
-- is_threshold = true so the UI can say "<15" instead of pretending precision.
--
-- Applied to production via MCP (apply_migration).

create table if not exists lane_e.gmb_search_keywords (
  month text not null,                  -- "2026-07"
  keyword text not null,
  location_path text not null,          -- "locations/{id}"
  impressions int not null,
  is_threshold boolean not null default false,
  synced_at timestamptz not null default now(),
  primary key (month, keyword, location_path)
);

create index if not exists gmb_search_keywords_month_idx on lane_e.gmb_search_keywords (month desc, impressions desc);

-- Service-role access only, like every lane_e table: RLS on, no policies.
alter table lane_e.gmb_search_keywords enable row level security;
