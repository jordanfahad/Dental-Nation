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
    label: 'Paid Social — Meta',
    detail: 'Meta (Instagram + Facebook) campaigns — WhatsApp leads, call ads, instant forms, awareness. Click to expand by campaign type.',
  },
  // ── Organic ───────────────────────────────────────────────────────────────
  {
    key: 'website',
    group: 'organic',
    label: 'Organic SEO (search engines)',
    detail: 'Found the site via a search engine — Google, Bing & co. — and booked through the website widget.',
  },
  {
    key: 'ai-chat',
    group: 'organic',
    label: 'AI Chat (ChatGPT, Claude…)',
    detail: 'Arrived from an AI assistant — ChatGPT, Claude, Perplexity and others. Click to expand by assistant.',
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
    label: 'Affiliates — ArabyAds',
    detail: 'Commission / CPL partners. ArabyAds campaign lanes (Glow Up, SOS, Scan) land here — every widget booking carrying a lane tag.',
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

/**
 * Benchmark multipliers for the Google Ads PHONE path. The UAE has no Google
 * forwarding numbers, so call CONVERSIONS can never be measured — a tap on the
 * ad's call button is the last measurable event. Everything derived from it is
 * an ESTIMATE and every surface that shows one must say so.
 *
 * Sources: healthcare/dental call-tracking industry studies (answer rates for
 * SMB medical ~70-80%; call-to-appointment for dental ~30-40%). Deliberately
 * mid-range. These are knobs, not truths — tune when a tracking number gives
 * us Dental Nation's own measured rates, at which point measured replaces
 * estimated on the dashboard automatically.
 */
export const PHONE_PATH_BENCHMARKS = {
  /** Share of taps that are REAL attempts — nets out accidental taps, bots and
   *  dead clicks (industry invalid-interaction rates for mobile call assets). */
  validTapRate: 0.75,
  /** Share of real attempts that become an answered conversation. */
  answerRate: 0.75,
  /** Share of answered calls that are actual patient enquiries — nets out
   *  suppliers, job seekers, sales calls and other non-patient callers. */
  patientRate: 0.8,
  /** Share of patient conversations that become a booked appointment. */
  bookingRate: 0.35,
} as const;

/**
 * GA4 session-source classification for the Organic split (Organic SEO /
 * AI Chat / Direct). Matching is case-insensitive substring on the GA4
 * sessionSource; first hit wins. Sources that match nothing stay out of the
 * split (referrals, social, campaigns — they have their own rows).
 */
export const AI_CHAT_ENGINES: { key: string; label: string; patterns: string[] }[] = [
  { key: 'chatgpt', label: 'ChatGPT', patterns: ['chatgpt', 'chat.openai', 'openai'] },
  { key: 'claude', label: 'Claude', patterns: ['claude', 'anthropic'] },
  { key: 'perplexity', label: 'Perplexity', patterns: ['perplexity'] },
  // "Others" — every other assistant we can recognise, rolled into one row.
  { key: 'other-ai', label: 'Others (Gemini, Copilot…)', patterns: ['gemini', 'bard.google', 'copilot', 'deepseek', 'you.com', 'poe.com', 'meta.ai', 'grok', 'x.ai', 'mistral', 'lechat'] },
];

export const SEARCH_ENGINES: { label: string; patterns: string[] }[] = [
  { label: 'Google', patterns: ['google'] },
  { label: 'Bing', patterns: ['bing'] },
  { label: 'Yahoo', patterns: ['yahoo'] },
  { label: 'DuckDuckGo', patterns: ['duckduckgo'] },
  { label: 'Yandex', patterns: ['yandex'] },
  { label: 'Ecosia', patterns: ['ecosia'] },
  { label: 'Baidu', patterns: ['baidu'] },
];

/** Which AI assistant a GA4 sessionSource belongs to, or null. */
export function aiEngineOf(source: string): { key: string; label: string } | null {
  const s = source.toLowerCase();
  for (const e of AI_CHAT_ENGINES) if (e.patterns.some((p) => s.includes(p))) return { key: e.key, label: e.label };
  return null;
}

/** Which search engine an organic-medium sessionSource belongs to. */
export function searchEngineOf(source: string): string {
  const s = source.toLowerCase();
  for (const e of SEARCH_ENGINES) if (e.patterns.some((p) => s.includes(p))) return e.label;
  return 'Other engines';
}

/**
 * Meta campaign TYPE, derived from the campaign name (the media team encodes
 * it: "Leads | WhatsApp | Static…", "TOF_Call campaign…", "Awareness | Insta
 * Videos…"). First hit wins; used to group the Paid Social sub-rows.
 */
export const META_CAMPAIGN_TYPES: { key: string; label: string; patterns: string[] }[] = [
  { key: 'whatsapp-leads', label: 'WhatsApp lead campaigns', patterns: ['whatsapp'] },
  { key: 'call', label: 'Call campaigns', patterns: ['call'] },
  { key: 'instant-forms', label: 'Instant-form leads', patterns: ['instant form', 'instant_forms', 'instant forms'] },
  { key: 'messages', label: 'Message campaigns', patterns: ['message'] },
  { key: 'awareness', label: 'Awareness / video', patterns: ['awareness', 'tof_awareness'] },
  { key: 'other-leads', label: 'Other lead campaigns', patterns: ['lead'] },
];

export function metaCampaignTypeOf(name: string): { key: string; label: string } {
  const n = name.toLowerCase();
  for (const t of META_CAMPAIGN_TYPES) if (t.patterns.some((p) => n.includes(p))) return { key: t.key, label: t.label };
  return { key: 'other', label: 'Other campaigns' };
}

/** Instagram / Facebook hint from the campaign name (until the platform
 *  breakdown sync fills meta_platform_insights_raw with delivery data). */
export function metaPlatformHintOf(name: string): 'Instagram' | 'Facebook' | null {
  const n = name.toLowerCase();
  if (/insta|\big\b/.test(n)) return 'Instagram';
  if (/facebook|\bfb\b/.test(n)) return 'Facebook';
  return null;
}
