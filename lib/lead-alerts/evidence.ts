import type { LeadChannelFields } from '@/lib/lead-tracker/reporting';

/** Explicit evidence only. Free-text notes and Growth's fallback are excluded. */
export function hasWhatsAppEvidence(row: LeadChannelFields): boolean {
  if (String(row.whatsapp_ref ?? '').trim()) return true;
  return [row.channel_source, row.raw_row?.['Inquiry Platform'], row.raw_row?.['Preferred Channel']]
    .some((value) => /whatsapp|zavis/i.test(String(value ?? '')));
}
