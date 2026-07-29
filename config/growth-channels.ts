/**
 * Growth Platform — the channel taxonomy the CEO's whiteboard sketch describes:
 * every route a patient can arrive by, grouped Paid / Organic / Referral /
 * Collaboration / Retention, each mapped down one funnel (visibility →
 * enquiry → booked → showed → treated → revenue).
 *
 * PLAIN module (no 'server-only'): imported by the pure attribution engine and
 * by client components that render the tree.
 *
 * Design rule: channels exist in the taxonomy even when we can't attribute to
 * them yet (influencer, affiliates). The CEO asked for the full tree; an
 * untracked lane renders as "not tracked yet", never as a silent omission —
 * that is what tells him where tracking must be built next.
 */

export type ChannelGroupKey = 'paid' | 'organic' | 'referral' | 'collab' | 'retention';

export interface ChannelGroup {
  key: ChannelGroupKey;
  label: string;
  /** The funnel stage this group primarily feeds (CEO sketch language). */
  funnelRole: string;
}

export const CHANNEL_GROUPS: ChannelGroup[] = [
  { key: 'paid', label: 'Paid', funnelRole: 'Visibility → Conversion' },
  { key: 'organic', label: 'Organic', funnelRole: 'Visibility → Consideration' },
  { key: 'referral', label: 'Referral', funnelRole: 'Consideration → Booking' },
  { key: 'collab', label: 'Collaboration', funnelRole: 'Brand awareness → Booking' },
  { key: 'retention', label: 'Retention', funnelRole: 'Repeat visits → Revenue' },
];

export interface ChannelDef {
  key: string;
  group: ChannelGroupKey;
  label: string;
  /** One-line description in CEO language (what this route actually is). */
  detail: string;
  /** True when no data source can currently feed this channel. */
  untracked?: boolean;
}

export const CHANNELS: ChannelDef[] = [
  // ── Paid ──────────────────────────────────────────────────────────────────
  {
    key: 'paid-search',
    group: 'paid',
    label: 'Google Ads (Search)',
    detail: 'Patients searching on Google who clicked a paid ad.',
  },
  {
    key: 'paid-social',
    group: 'paid',
    label: 'Paid Social / Campaigns',
    detail: 'Meta ads + ArabyAds campaign lanes (Glow Up, SOS, Scan) landing on the booking widget or lead forms.',
  },
  // ── Organic ───────────────────────────────────────────────────────────────
  {
    key: 'website',
    group: 'organic',
    label: 'Website (SEO + widget)',
    detail: 'Found the site organically and booked through the website widget.',
  },
  {
    key: 'gmb',
    group: 'organic',
    label: 'Google Business Profile',
    detail: 'Found the clinic on Google Maps / Search — profile calls, direction requests and walk-ins. The biggest feeder of the Direct bucket until calls are tagged.',
  },
  {
    key: 'social-organic',
    group: 'organic',
    label: 'Social Organic',
    detail: 'Instagram / Facebook enquiries not driven by a paid campaign.',
  },
  {
    key: 'whatsapp',
    group: 'organic',
    label: 'WhatsApp Enquiries',
    detail: 'Enquired directly on the clinic WhatsApp line.',
  },
  {
    key: 'ai-concierge',
    group: 'organic',
    label: 'AI Concierge (Zavis)',
    detail: 'Booked through the AI agent on chat.',
  },
  {
    key: 'direct-walkin',
    group: 'organic',
    label: 'Direct / Walk-in',
    detail: 'New patient with no referral or campaign tag — the default bucket the CEO defined.',
  },
  // ── Referral ──────────────────────────────────────────────────────────────
  {
    key: 'patient-referral',
    group: 'referral',
    label: 'Patient / Family Referral',
    detail: 'Tagged as a patient referral, or shares a phone with an earlier patient file (family).',
  },
  {
    key: 'doctor-referral',
    group: 'referral',
    label: 'Doctor Referral',
    detail: 'Booked on a doctor’s instruction ("as per Dr …") or referred in by a practitioner.',
  },
  // ── Collaboration ─────────────────────────────────────────────────────────
  {
    key: 'influencer',
    group: 'collab',
    label: 'Influencers',
    detail: 'Creator collaborations. Lights up once bookings are tagged "influencer" (or a creator name below).',
    untracked: true,
  },
  {
    key: 'affiliate',
    group: 'collab',
    label: 'Affiliates',
    detail: 'Commission partners. Lights up once bookings carry an affiliate tag.',
    untracked: true,
  },
  {
    key: 'partnership',
    group: 'collab',
    label: 'Partnerships (Smile Club)',
    detail: 'Institutional partners — Smile Club et al. Attributed by partner keywords on the booking or lead.',
  },
  // ── Retention ─────────────────────────────────────────────────────────────
  {
    key: 'retention',
    group: 'retention',
    label: 'Existing Patients',
    detail: 'Returning patients (pre-campaign file series: ORN / MR / MLS / legacy numbers). Not an acquisition channel — kept separate so new-patient economics stay clean.',
  },
];

export const CHANNEL_BY_KEY: ReadonlyMap<string, ChannelDef> = new Map(CHANNELS.map((c) => [c.key, c]));

/**
 * Keyword → channel tags scanned over free-text fields (Practo remarks/
 * complaint, lead-tracker notes). This is the "if we have tagged walkins etc."
 * half of the CEO's logic: reception writes a word, the platform routes the
 * patient. Order matters — first hit wins — and every keyword is lower-case
 * (matching is case-insensitive substring).
 *
 * To onboard a new partner/influencer: add their tag here. Nothing else.
 */
export const TAG_RULES: { channel: string; keywords: string[] }[] = [
  // Partners and referrals first: "smile club (found us on google)" is still a
  // partnership. GMB outranks only the generic walk-in default.
  { channel: 'partnership', keywords: ['smile club', 'smileclub', 'partnership', 'corporate partner'] },
  { channel: 'influencer', keywords: ['influencer', 'creator collab'] },
  { channel: 'affiliate', keywords: ['affiliate'] },
  { channel: 'patient-referral', keywords: ['patient referral', 'referred by patient', 'friend referral', 'family referral', 'referral - patient'] },
  { channel: 'doctor-referral', keywords: ['as per dr', 'as per doctor', 'referred by dr', 'doctor referral', 'dr referral', 'referral - doctor'] },
  // Reception's tag for calls arriving on the ads-only tracking number. Sits
  // above 'gmb' so "google ad" never falls through to the organic Google rule.
  { channel: 'paid-search', keywords: ['google ad', 'google ads', 'ads call', 'ad call', 'adwords'] },
  { channel: 'gmb', keywords: ['google maps', 'google map', 'found on google', 'found us on google', 'google search', 'google business', 'gmb'] },
  { channel: 'direct-walkin', keywords: ['walk in', 'walk-in', 'walkin'] },
];
