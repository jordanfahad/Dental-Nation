import { groupOf, performanceChannel } from '@/lib/performance/core';

export interface LeadChannelFields {
  channel_source: string | null;
  whatsapp_ref: string | null;
  raw_row: Record<string, unknown> | null;
}
const text = (value: unknown) => String(value ?? '').trim();

/** Reuse the gross-row classifier; never use the default WhatsApp attribution. */
export function leadGroup(row: LeadChannelFields) {
  const raw = row.raw_row ?? {};
  return groupOf(performanceChannel(text(raw['Source Type']), text(raw['Inquiry Platform']) || text(row.channel_source),
    text(raw['Preferred Channel']), ['Notes / Remarks', 'Follow-up Remarks', 'Follow up Remarks'].map((key) => text(raw[key])).join(' ')));
}

export function hasChannelEvidence(row: LeadChannelFields): boolean {
  const raw = row.raw_row ?? {};
  if (text(row.whatsapp_ref)) return true;
  return [row.channel_source, raw['Source Type'], raw['Inquiry Platform'], raw['Preferred Channel']]
    .some((value) => !!text(value) && !/^(n\/?a|-+|none|not applicable)$/i.test(text(value))) || leadGroup(row) !== 'Unclassified';
}
