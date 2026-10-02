/**
 * Competitor analysis (Digital & SEO › Competitor analysis, added 2 Oct 2026
 * for Mr Akbar). Each competitor has the search markets it sells into and its
 * own public claims. Live figures (search traffic, branded searches, backlinks)
 * come from DataForSEO via lib/analytics/competitor.ts; the facts below are
 * what the company says about itself, with the source and the date read.
 */

export interface Market {
  code: number;
  name: string;
  /** Search language for DataForSEO Labs (falls back to 'en'). */
  lang: string;
  /** Pull the peer set (domains competing for the same searches) in this market. */
  peers?: boolean;
  /** Two-letter country code for the Meta Ad Library (EU countries only: that is where Meta discloses every ad). */
  adLibrary?: string;
}

export interface SocialProfile { platform: string; handle: string; followers: number; source: string }

/**
 * One lead channel in the estimate model. `share` is the typical share of a
 * brand's monthly leads for a dental tourism business with this profile
 * (low, high), and `basis` says where the range comes from. `own` lists the
 * Dental Nation channel keys (config/growth-channels.ts) that map onto it.
 */
export interface ChannelModel {
  key: string;
  label: string;
  share: [number, number];
  basis: string;
  own: string[];
}

/**
 * How a site's visits split by source for a dental tourism brand. Organic
 * search is usually 14–20% of all visits for such a brand (the rest is paid
 * social, organic social, direct and referrals), so measured organic visits
 * scale up to an estimate of total traffic; the other rows are typical
 * shares of that total. Ranges from healthcare and dental tourism traffic
 * benchmarks (2026); the page labels every modelled figure as an estimate.
 */
export interface TrafficModel {
  organicShare: [number, number];
  sources: { key: string; label: string; share: [number, number] }[];
}

/** What Google Ads looks like for a brand of this size when the campaigns are on (agency benchmarks per market, 2026). */
export interface GoogleAdsBenchmark {
  /** Markets the campaigns run in; the estimate is split across them by organic traffic. */
  markets: string[];
  marketsRunning: number;
  spendPerMarketGbp: [number, number];
  cpcGbp: [number, number];
  leadsPerMarket: [number, number];
  source: string;
}

export const GBP_AED = 4.7;

/**
 * The fact-finding frame for Mr Akbar: where Dental Nation stands against the
 * competitor on each measure, what is missing on our side, and the effort to
 * close the gap. Values are computed on the page; the words live here.
 */
export interface GapDimension {
  key: 'brand' | 'organic' | 'keywords' | 'authority' | 'social' | 'reviews' | 'paid' | 'leads' | 'footprint' | 'languages';
  label: string;
  missing: string;
  effort: string;
  /** Low, Medium, High: money and time together. */
  level: 'Low' | 'Medium' | 'High';
}

