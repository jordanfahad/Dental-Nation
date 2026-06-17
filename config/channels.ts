/**
 * Canonical channel list (§13.B). Render EVERY one of these in the channel
 * activation grid — mark "not live yet" rather than omitting a channel.
 * Ordered roughly by funnel proximity: owned conversion paths first, then
 * paid/organic social, search, retargeting, CRM, and relationship channels.
 */
export const CANONICAL_CHANNELS = [
  'Website/landing page',
  'WhatsApp click path',
  'Call click path',
  'Instagram feed',
  'Instagram reels',
  'Instagram stories',
  'Instagram highlights',
  'Facebook page',
  'Meta paid ads',
  'TikTok organic',
  'TikTok paid ads',
  'Snapchat',
  'YouTube/Shorts',
  'Google Search Ads',
  'Google Display/PMax',
  'Retargeting',
  'Google Business Profile/Maps',
  'SEO/organic',
  'Email CRM',
  'WhatsApp CRM broadcast',
  'SMS CRM',
  'Existing-patient reactivation',
  'Influencer/creator',
  'Doctor personal pages',
  'Clinic local community',
  'Partnerships/collaborations',
  'PR/media',
  'Other',
] as const;

export type CanonicalChannel = (typeof CANONICAL_CHANNELS)[number];
