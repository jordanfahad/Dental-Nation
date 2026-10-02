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
}

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
  /** Lead to treated-patient conversion assumed for the cross-check (low, high). */
  leadToPatient: [number, number];
}

const UAE: Market = { code: 2784, name: 'UAE', lang: 'en' };

export const OWN: CompetitorDef = {
  domain: 'dentalnation.com',
  name: 'Dental Nation',
  brand: 'dental nation',
  brandKeyword: 'dental nation',
  markets: [UAE],
  facts: [],
  claimedPatientsPerYear: null,
  leadToPatient: [0.1, 0.2],
};

export const COMPETITORS: CompetitorDef[] = [
  {
    domain: 'dentakay.com',
    name: 'Dentakay',
    brand: 'dentakay',
    brandKeyword: 'dentakay',
    // Dental tourism into Turkey: Europe and North America, plus the Gulf (Riyadh branch) and Turkey itself.
    markets: [
      { code: 2826, name: 'UK', lang: 'en' },
      { code: 2840, name: 'USA', lang: 'en' },
      { code: 2276, name: 'Germany', lang: 'de' },
      { code: 2372, name: 'Ireland', lang: 'en' },
      { code: 2250, name: 'France', lang: 'fr' },
      { code: 2528, name: 'Netherlands', lang: 'nl' },
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
    // Dental tourism: most enquiries never travel. 10–20% of leads becoming patients is the planning range.
    leadToPatient: [0.1, 0.2],
  },
];

export const competitorByDomain = (d: string) => COMPETITORS.find((c) => c.domain === d) ?? (d === OWN.domain ? OWN : undefined);