export const GAP_DIMENSIONS: GapDimension[] = [
  { key: 'leads', label: 'Net leads a month', missing: 'Volume: our paid budget and reach are a fraction of theirs, and a share of our leads go quiet because the first reply is slow.', effort: 'Scale paid media (below), a reply-within-minutes routine at the front desk, and one treatment coordinator per clinic to work the lead list.', level: 'High' },
  { key: 'paid', label: 'Paid media a month (est.)', missing: 'Budget and a creative pipeline. Dentakay runs language-specific Meta and Google campaigns with dedicated landing pages.', effort: 'Step the budget up as cost per lead holds: AED 25k by month 3, AED 60k by month 6, AED 100k by month 12. One performance marketer, weekly creative refresh from the doctor video programme.', level: 'High' },
  { key: 'brand', label: 'Brand searches a month', missing: 'Years of ads, reviews and word of mouth under one consistent name. Ours started a year ago and is rising fast.', effort: 'Keep the curve: consistent naming on every profile and ad, reviews after every visit, doctor videos, the Smile Club announcements. 24 to 36 months to 5,000 a month.', level: 'Medium' },
  { key: 'organic', label: 'Organic Google visits a month', missing: 'A content engine. Dentakay publishes treatment, price and blog pages in five languages; we have 284 ranked keywords in one market.', effort: 'One SEO lead and two writers (or an agency) producing 30 to 40 English and Arabic pages a month: treatment, price, doctor and area pages. AED 25k to 40k a month; 12 to 24 months to 10,000 visits.', level: 'High' },
  { key: 'keywords', label: 'Keywords ranked on Google', missing: 'Pages. Rankings follow the content engine above.', effort: 'Comes with the content engine; track monthly on the Digital & SEO tab.', level: 'Medium' },
  { key: 'authority', label: 'Websites linking to us', missing: 'Press, directories and partner links. Ours are mostly directories.', effort: 'PR and partnerships: 8 to 10 new referring domains a month (health press, UAE directories, insurer and employer pages, Smile Club corporate partners). 12 months to 350.', level: 'Medium' },
  { key: 'social', label: 'Social followers', missing: 'A daily video presence, a YouTube channel and separate English and Arabic accounts. We post occasionally to one account.', effort: 'Three to five videos a week from the doctor programme (Mohan plus one editor), one community manager, Arabic account, YouTube channel, AED 5k to 10k a month in follower campaigns. 12 months to 25k, 36 months to 100k.', level: 'High' },
  { key: 'reviews', label: 'Public reviews', missing: 'Volume. Our rating is higher; their count is 11 times ours.', effort: 'Ask after every completed visit (WhatsApp link, front desk script): 50 to 100 reviews a month. 12 months to 1,000.', level: 'Low' },
  { key: 'footprint', label: 'Clinics and dentists', missing: 'Capacity to absorb a Dentakay-sized lead flow: they have seven clinics and 60 dentists.', effort: 'Not a marketing task: chairs and dentist hours decide how many leads we can convert. DN Elite DIFC (2027) is the next step.', level: 'High' },
  { key: 'languages', label: 'Languages and markets', missing: 'They sell in five languages across eleven countries; we sell in two languages in one city.', effort: 'Arabic first (content, ads, social, front desk), then Russian or Hindi by demand. Medical tourism into Dubai is a separate decision.', level: 'Medium' },
];

export interface CompetitorDef {
  domain: string;
  name: string;
  /** Lower-case brand fragment used to separate branded searches, e.g. "dentakay". */
  brand: string;
  /** The main branded search term (for the monthly search trend). */
  brandKeyword: string;
  markets: Market[];
  /** Public claims, with where they come from. Patient numbers drive the implied-leads cross-check. */
  facts: { label: string; value: string; source: string }[];
  /** Patients treated per year as the company states it, or null. */
  claimedPatientsPerYear: number | null;
  /** Patients a year implied by an outside revenue estimate, with how it was worked out. */
  revenueCheck?: { patientsPerYear: number; note: string };
  /** Lead to treated-patient conversion assumed for the cross-check (low, high). */
  leadToPatient: [number, number];
  /** Share of gross enquiries that are real (net) leads: the rest is price shopping, spam and unreachable numbers (low, high). */
  netOfGross: [number, number];
  /** Public social accounts and follower counts, as read on the date in `source`. */
  social: SocialProfile[];
  /** The lead-channel model this brand is judged against. */
  channels: ChannelModel[];
  traffic: TrafficModel;
  googleAds: GoogleAdsBenchmark;
}

const UAE: Market = { code: 2784, name: 'UAE', lang: 'en', peers: true };

/**
 * Where a dental tourism clinic's leads come from, as a share of all leads.
 * Basis: agency benchmarks for Turkish dental tourism marketing (Avangard,
 * Glawi, Marketing A Clinic, 2026: Meta lead campaigns at GBP 8–35 a lead vs
 * Google search at GBP 45–120, so budgets and volume sit on Meta; Google Ads
 * at GBP 1,500–3,000 a month yields 20–40 enquiries), the brand's own
 * footprint (dedicated Facebook/Instagram landing pages, 100k+ followers per
 * network, listings on Bookimed/WhatClinic/Flymedi) and the measured Google
 * figures on this page. Ranges, not points: nobody outside the business knows.
 */
