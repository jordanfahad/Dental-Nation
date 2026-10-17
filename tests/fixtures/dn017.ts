import { sheetMapping } from '../../config/sheet-mapping';
import type { AlertLead } from '../../lib/lead-alerts/emails';

export const syntheticLead = (id: string, fields: Partial<AlertLead> = {}): AlertLead => ({
  id, clinic: 'Al Wasl', channel_source: null, whatsapp_ref: null, raw_row: {}, ...fields,
});
export function receptionLeads() {
  const row = (id: string, inquiry_date: string, fields = {}) => ({ ...syntheticLead(id), inquiry_date,
    source_sheet: sheetMapping.leadTracker.label, booking_status: null, synced_at: '2026-10-12T04:15:00Z', ...fields });
  return [
    row('synthetic-reception-a', '2026-10-11', { raw_row: { 'Source Type': 'Facebook', 'Inquiry Platform': 'WhatsApp' }, booking_status: 'booked' }),
    row('synthetic-reception-b', '2026-10-11', { channel_source: 'Google', booking_status: ' confirmed ' }),
    row('synthetic-reception-c', '2026-10-11'),
    row('synthetic-reception-d', '2026-10-01', { channel_source: 'Walk in', booking_status: 'completed' }),
    row('synthetic-reception-e', '2026-09-30'),
    row('synthetic-reception-f', '2027-07-01', { synced_at: '2026-10-12T05:30:00Z' }),
    row('synthetic-reception-g', '2026-10-12'),
    row('synthetic-other-source', '2026-10-11', { source_sheet: 'Synthetic other sheet', synced_at: '2026-10-12T06:00:00Z' }),
  ];
}
