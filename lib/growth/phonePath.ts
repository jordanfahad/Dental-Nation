import { PHONE_PATH_BENCHMARKS as B } from '../../config/growth-channels';

export interface PhoneInputs { callTaps: number; websiteWhatsappTaps: number; websitePhoneTaps: number }
const count = (n: number) => Number.isFinite(n) && n > 0 ? n : 0;

/** Round each measured input once, then apportion a pool cap by largest remainder.
 * The three displayed contributions always add to the displayed booking total.
 */
export function modelPhoneBookings(inputs: PhoneInputs, pool = Number.MAX_SAFE_INTEGER) {
  const callTaps = count(inputs.callTaps), websiteWhatsappTaps = count(inputs.websiteWhatsappTaps), websitePhoneTaps = count(inputs.websitePhoneTaps);
  const phoneRate = B.validTapRate * B.answerRate * B.patientRate * B.bookingRate;
  const whatsappRate = B.validTapRate * B.patientRate * B.bookingRate;
  const raw = [callTaps * phoneRate, websiteWhatsappTaps * whatsappRate, websitePhoneTaps * phoneRate];
  const rounded = raw.map(Math.round);
  const estBookings = rounded.reduce((a, n) => a + n, 0);
  const untracedPool = Math.floor(count(pool));
  const estBookingsReconciled = Math.min(estBookings, untracedPool);
  const shares = rounded.map((n) => estBookings ? n * estBookingsReconciled / estBookings : 0);
  const parts = shares.map(Math.floor);
  const rank = shares.map((n, i) => ({ i, fraction: n - parts[i] })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  const left = estBookingsReconciled - parts.reduce((a, n) => a + n, 0);
  for (let i = 0; i < left; i++) parts[rank[i].i]++;
  const estValidTaps = (callTaps + websitePhoneTaps + websiteWhatsappTaps) * B.validTapRate;
  const estAnswered = (callTaps + websitePhoneTaps) * B.validTapRate * B.answerRate;
  const estPatientCalls = (estAnswered + websiteWhatsappTaps * B.validTapRate) * B.patientRate;
  return { callTaps, websiteWhatsappTaps, websitePhoneTaps, estBookings, untracedPool, estBookingsReconciled,
    estValidTaps: Math.round(estValidTaps), estAnswered: Math.round(estAnswered), estPatientCalls: Math.round(estPatientCalls),
    bookingParts: { adCalls: parts[0], websiteWhatsapp: parts[1], websitePhone: parts[2] } };
}
export type PhoneModel = ReturnType<typeof modelPhoneBookings>;

export function phonePathSentence(pp: PhoneModel): string {
  const p = pp.bookingParts;
  return `Modelled bookings from Google Ads: ${pp.estBookingsReconciled} = ${p.adCalls} from ad call taps + ${p.websiteWhatsapp} from website WhatsApp taps + ${p.websitePhone} from website phone taps, drawn from the ${pp.untracedPool} untraced Dental Nation patients in the eligible desk booking pool.`;
}

export function websitePaidInputs(rows: { event_name: string; source_medium: string; event_count: number }[]) {
  let websiteWhatsappTaps = 0, websitePhoneTaps = 0;
  for (const row of rows) {
    if (!/^google\s*\/\s*cpc$/i.test(row.source_medium.trim())) continue;
    // Widget opens and generate_lead are stored for context, never added to taps.
    if (row.event_name === 'whatsapp_click') websiteWhatsappTaps += count(Number(row.event_count));
    if (row.event_name === 'phone_click') websitePhoneTaps += count(Number(row.event_count));
  }
  return { websiteWhatsappTaps, websitePhoneTaps };
}
