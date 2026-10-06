/** Synthetic values only. No exported patient or account data. */
import { DEMAND_THEMES, DN_CAMPAIGN_TAB } from '../../config/demand-themes';
import { aggregateDemandToDesk, emptyDemandInput, type DemandInput, type Row } from '../../lib/analytics/demandToDesk';
import { marketKeywords } from '../../lib/analytics/demandMarket';

export const fixtureRange = { from: '2026-09-01', to: '2026-09-30' };
export const adRow = (patch: Row = {}): Row => ({
  key: 'fixture-ad|2026-09-16', account_id: 'fixture-account', ad_id: 'fixture-ad', campaign_id: 'fixture-campaign',
  campaign_name: 'Synthetic aligner campaign', ad_name: 'Synthetic braces creative', adset_name: 'Synthetic ad set',
  date: '2026-09-16', spend: 100, impressions: 1000, fetched_at: '2026-10-01T00:00:00Z',
  data: { reach: 500, adset_id: 'fixture-adset', actions: [
    { action_type: 'lead', value: '10' },
    { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '10' },
    { action_type: 'onsite_conversion.total_messaging_connection', value: '10' },
    { action_type: 'onsite_conversion.messaging_user_depth_2_message_send', value: '4' },
  ] }, ...patch,
});
export const trackerRow = (data: Row = {}, id = 1): Row => ({ id, data: {
  _source_tab: DN_CAMPAIGN_TAB, Date: '16.09.2026', 'Inquiry Platform': 'Instagram', 'Source Type': 'Meta',
  'Service / Inquiry Type': 'Braces', 'Patient Name': 'PRIVATE_NAME_SENTINEL', 'Contact Number': 'PRIVATE_PHONE_SENTINEL',
  '1st Follow up': 'interested', ...data,
} });
export function fixtureInput(): DemandInput {
  const input: DemandInput = { ...emptyDemandInput(), ads: [], tracker: [], canonical: [], appointments: [], calls: [], gmb: [], market: {
    version: 1, location: 2784, fetchedAt: '2026-09-29T00:00:00Z', errors: [],
    keywords: (['en', 'ar'] as const).flatMap((language) => marketKeywords(language).map((keyword) => ({ keyword, language, searches: 100, cpcUsd: 2, competition: 50 }))),
  } };
  for (const [index, theme] of DEMAND_THEMES.entries()) {
    const name = theme.keywords.en[0] ?? 'Generic dental question';
    for (const day of [16, 23, 30]) input.ads!.push(adRow({ key: `${theme.key}:${day}`, campaign_id: theme.key, campaign_name: `Synthetic ${name}`, ad_name: name, date: `2026-09-${day}`, adset_name: 'Synthetic launch group' }));
    input.tracker!.push(trackerRow({ 'Service / Inquiry Type': name, '1st Follow up': index % 2 ? 'called NA / sent WhatsApp' : 'interested', '2nd Follow-up': index % 3 ? '' : 'booked' }, index));
    input.appointments!.push({ appt_key: `fixture-${index}`, mr_no: `DN-FIXTURE-${index}`, appt_date: '2026-09-25', status: index % 2 ? 'Cancelled' : 'Completed', data: { complaint: name, patient_name: 'PRIVATE_CLINIC_SENTINEL' } });
  }
  return input;
}
export const fixtureReport = () => aggregateDemandToDesk(fixtureInput(), fixtureRange);
