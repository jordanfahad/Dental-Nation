-- CRM / WhatsApp aggregates for the board report (2 Aug 2026).
--
-- The WhatsApp figures were originally going to be typed in by hand. They
-- don't need to be: the Zavis export already lands in lane_e.crm_* every sync,
-- so the board report reads them live and they can never go stale.
--
-- Same PII guarantee as 0021 — counts and dates only. crm_appointments carries
-- patient_name and patient_phone; nothing of that shape can pass through this
-- view, so it stays safe for the public /share route.

create or replace view lane_e.board_crm_summary as
with s as (
  select period_start, period_end, conversations, messages_received, messages_sent,
         avg_first_response_hours
    from lane_e.crm_conversation_summary
   order by period_end desc nulls last
   limit 1
),
inbox as (
  select
    sum(conversations) filter (where lower(inbox_type) = 'whatsapp')  as whatsapp_conversations,
    sum(conversations) filter (where lower(inbox_type) = 'instagram') as instagram_conversations,
    sum(conversations)                                                as all_inbox_conversations,
    count(*) filter (where lower(inbox_type) = 'whatsapp' and conversations > 0) as whatsapp_inboxes
  from lane_e.crm_inbox_report
),
appts as (
  -- Booking ORIGIN, not channel: Practo records source as platform | widget |
  -- crm | aiAgent. There is no "WhatsApp" source, so the report never claims
  -- one — it reports what the field actually says.
  select
    count(*) filter (where source in ('crm','aiAgent') and not coalesce(is_test,false)) as crm_originated_bookings,
    count(*) filter (where source = 'aiAgent' and not coalesce(is_test,false))          as ai_agent_bookings,
    count(*) filter (where source = 'widget'  and not coalesce(is_test,false))          as widget_bookings,
    count(*) filter (where not coalesce(is_test,false))                                  as all_bookings
  from lane_e.crm_appointments
)
select
  s.period_start, s.period_end,
  s.conversations as total_conversations,
  s.messages_received,
  s.messages_sent,
  s.avg_first_response_hours,
  i.whatsapp_conversations,
  i.instagram_conversations,
  i.all_inbox_conversations,
  i.whatsapp_inboxes,
  a.crm_originated_bookings,
  a.ai_agent_bookings,
  a.widget_bookings,
  a.all_bookings
from s cross join inbox i cross join appts a;

comment on view lane_e.board_crm_summary is
  'AGGREGATE-ONLY Zavis CRM summary for the board report: conversation and message counts by channel plus booking counts by origin. No patient-identifying column exists here by construction.';
