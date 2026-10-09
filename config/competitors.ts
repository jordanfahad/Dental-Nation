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
  /** Home market whose organic traffic is mostly blog reading (toothpaste, brushes), not patients. */
  homeBlog?: boolean;
}

/**
 * How organic Google visits become leads. Not every visit is a prospect: brand
 * searches convert well, treatment and price searches moderately, and blog
 * reading in the home market hardly at all. Rates from dental clinic site
 * benchmarks (2026); ranges, not points.
 */
export interface OrganicLeadModel {
  /** Share of brand-search visits that enquire. */
  brandRate: [number, number];
  /** Share of non-brand visits that carry treatment or price intent. */
  commercialShare: [number, number];
  /** The same share in a home-blog market. */
  homeBlogCommercialShare: number;
  /** Share of commercial visits that enquire. */
  enquiryRate: [number, number];
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

/** One line of monthly digital marketing spend, for the us-vs-them table. */
export interface SpendLine {
  key: 'meta' | 'google' | 'content' | 'video' | 'platforms' | 'other';
  label: string;
  /** Competitor estimate in AED (low, high) and its basis. */
  theirs: [number, number];
  basis: string;
  /** How Dental Nation's figure is sourced: 'meta' and 'google' are measured from the ad accounts; a fixed monthly cost from invoices; otherwise a note. */
  ours: 'meta' | 'google' | { aed: number; note: string } | string;
}

/**
 * What Dental Nation pays CRM-DN (Zavis, an outside supplier: website, booking
 * module, WhatsApp desk) each month, from its invoices in lane_e.mos_costs:
 * AI Pro 3 seats AED 2,422 a quarter (INV-000042, 13 Mar 2026) plus the
 * Continuous Care retainer AED 3,000 a quarter (INV-000045) = AED 1,807 a
 * month, plus Azure hosting USD 100 (AED 367) a month. WhatsApp message fees
 * are billed on top and not yet recorded. Update when a newer invoice lands.
 */
export const DN_CRM_MONTHLY = { aed: 2174, note: 'CRM-DN (Zavis) AED 1,807 a month plus Azure hosting AED 367 (Mar 2026 invoices); content written in-house' };

/**
 * The fact-finding frame for Mr Akbar: where Dental Nation stands against the
 * competitor on each measure, what is missing on our side, and the effort to
 * close the gap. Values are computed on the page; the words live here.
 */
export interface GapDimension {
  key: 'returning' | 'brand' | 'organic' | 'keywords' | 'authority' | 'social' | 'reviews' | 'paid' | 'leads' | 'footprint' | 'languages';
  label: string;
  missing: string;
  effort: string;
  /** Low, Medium, High: money and time together. */
  level: 'Low' | 'Medium' | 'High';
}

export const GAP_DIMENSIONS: GapDimension[] = [
  { key: 'returning', label: 'Returning patients a month', missing: 'Nothing: this is our advantage. Dental tourism patients make one trip; ours come back for recalls, hygiene visits and Smile Club.', effort: 'Protect it: Smile Club, recalls and reviews. Every returning patient is a lead we do not have to buy.', level: 'Low' },
  { key: 'leads', label: 'New leads a month', missing: 'Volume: our paid budget and reach are a fraction of theirs, and a share of our leads go quiet because the first reply is slow.', effort: 'Scale paid media (below), a reply-within-minutes routine at the front desk, and one treatment coordinator per clinic to work the lead list.', level: 'High' },
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
  /** Other spellings people search the brand by (Arabic, local scripts); counted with the main term. */
  brandAliases?: string[];
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
  organicLeads: OrganicLeadModel;
  spend: SpendLine[];
  /** Short key for the tab in the URL (?comp=). */
  tabKey?: string;
  /** What kind of business it is, used in the page's wording ("a dental tourism brand"). */
  kind?: string;
  /** Monthly Meta budget assumed for the paid-media gap (GBP, low and high). */
  metaMonthlyGbp?: [number, number];
  /** Share of all leads that Google search brings for this kind of business; used when no patient or revenue figure exists. */
  searchShareOfLeads?: [number, number];
  /** Label for the third lead estimate (default "From their revenue"). */
  revenueLabel?: string;
  /** The us-vs-them rows that differ from the Dentakay defaults. */
  gap?: Partial<Record<GapDimension['key'], { theirs?: number | null; fmtT?: string; missing?: string; effort?: string; level?: GapDimension['level'] }>>;
  /** The one-line summary under the fact-finding table. */
  summary?: string;
  /** A caveat shown at the top of the tab. */
  caveat?: string;
  /** One line under the social table explaining how the follower figures are built. */
  socialNote?: string;
  /**
   * The measured domain is a group or corporate site, not where patients
   * book (each practice has its own local site). Its Google figures then
   * cannot stand in for the brand's Google leads, so the lead model uses
   * the typical channel shares instead.
   */
  groupSiteOnly?: boolean;
  /** The line under the channel-mix table saying why the mixes differ (default: the dental tourism wording). */
  mixNote?: string;
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

const DENTAL_TOURISM_SPEND: SpendLine[] = [
  { key: 'meta', label: 'Meta ads (Facebook, Instagram)', theirs: [45_000, 115_000], basis: '430 to 1,190 leads a month at GBP 8 to 35 a lead', ours: 'meta' },
  { key: 'google', label: 'Google Ads', theirs: [35_000, 70_000], basis: 'GBP 1,500 to 3,000 a month per market in six markets', ours: 'google' },
  { key: 'content', label: 'Content and SEO (people)', theirs: [40_000, 60_000], basis: 'Treatment, price and blog pages in five languages: an SEO lead plus writers and translators', ours: DN_CRM_MONTHLY },
  { key: 'video', label: 'Video and social production', theirs: [30_000, 50_000], basis: 'Daily video across four language accounts and YouTube: videographer, editor, community manager', ours: 'in-house (Mohan), not costed separately' },
  { key: 'platforms', label: 'Medical tourism platforms (commission)', theirs: [20_000, 40_000], basis: '10 to 20% commission on 50 to 220 platform leads a month that convert', ours: 'ArabyAds affiliate, commission only' },
  { key: 'other', label: 'Influencers, PR, events', theirs: [10_000, 30_000], basis: 'Patient-influencer trips and press; not visible from outside', ours: 'none running' },
];

const ORGANIC_LEADS: OrganicLeadModel = { brandRate: [0.03, 0.05], commercialShare: [0.25, 0.4], homeBlogCommercialShare: 0.1, enquiryRate: [0.01, 0.03] };

const DENTAL_TOURISM_GOOGLE_ADS: GoogleAdsBenchmark = {
  // Where they sell and where they have clinics: the four source markets, Turkey, and Saudi Arabia (Riyadh clinic).
  markets: ['UK', 'France', 'USA', 'Germany', 'Turkey', 'Saudi Arabia'],
  marketsRunning: 6,
  spendPerMarketGbp: [1500, 3000],
  cpcGbp: [1.5, 4],
  leadsPerMarket: [20, 40],
  source: 'Avangard dental tourism advertising benchmarks, 2026: GBP 1,500–3,000 a month per market at GBP 1.50–4.00 a click gives 20–40 enquiries; applied to the six markets where they sell or have a clinic (UK, France, USA, Germany, Turkey, Saudi Arabia)',
};

const DENTAL_TOURISM_CHANNELS: ChannelModel[] = [
  { key: 'meta-paid', label: 'Meta ads (Facebook, Instagram)', share: [0.4, 0.55], basis: 'Cheapest lead source for dental tourism (GBP 8–35 a lead); dedicated FB/IG landing pages; the Ad Library shows what is live', own: ['paid-social'] },
  { key: 'google-organic', label: 'Google search (organic)', share: [0.15, 0.25], basis: 'Measured: brand visits × 3–5%, plus treatment and price visits (25–40% of the rest; 10% in the home blog market) × 1–3%', own: ['website', 'gmb', 'ai-chat'] },
  { key: 'google-paid', label: 'Google Ads', share: [0.05, 0.15], basis: 'GBP 45–120 a lead; a GBP 1,500–3,000 monthly budget gives 20–40 enquiries. DataForSEO sees no paid clicks this month, so the low end applies now', own: ['paid-search'] },
  { key: 'social-organic', label: 'Social and YouTube (organic)', share: [0.08, 0.15], basis: 'Followers × 0.05–0.2% enquiring a month: 190k Instagram, 105k Facebook, 185k YouTube', own: ['social-organic', 'influencer'] },
  { key: 'aggregators', label: 'Medical tourism platforms (Bookimed, WhatClinic, Flymedi)', share: [0.05, 0.1], basis: 'Listed on every major platform; platforms charge 10–20% commission, so clinics cap this', own: ['affiliate', 'partnership'] },
  { key: 'referral-direct', label: 'Word of mouth, returning patients, direct', share: [0.05, 0.12], basis: '15,000+ treated patients and 1,000+ reviews; dental tourism repeat rates are low (one trip)', own: ['patient-referral', 'doctor-referral', 'direct-walkin', 'retention', 'whatsapp', 'ai-concierge'] },
];


/**
 * A UK multi-site dental group (NHS and private, one city to national). Most
 * new patients find a practice on Google (search and Maps, one listing and
 * local site per practice), then word of mouth and recall; paid social is a
 * smaller share than in dental tourism. Ranges from UK dental marketing
 * benchmarks (2026); every modelled figure on the page is labelled an estimate.
 */
const UK_GROUP_TRAFFIC: TrafficModel = {
  organicShare: [0.35, 0.5],
  sources: [
    { key: 'organic-search', label: 'Organic search and Maps (Google)', share: [0.35, 0.5] },
    { key: 'direct', label: 'Direct and returning patients', share: [0.2, 0.3] },
    { key: 'paid-search', label: 'Paid search (Google Ads)', share: [0.08, 0.15] },
    { key: 'paid-social', label: 'Paid social (Meta ads)', share: [0.05, 0.12] },
    { key: 'referral', label: 'Referrals, NHS finder and directories', share: [0.05, 0.1] },
    { key: 'organic-social', label: 'Organic social', share: [0.03, 0.08] },
  ],
};

const UK_GROUP_CHANNELS: ChannelModel[] = [
  { key: 'google-organic', label: 'Google search and Maps (organic)', share: [0.3, 0.45], basis: 'Each practice has its own Google listing and local site; most UK patients choose a dentist near home through Google', own: ['website', 'gmb', 'ai-chat'] },
  { key: 'referral-direct', label: 'Word of mouth, recall and NHS registrations', share: [0.2, 0.35], basis: 'Mixed NHS and private practices with 65,000 patients on recall; families and colleagues follow', own: ['patient-referral', 'doctor-referral', 'direct-walkin', 'retention', 'whatsapp', 'ai-concierge'] },
  { key: 'google-paid', label: 'Google Ads', share: [0.1, 0.2], basis: 'Local campaigns per practice for private treatments (implants, aligners, whitening)', own: ['paid-search'] },
  { key: 'meta-paid', label: 'Meta ads (Facebook, Instagram)', share: [0.1, 0.2], basis: 'Treatment offers (aligners, whitening, implants) with finance; smaller share than in dental tourism', own: ['paid-social'] },
  { key: 'aggregators', label: 'NHS finder, insurers and directories', share: [0.03, 0.08], basis: 'NHS "find a dentist", insurer and employer lists', own: ['affiliate', 'partnership'] },
  { key: 'social-organic', label: 'Social (organic)', share: [0.03, 0.08], basis: 'Practice-level Instagram and Facebook accounts', own: ['social-organic', 'influencer'] },
];

const UK_GROUP_GOOGLE_ADS: GoogleAdsBenchmark = {
  markets: ['UK'],
  marketsRunning: 1,
  spendPerMarketGbp: [15000, 40000],
  cpcGbp: [2, 6],
  leadsPerMarket: [250, 600],
  source: 'UK dental Google Ads benchmarks, 2026: about GBP 300–800 a month per practice at GBP 2–6 a click; applied to 50 practices',
};

const UK_GROUP_SPEND: SpendLine[] = [
  { key: 'meta', label: 'Meta ads (Facebook, Instagram)', theirs: [23_500, 70_500], basis: 'GBP 5,000 to 15,000 a month across the group for treatment offers', ours: 'meta' },
  { key: 'google', label: 'Google Ads', theirs: [70_500, 188_000], basis: 'GBP 300 to 800 a month per practice across 50 practices', ours: 'google' },
  { key: 'content', label: 'Websites, local SEO and listings', theirs: [25_000, 50_000], basis: 'One local site and Google listing per practice, run centrally', ours: DN_CRM_MONTHLY },
  { key: 'video', label: 'Content and social production', theirs: [15_000, 30_000], basis: 'A central marketing team producing for practice accounts', ours: 'in-house (Mohan), not costed separately' },
  { key: 'platforms', label: 'Finance, NHS and directory listings', theirs: [5_000, 15_000], basis: 'Patient finance partners and directory fees', ours: 'ArabyAds affiliate, commission only' },
  { key: 'other', label: 'PR, recruitment marketing, events', theirs: [10_000, 25_000], basis: 'Dentist recruitment and partner acquisition campaigns; not visible from outside', ours: 'none running' },
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
  organicLeads: ORGANIC_LEADS,
  spend: DENTAL_TOURISM_SPEND,
};

export const COMPETITORS: CompetitorDef[] = [
  {
    domain: 'dentakay.com',
    name: 'Dentakay',
    tabKey: 'dentakay',
    kind: 'dental tourism brand',
    socialNote: 'Dentakay runs separate accounts per language (English, French, Arabic, Spanish); the Instagram figure adds them up.',
    brand: 'dentakay',
    brandKeyword: 'dentakay',
    brandAliases: ['دينتاكاي'],
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
      { code: 2792, name: 'Turkey', lang: 'tr', homeBlog: true },
    ],
    facts: [
      { label: 'Founded', value: '2009, Istanbul (Dr Gülay Akay)', source: 'clinic listings (Bookimed, Flymedi), read 2 Oct 2026' },
      { label: 'Clinics', value: '6 in Turkey (Istanbul: Özel Dentakay, Nish, Şişli, Bağcılar; Ankara: Çayyolu; Antalya), 1 in Riyadh, plus a London office', source: 'dentakay.com/locations, read 2 Oct 2026' },
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
    organicLeads: ORGANIC_LEADS,
    spend: DENTAL_TOURISM_SPEND,
  },
  {
    domain: 'dentalbeautypartners.co.uk',
    name: 'Dental Beauty Partners',
    tabKey: 'dbp',
    kind: 'UK dental group',
    groupSiteOnly: true,
    mixNote: 'Dental Beauty Partners serves local patients from about 50 UK practices; we serve Dubai from 3 clinics.',
    socialNote: 'Dental Beauty Partners has two group Instagram accounts: @dentalbeautygroup (patient-facing, about 21k) and @dentalbeautypartners (the group brand, about 7.1k). Some practices and dentists also post on their own accounts; those are not added here. Counts are as Instagram showed them in search results on 9 Oct 2026 and are rounded.',
    brand: 'dental beauty',
    brandKeyword: 'dental beauty',
    markets: [{ code: 2826, name: 'UK', lang: 'en', peers: true }],
    facts: [
      { label: 'What it is', value: 'A UK dental group built by buying practices and keeping each practice\'s dentist as an invested partner ("partnership model"), with mixed NHS and private dentistry', source: 'company announcements and trade press (Dentistry.co.uk 2022; Greater Birmingham Chambers, Jan 2025)' },
      { label: 'Founded', value: '2015 as a single practice in Swanley; the group company was formed in 2019. Co-founder and CEO: Dev Patel', source: 'Healthcare & Protection (Feb 2021); Greater Birmingham Chambers (Jan 2025)' },
      { label: 'Ownership', value: 'Majority owned since February 2021 by European Dental Group, a pan-European dental group backed by the private equity firm Nordic Capital', source: 'Healthcare & Protection; LaingBuisson News (Feb 2021)' },
      { label: 'Practices', value: '50 practices across the UK (January 2025), up from 14 (2021) and 35+ (2022), mostly in and around London, plus Kiss Dental in Manchester and practices in Essex', source: 'Greater Birmingham Chambers (Jan 2025); BusinessWire (Mar 2022)' },
      { label: 'Patients and team', value: '65,000 patients (including NHS) and more than 1,000 colleagues', source: 'company announcement, Jan 2025' },
      { label: 'Revenue', value: 'Run-rate turnover above GBP 100 million (about AED 470 million) after the 50th practice, with 73% compound annual growth (company figure). Outside databases estimate far less (about USD 18 million), so treat the company figure as a run-rate claim', source: 'company announcement, Jan 2025; Prospeo profile' },
      { label: 'Recent moves', value: 'Launched a group orthodontics offer (2025); keeps adding practices (Streatham, Teddington, Clapham in Jan 2025; Colchester)', source: 'Greater Birmingham Chambers (Jan 2025); PKF Smith Cooper' },
      { label: 'How it markets', value: 'Each practice trades under its own local name and website (for example dentalbeautysouthgate.co.uk, dentalbeautyromford.co.uk); dentalbeautypartners.co.uk is the group site for dentists, partners and recruitment', source: 'practice websites and Trustpilot pages, read 9 Oct 2026' },
      { label: 'Reviews', value: 'Reviews sit with each practice on Google; on Trustpilot the practice pages have only a handful (Southgate 2.8 from 3 reviews, Romford 3.5 from 1)', source: 'trustpilot.com, read 9 Oct 2026' },
    ],
    claimedPatientsPerYear: null,
    revenueCheck: { patientsPerYear: 8000, note: 'The group has 65,000 patients; UK practices typically gain 10 to 15% new patients a year, so about 8,000 new patients a year (an estimate)' },
    revenueLabel: 'From their patient base',
    // A local practice converts enquiries far better than dental tourism: the patient lives nearby and often has NHS or insurance cover.
    leadToPatient: [0.3, 0.5],
    netOfGross: [0.5, 0.7],
    social: [
      { platform: 'Instagram', handle: '@dentalbeautygroup (+ @dentalbeautypartners 7.1k)', followers: 28100, source: 'instagram.com profiles as shown in search results, read 9 Oct 2026' },
    ],
    channels: UK_GROUP_CHANNELS,
    traffic: UK_GROUP_TRAFFIC,
    googleAds: UK_GROUP_GOOGLE_ADS,
    organicLeads: ORGANIC_LEADS,
    spend: UK_GROUP_SPEND,
    searchShareOfLeads: [0.3, 0.45],
    metaMonthlyGbp: [5000, 15000],
    caveat: 'Dental Beauty Partners is not a dental tourism brand like Dentakay. It is a UK group of about 50 local practices, each marketed under its own name and website. The search figures below are for the group site (dentalbeautypartners.co.uk) and the "dental beauty" brand; each practice\'s own local site is not included, so their real patient traffic is much higher than the group site shows.',
    gap: {
      returning: { theirs: 5400, fmtT: 'about 5,400 (65,000 patients on recall, about one visit in 12 months each)', missing: 'Scale, not the model: like us, they live on returning patients and recall. Their base is about 20 times ours because they own 50 practices.', effort: 'Smile Club and recall reminders for every patient; this is the part of their model we already share.', level: 'Low' },
      leads: { missing: 'Locations: each of their 50 practices brings its own local Google listing and walk-in patients.', effort: 'Our lever is per-clinic local marketing: a strong Google listing, reviews and local pages for each clinic, plus fast replies at the desk.', level: 'Medium' },
      paid: { missing: 'Central marketing that runs local campaigns for every practice from one team.', effort: 'One performance marketer running local Google and Meta campaigns per clinic, with a fixed monthly budget per clinic.', level: 'High' },
      brand: { missing: 'Not much: their group name is mostly a business-to-business brand; patients know the local practice name.', effort: 'Keep one consistent Dental Nation name across every clinic, listing and ad.', level: 'Low' },
      organic: { missing: 'Fifty local websites and listings, each ranking for "dentist near me" in its own area.', effort: 'Local pages and Google listings for each of our clinics; treatment and area pages in English and Arabic.', level: 'Medium' },
      authority: { missing: 'Press and trade coverage from acquisitions and deals.', effort: 'PR around Smile Club, partnerships and new clinics; UAE directories and partner links.', level: 'Medium' },
      social: { missing: 'A modest gap: about 28k Instagram followers across two group accounts, far below Dentakay. Social is not where this group wins.', effort: 'Doctor videos and one consistent Dental Nation account do more for us than many small accounts.', level: 'Medium' },
      reviews: { theirs: null, fmtT: 'per practice on Google (not totalled); Trustpilot only a handful', missing: 'Volume per practice across 50 sites.', effort: 'Ask after every completed visit at every clinic: 50 to 100 Google reviews a month.', level: 'Low' },
      footprint: { theirs: 50, fmtT: '50+ practices across the UK; 1,000+ colleagues', missing: 'Capital and a buy-and-build model: they grew from 1 to 50 practices in 10 years by acquiring practices, backed by private equity.', effort: 'Not a marketing task: a growth and investment decision. Their partnership model (the dentist co-owns the practice) is the part worth studying.', level: 'High' },
      languages: { theirs: 1, fmtT: '1 language, UK only (local patients)', missing: 'Nothing: they serve local patients in English.', effort: 'Our two languages are an advantage in Dubai; keep Arabic in content, ads and the desk.', level: 'Low' },
      keywords: { missing: 'Local rankings come with each practice site.', effort: 'Comes with local pages per clinic; tracked monthly on the Digital & SEO tab.', level: 'Medium' },
    },
    summary: 'Dental Beauty Partners is a different kind of competitor from Dentakay. It is a private-equity-backed buy-and-build group: it grew from one practice in 2015 to about 50 by acquiring practices and keeping each practice\'s dentist as an invested partner, with NHS and private income and 65,000 patients on recall. Its growth comes from acquisitions and recall, and its marketing is local, practice by practice, under each practice\'s own name. The lessons for us are the partnership model, one central marketing team running local marketing for each clinic, and a recall engine, which Smile Club already gives us.',
  },
];

export const competitorByDomain = (d: string) => COMPETITORS.find((c) => c.domain === d) ?? (d === OWN.domain ? OWN : undefined);
