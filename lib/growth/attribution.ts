import { TAG_RULES } from '@/config/growth-channels';

/**
 * The attribution waterfall — the deterministic rulebook that assigns every
 * Practo appointment (and every enquiry) to exactly ONE growth channel.
 *
 * PURE module: no IO, no 'server-only'. lib/growth/channelPerformance.ts feeds
 * it rows; keeping the logic here means the rules are unit-testable and the UI
 * can render the SAME ordered list the engine executes — the explainer the CEO
 * sees is the code path, not a paraphrase of it.
 *
 * Design decisions (agreed with Jordan, 2026-07-29):
 *  - FIRST MATCH WINS, top to bottom. Hard evidence (an explicit tag, a phone
 *    match to a tracked source) always outranks inference; inference always
 *    outranks the default. So adding tags later can only make attribution
 *    better, never reshuffle what was already hard-attributed.
 *  - Every verdict carries its ruleId + evidence level ('tagged' | 'inferred'),
 *    so the view can show attribution CONFIDENCE, not just attribution.
 *  - The CEO's default rule is the floor: a new patient with no referral and no
 *    campaign trace is Direct / Walk-in (organic) — rule R10.
 *  - Retention is decided FIRST: a returning patient is never presented as a
 *    new acquisition, whatever channel their re-booking came through.
 *
 * Identity is the last-9-digits phone (the same key every other cross-source
 * match in this codebase uses); patient files (mr_no) tie revenue back.
 */

export type Evidence = 'tagged' | 'inferred';

export interface Verdict {
  channel: string;
  ruleId: string;
  evidence: Evidence;
}

/** One appointment, source-agnostically prepared by the read layer. */
export interface ApptFacts {
  p9: string; // last-9-digit phone ('' if unusable)
  mrNo: string; // trimmed, '' if absent
  bookedBy: string;
  freeText: string; // remarks + complaint, lower-cased
  isTest: boolean;
}

/** Everything the waterfall may consult, prebuilt as lookups by the read layer. */
export interface Lookups {
  /** Widget (raw_zavis) phones → which campaign marker the submission carried. */
  widgetByPhone: ReadonlyMap<string, { hasLane: boolean; paidSearch: boolean }>;
  /** Lead-tracker phones → the channel its Source/Platform fields map to. */
  leadChannelByPhone: ReadonlyMap<string, string>;
  /** Phones that booked via the Zavis AI agent (crm_appointments.source = 'aiAgent'). */
  aiAgentPhones: ReadonlySet<string>;
  /** Phones of patients known BEFORE the growth push (existing/practo patient files). */
  existingPhones: ReadonlySet<string>;
  /** Phone → distinct patient files seen on it (family detection). */
  filesByPhone: ReadonlyMap<string, ReadonlySet<string>>;
  /** Lead-tracker phones → free text (notes/remarks) for keyword tag scanning. */
  leadTextByPhone: ReadonlyMap<string, string>;
}

/** New-patient file series (Practo Insta numbering, Apr 2026+): DNW/DNJ/DN…. */
export const isNewFile = (mrNo: string): boolean => /^DN/i.test(mrNo.trim());

/** Test detector for Practo rows — mirrors the isTestName rule used elsewhere. */
export const isTestAppt = (text: string): boolean => /zavis|test|sagar/i.test(text);

/** Reception calendar blocks ("Block", "BIOCK", dummy phones) — slot
 *  placeholders, not patients. Excluded from every count, pool and trace. */
export const isBlockAppt = (name: string): boolean => /^\s*b[il1]?[o0]ck/i.test(name.trim());