const DENTAL_TOURISM_TRAFFIC: TrafficModel = {
  organicShare: [0.14, 0.2],
  sources: [
    { key: 'organic-search', label: 'Organic search (Google)', share: [0.14, 0.2] },
    { key: 'paid-social', label: 'Paid social (Meta ads)', share: [0.3, 0.4] },
    { key: 'organic-social', label: 'Organic social and YouTube', share: [0.12, 0.18] },
    { key: 'direct', label: 'Direct and returning', share: [0.12, 0.18] },
    { key: 'paid-search', label: 'Paid search (Google Ads)', share: [0.05, 0.1] },
    { key: 'referral', label: 'Referrals and platforms', share: [0.05, 0.1] },
  ],
};

const DENTAL_TOURISM_GOOGLE_ADS: GoogleAdsBenchmark = {
  markets: ['UK', 'France', 'USA', 'Germany', 'Turkey'],
  marketsRunning: 5,
  spendPerMarketGbp: [1500, 3000],
  cpcGbp: [1.5, 4],
  leadsPerMarket: [20, 40],
  source: 'Avangard dental tourism advertising benchmarks, 2026: GBP 1,500–3,000 a month per market at GBP 1.50–4.00 a click gives 20–40 enquiries; applied to the five main markets (UK, France, USA, Germany, Turkey)',
};

const DENTAL_TOURISM_CHANNELS: ChannelModel[] = [
  { key: 'meta-paid', label: 'Meta ads (Facebook, Instagram)', share: [0.4, 0.55], basis: 'Cheapest lead source for dental tourism (GBP 8–35 a lead); dedicated FB/IG landing pages; the Ad Library shows what is live', own: ['paid-social'] },
  { key: 'google-organic', label: 'Google search (organic)', share: [0.15, 0.25], basis: 'Measured: Google visits × 1–3% enquiry rate (the table above)', own: ['website', 'gmb', 'ai-chat'] },
  { key: 'google-paid', label: 'Google Ads', share: [0.05, 0.15], basis: 'GBP 45–120 a lead; a GBP 1,500–3,000 monthly budget gives 20–40 enquiries. DataForSEO sees no paid clicks this month, so the low end applies now', own: ['paid-search'] },
  { key: 'social-organic', label: 'Social and YouTube (organic)', share: [0.08, 0.15], basis: 'Followers × 0.05–0.2% enquiring a month: 190k Instagram, 105k Facebook, 185k YouTube', own: ['social-organic', 'influencer'] },
  { key: 'aggregators', label: 'Medical tourism platforms (Bookimed, WhatClinic, Flymedi)', share: [0.05, 0.1], basis: 'Listed on every major platform; platforms charge 10–20% commission, so clinics cap this', own: ['affiliate', 'partnership'] },
  { key: 'referral-direct', label: 'Word of mouth, returning patients, direct', share: [0.05, 0.12], basis: '15,000+ treated patients and 1,000+ reviews; dental tourism repeat rates are low (one trip)', own: ['patient-referral', 'doctor-referral', 'direct-walkin', 'retention', 'whatsapp', 'ai-concierge'] },
];

export const OWN: CompetitorDef = {
  domain: 'dentalnation.com',
  name: 'Dental Nation',
  brand: 'dental nation',
  brandKeyword: 'dental nation',
  markets: [UAE],
  facts: [],
  claimedPatientsPerYear: null,
  leadToPatient: [0.1, 0.2],
  netOfGross: [0.4, 0.6],
  social: [],
  channels: DENTAL_TOURISM_CHANNELS,
  traffic: DENTAL_TOURISM_TRAFFIC,
  googleAds: { ...DENTAL_TOURISM_GOOGLE_ADS, markets: ['UAE'], marketsRunning: 1 },
};

