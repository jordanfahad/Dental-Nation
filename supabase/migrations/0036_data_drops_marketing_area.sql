-- Data drops now also log marketing artefacts (vendor call summaries etc.).
alter table lane_e.data_drops drop constraint if exists data_drops_area_check;
alter table lane_e.data_drops
  add constraint data_drops_area_check
  check (area = any (array['finance'::text, 'operations'::text, 'marketing'::text]));
