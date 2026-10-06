/** Ordered rules: a specific condition wins over a generic treatment mention. */
export interface DemandTheme {
  key: string;
  label: string;
  pattern: RegExp;
  keywords: { en: string[]; ar: string[] };
  /** Task-provided planning value, not measured revenue or profit. */
  firstTreatmentValueAed: number | null;
  /** Unknown until Finance supplies a contribution margin; no invented break-even. */
  contributionMargin: number | null;
}

export const DEMAND_THEMES: readonly DemandTheme[] = [
  { key: 'gaps', label: 'Gaps & spacing', pattern: /\b(diastema|gap(?:s)?|spacing)\b|فراغات|فلجة|تباعد/, keywords: { en: ['tooth gap', 'gap teeth treatment', 'diastema treatment dubai'], ar: ['فراغات الأسنان'] }, firstTreatmentValueAed: null, contributionMargin: null },
  { key: 'gummy', label: 'Gummy smile', pattern: /gummy|gum contour|gingivectomy|ابتسامة لثوية|ابتسامه لثويه|قص اللثة/, keywords: { en: ['gummy smile treatment dubai'], ar: ['ابتسامة لثوية'] }, firstTreatmentValueAed: 5000, contributionMargin: null },
  { key: 'emergency', label: 'Emergency / pain', pattern: /emergency|toothache|\bpain\b|broken tooth|طوارئ|الم الاسنان|وجع/, keywords: { en: ['emergency dentist dubai'], ar: ['طوارئ الاسنان'] }, firstTreatmentValueAed: null, contributionMargin: null },
  { key: 'implants', label: 'Implants & missing teeth', pattern: /implant|missing (tooth|teeth)|dentures?|زراعة|اسنان مفقودة/, keywords: { en: ['dental implants dubai', 'implant cost dubai'], ar: ['زراعة الأسنان'] }, firstTreatmentValueAed: null, contributionMargin: null },
  { key: 'ortho', label: 'Protruding / crooked teeth', pattern: /aligner|invisalign|braces|ortho|crooked|protrud|crowd(?:ed|ing)|تقويم/, keywords: { en: ['invisalign dubai', 'clear aligners dubai', 'braces price dubai'], ar: ['تقويم الأسنان'] }, firstTreatmentValueAed: 18500, contributionMargin: null },
  { key: 'veneers', label: 'Veneers / Hollywood smile', pattern: /veneer|hollywood|هوليود|هوليوود|فينير|قشور/, keywords: { en: ['veneers dubai', 'hollywood smile dubai'], ar: ['ابتسامة هوليود'] }, firstTreatmentValueAed: null, contributionMargin: null },
  { key: 'whitening', label: 'Stains & whitening', pattern: /whiten|stain|coffee|smok(?:e|er|ing)|تبييض|تصبغ|تصبغات/, keywords: { en: ['teeth whitening dubai', 'teeth whitening price'], ar: ['تبييض الأسنان'] }, firstTreatmentValueAed: 1699, contributionMargin: null },
  { key: 'hygiene', label: 'Bad breath & hygiene', pattern: /cleaning|scaling|polishing|bad breath|halitosis|hygiene|check[ -]?up|first look|smile club|تنظيف|رائحة الفم|تلميع/, keywords: { en: ['teeth cleaning dubai', 'scaling and polishing', 'bad breath treatment'], ar: ['تنظيف الأسنان'] }, firstTreatmentValueAed: 799, contributionMargin: null },
  { key: 'other', label: 'Other', pattern: /$^/, keywords: { en: [], ar: [] }, firstTreatmentValueAed: null, contributionMargin: null },
];

export const META_LAUNCH_DATE = '2026-09-16';
export const DN_CAMPAIGN_TAB = 'DN Campaign Leads  ❤';
export const FOLLOW_UP_FIELDS = ['1st Follow up', '2nd Follow-up', '3rd Follow-up'] as const;
/** No timestamps in these cells: explicit precedence, not a historical event log. */
export const CURRENT_STATUS_FIELDS = ['3rd Follow-up', '2nd Follow-up', '1st Follow up', 'New Update'] as const;
export const OUTCOME_RULES = {
  negative: /(?:not|never)\s+(?:yet\s+)?(?:interested|intersted)|uninterested|cancel|no[ -]?show|did not attend|declined/i,
  notConverted: /(?:not|never)\s+(?:yet\s+)?(?:converted|arrived|completed|attended|treated)/i,
  notBooked: /(?:not|never)\s+(?:yet\s+)?booked|no (?:appointment|booking)|appointment not/i,
  converted: /(?:new patient\s+)?converted|arrived|completed|attended|treated/i,
  booked: /\bbooked\b|^appointment$|appointment\s+(?:confirmed|scheduled)|(?:confirmed|scheduled)\s+appointment|rescheduled/i,
  interested: /\binterested\b|\bintersted\b|will visit|wants? to (?:visit|book)/i,
  noAnswer: /no\s*(?:answer|response|reply)|\bna\b|not answering|not reached|not contacted|unreachable/i,
  reached: /\breplied\b|\bresponded\b|\banswered\b|spoke|discussed|\breached\b/i,
  call: /\bcall(?:ed|ing)?\b|phoned|spoke/i,
  nextAction: /call\s*back|follow[ -]?up|tomorrow|next (?:week|day)|\d{1,2}[./-]\d{1,2}/i,
  excluded: /\btest\b|\bspam\b|\bjob\b|applicant|vacanc|supplier|vendor|no inquir/i,
  existing: /existing|regular patient|old patient|recall|review appointment/i,
  barriers: {
    language: /no english|language|arabic only/i,
    price: /expensive|out of budget|too (?:high|costly)|cannot afford/i,
    notInterested: /not\s+intere?s?ted|not interested|uninterested/i,
    international: /international (?:number|phone)|overseas/i,
    outOfArea: /located in ajman|jabal ali|jebel ali|out of area|too far/i,
  },
};

export const PRODUCT_RULES = { highDemand: 500, lowDemand: 50, highCompetition: 80, highValueAed: 4000, minimumInterested: 10 } as const;