export const COMPETITORS: CompetitorDef[] = [
  {
    domain: 'dentakay.com',
    name: 'Dentakay',
    brand: 'dentakay',
    brandKeyword: 'dentakay',
    // Dental tourism into Turkey: Europe and North America, plus the Gulf (Riyadh branch) and Turkey itself.
    markets: [
      { code: 2826, name: 'UK', lang: 'en', peers: true },
      { code: 2840, name: 'USA', lang: 'en', peers: true },
      { code: 2276, name: 'Germany', lang: 'de', peers: true, adLibrary: 'DE' },
      { code: 2372, name: 'Ireland', lang: 'en', adLibrary: 'IE' },
      { code: 2250, name: 'France', lang: 'fr', peers: true, adLibrary: 'FR' },
      { code: 2528, name: 'Netherlands', lang: 'nl', adLibrary: 'NL' },
      { code: 2036, name: 'Australia', lang: 'en' },
      { code: 2124, name: 'Canada', lang: 'en' },
      UAE,
      { code: 2682, name: 'Saudi Arabia', lang: 'ar' },
      { code: 2792, name: 'Turkey', lang: 'tr' },
    ],
    facts: [
      { label: 'Founded', value: '2009, Istanbul (Dr Gülay Akay)', source: 'clinic listings (Bookimed, Flymedi), read 2 Oct 2026' },
      { label: 'Clinics', value: '7 in Turkey (Istanbul, Ankara, Antalya), Riyadh (KSA), consultation office in London', source: 'clinic listings, read 2 Oct 2026' },
      { label: 'Patients a year (their claim)', value: '15,000 a year; “22,000+ patients worldwide”', source: 'clinic listings, read 2 Oct 2026' },
      { label: 'Dentists', value: '60, across 5 departments', source: 'clinic listings, read 2 Oct 2026' },
      { label: 'Trustpilot', value: '4.3 out of 5 from 1,080 reviews', source: 'trustpilot.com/review/dentakay.com, read 2 Oct 2026' },
      { label: 'Revenue (outside estimate)', value: 'about USD 7.8 million a year. This does not fit 15,000 patients a year (it would mean about USD 520 per patient, low for implant and veneer packages), so one of the two claims is overstated', source: 'ZoomInfo company profile, read 2 Oct 2026' },
      { label: 'Google Ads', value: 'Runs Google Ads through a hired specialist (agency case study)', source: 'Uplers case study, read 2 Oct 2026' },
      { label: 'Main offer', value: 'Implants, veneers, Hollywood smile, orthodontics; package trips with hotel and transfers', source: 'dentakay.com and its Facebook landing pages' },
      { label: 'Lead capture', value: 'Free online consultation forms, WhatsApp, dedicated Facebook/Instagram landing pages (landing.dentakay.com, smile.dentakay.com)', source: 'public landing pages' },
    ],
    claimedPatientsPerYear: 15000,
    revenueCheck: { patientsPerYear: 2600, note: 'ZoomInfo puts revenue at about USD 7.8 million a year; at a typical USD 3,000 implant or veneer package that is about 2,600 patients a year' },
    // Dental tourism: most enquiries never travel. 10–20% of leads becoming patients is the planning range.
    leadToPatient: [0.1, 0.2],
    netOfGross: [0.4, 0.6],
    social: [
      { platform: 'Instagram', handle: '@dentakay (+ @dentakay.fr 44k, @dentakay_ar 9.9k, @dentakaymexico 5.6k)', followers: 191500, source: 'instagram.com profiles, read 2 Oct 2026' },
      { platform: 'YouTube', handle: '@Dentakay', followers: 185000, source: 'youtube.com/@Dentakay, read 2 Oct 2026' },
      { platform: 'Facebook', handle: 'Dentakay Dental Clinic (62k) + Dentakay Clinique Dentaire (43k)', followers: 105000, source: 'facebook.com pages, read 2 Oct 2026' },
    ],
    channels: DENTAL_TOURISM_CHANNELS,
    traffic: DENTAL_TOURISM_TRAFFIC,
    googleAds: DENTAL_TOURISM_GOOGLE_ADS,
  },
];

export const competitorByDomain = (d: string) => COMPETITORS.find((c) => c.domain === d) ?? (d === OWN.domain ? OWN : undefined);