/** Last-9-digit phone key, '' when too short to be a real number. */
export const phone9 = (s: string | null | undefined): string => {
  const d = String(s ?? '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};

/** First TAG_RULES hit in a blob of free text, or null. */
export function tagHit(text: string): string | null {
  if (!text) return null;
  for (const rule of TAG_RULES) {
    for (const kw of rule.keywords) if (text.includes(kw)) return rule.channel;
  }
  return null;
}

/**
 * Map a lead-tracker row's fields to a channel. Exported so the read layer
 * classifies enquiry rows with the SAME rules the appointment waterfall uses.
 */
export function leadTrackerChannel(sourceType: string, inquiryPlatform: string, preferredChannel: string): string {
  const st = sourceType.toLowerCase();
  const ip = inquiryPlatform.toLowerCase();
  const pc = preferredChannel.toLowerCase();
  // Explicit paid traces first: Meta lead forms and anything reception marked "ADS".
  if (st.includes('lead form') || pc.startsWith('ads')) return 'paid-social';
  if (st.includes('website') || pc.includes('website')) return 'website';
  if (ip.includes('walk') || st.includes('walk')) return 'direct-walkin';
  if (ip.includes('telephone') || st.includes('redirect call')) return 'direct-walkin';
  if (ip.includes('instagram') || ip.includes('facebook')) return 'social-organic';
  if (ip.includes('whatsapp') || st.includes('whatsapp') || ip.includes('zavis')) return 'whatsapp';
  return 'whatsapp'; // the tracker is overwhelmingly the WhatsApp/chat desk
}

/**
 * THE WATERFALL. Order is the contract — renumbering rules is a product
 * decision, not a refactor. Returns null for test rows (excluded entirely).
 *
 *  R1  Returning patient (non-DN file, or phone on a pre-growth patient file) → retention
 *  R2  Partner / influencer / referral / walk-in KEYWORD on the booking or its lead → that channel
 *  R3  Phone matches a widget booking WITH a campaign tag → affiliate (ArabyAds lane) / paid-search (gclid)
 *  R4  Phone matches a widget booking (no lane) → website (Organic SEO)
 *  R5  Phone booked via the AI agent → ai-concierge
 *  R6  Phone matches the reception lead tracker → that lead's channel
 *  R7  Phone shared with ANOTHER patient file (family link) → patient-referral
 *  R8  Booked online by the patient (booked_by APIPatient), no other trace → website
 *  R9  (reserved — doctor column heuristics; not enabled)
 *  R10 No trace at all → direct-walkin (the CEO's default rule)
 */
export function classifyAppointment(a: ApptFacts, L: Lookups): Verdict | null {
  if (a.isTest) return null;

  // R1 — retention outranks everything: an existing patient re-booking through
  // an ad would otherwise inflate new-patient channel economics.
  if (a.mrNo && !isNewFile(a.mrNo)) return { channel: 'retention', ruleId: 'R1', evidence: 'tagged' };
  if (!a.mrNo && a.p9 && L.existingPhones.has(a.p9)) return { channel: 'retention', ruleId: 'R1', evidence: 'inferred' };

  // R2 — explicit words beat phone-trail inference.
  const text = a.p9 ? `${a.freeText} ${L.leadTextByPhone.get(a.p9) ?? ''}` : a.freeText;
  const tagged = tagHit(text);
  if (tagged) return { channel: tagged, ruleId: 'R2', evidence: 'tagged' };

  // R3/R4 — the booking widget trail. A campaign marker in the widget's Source
  // outranks the bare "came via the website": ArabyAds lane → affiliate (they
  // are a commission partner, not our paid-social spend), gclid /
  // utm_source=google → paid-search (Google auto-tagging appends gclid to
  // every ad click, so this lights up as soon as the site forwards it).
  const widget = a.p9 ? L.widgetByPhone.get(a.p9) : undefined;
  if (widget?.hasLane) return { channel: 'affiliate', ruleId: 'R3', evidence: 'tagged' };
  if (widget?.paidSearch) return { channel: 'paid-search', ruleId: 'R3', evidence: 'tagged' };
  if (widget) return { channel: 'website', ruleId: 'R4', evidence: 'tagged' };

  // R5 — AI-agent bookings.
  if (a.p9 && L.aiAgentPhones.has(a.p9)) return { channel: 'ai-concierge', ruleId: 'R5', evidence: 'tagged' };

  // R6 — the reception lead tracker.
  const leadCh = a.p9 ? L.leadChannelByPhone.get(a.p9) : undefined;
  if (leadCh) return { channel: leadCh, ruleId: 'R6', evidence: 'tagged' };

  // R7 — family link: this phone carries another, different patient file.
  if (a.p9) {
    const files = L.filesByPhone.get(a.p9);
    if (files && (files.size > 1 || (a.mrNo && files.size === 1 && !files.has(a.mrNo)))) {
      return { channel: 'patient-referral', ruleId: 'R7', evidence: 'inferred' };
    }
  }

  // R8 — self-booked online, nothing else known.
  if (/^apipatient$/i.test(a.bookedBy.trim())) return { channel: 'website', ruleId: 'R8', evidence: 'inferred' };

  // R10 — the floor.
  return { channel: 'direct-walkin', ruleId: 'R10', evidence: 'inferred' };
}

/** The ordered rule list for the UI explainer — MUST mirror classifyAppointment. */
export const WATERFALL_RULES: { id: string; evidence: Evidence; text: string }[] = [
  { id: 'R1', evidence: 'tagged', text: 'Returning patient (existing file series) → Retention — never counted as a new acquisition.' },
  { id: 'R2', evidence: 'tagged', text: 'A tag word on the booking or its lead — "smile club", "influencer", "referred by Dr …", "walk in" — routes it to that channel.' },
  { id: 'R3', evidence: 'tagged', text: 'Phone matches a website-widget booking carrying a campaign tag — ArabyAds lane → Affiliates (ArabyAds); gclid / utm_source=google → Paid Search.' },
  { id: 'R4', evidence: 'tagged', text: 'Phone matches a website-widget booking with no campaign tag → Organic SEO (search engines).' },
  { id: 'R5', evidence: 'tagged', text: 'Phone booked through the Zavis AI agent → AI Concierge.' },
  { id: 'R6', evidence: 'tagged', text: 'Phone appears in the reception lead tracker → that enquiry’s channel (WhatsApp, Instagram, lead form → Paid…).' },
  { id: 'R7', evidence: 'inferred', text: 'Phone is shared with another patient file (family member) → Patient / Family Referral.' },
  { id: 'R8', evidence: 'inferred', text: 'Patient booked themselves online (APIPatient) with no other trace → Website.' },
  { id: 'R10', evidence: 'inferred', text: 'No trace at all → Direct / Walk-in — the agreed default for untagged new patients.' },
];
