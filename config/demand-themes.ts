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

/** Spelling, local-intent and price variants remain explicit provider inputs. */
function seedVariants(en: string[], ar: string[]): DemandTheme['keywords'] {
  return {
    en: [...new Set(en.flatMap((k) => [k, `${k} dubai`, `${k} price`, `${k} cost`]))],
    ar: [...new Set(ar.flatMap((k) => [k, k.replace(/[أإآ]/g, 'ا'), `${k} دبي`, `تكلفة ${k}`, `سعر ${k}`]))],
  };
}

export const DEMAND_THEMES: readonly DemandTheme[] = [
  { key: 'gaps', label: 'Gaps & spacing', pattern: /\b(diastema|gaps?|spacing|spaces between teeth)\b|فراغات|فلجة|تباعد/, keywords: seedVariants(["tooth gap","teeth gap","gap teeth","gap in front teeth","gap between teeth","teeth spacing","spaces between teeth","diastema","diastema treatment","gap teeth fix","close teeth gap","gap teeth braces","gap teeth bonding","gap teeth veneers"], ["فراغات الأسنان","فلجة الأسنان","تباعد الأسنان","سد الفراغات بين الأسنان"]), firstTreatmentValueAed: null, contributionMargin: null },
  { key: 'gummy', label: 'Gummy smile', pattern: /gummy|gum contour|gum reshap|gum lift|excess gum|gingivectomy|ابتسامة لثوية|ابتسامه لثويه|قص اللثة|تجميل اللثة|علاج الابتسامة اللثوية/, keywords: seedVariants(["gummy smile","gummy smile treatment","gum contouring","gum reshaping","gingivectomy","gummy smile botox","gummy smile surgery","laser gum contouring","excess gum smile","gum lift"], ["ابتسامة لثوية","ابتسامه لثويه","قص اللثة","تجميل اللثة","علاج الابتسامة اللثوية"]), firstTreatmentValueAed: 5000, contributionMargin: null },
  { key: 'emergency', label: 'Emergency / pain', pattern: /emergency|toothache|tooth ache|\bpain\b|broken tooth|cracked tooth|abscess|urgent dentist|طوارئ|الم الاسنان|وجع|خراج|كسر الاسنان/, keywords: seedVariants(["emergency dentist","emergency dental clinic","toothache","tooth ache","dental pain","tooth pain relief","broken tooth","cracked tooth","dental abscess","urgent dentist"], ["طوارئ الأسنان","ألم الأسنان","وجع الأسنان","خراج الأسنان","كسر الأسنان"]), firstTreatmentValueAed: null, contributionMargin: null },
  { key: 'implants', label: 'Implants & missing teeth', pattern: /implant|missing (tooth|teeth)|dentures?|زراعة|زرع الاسنان|تعويض الاسنان|طقم الاسنان|اسنان مفقودة/, keywords: seedVariants(["dental implants","tooth implant","teeth implants","implant surgery","missing tooth replacement","missing teeth","all on 4 implants","all on four implants","dental implant specialist","dentures"], ["زراعة الأسنان","زرع الأسنان","زراعة اسنان","تعويض الأسنان المفقودة","طقم الأسنان"]), firstTreatmentValueAed: null, contributionMargin: null },
  { key: 'ortho', label: 'Protruding / crooked teeth', pattern: /aligner|invisalign|braces|ortho|crooked|protrud|crowd(?:ed|ing)|تقويم|ازدحام الاسنان|بروز الاسنان/, keywords: seedVariants(["invisalign","clear aligners","clear braces","metal braces","ceramic braces","crooked teeth","protruding teeth","crowded teeth","teeth crowding","orthodontist"], ["تقويم الأسنان","تقويم اسنان شفاف","تقويم معدني","ازدحام الأسنان","بروز الأسنان"]), firstTreatmentValueAed: 18500, contributionMargin: null },
  { key: 'veneers', label: 'Veneers / Hollywood smile', pattern: /veneer|hollywood|dental laminate|هوليود|هوليوود|فينير|قشور|عدسات/, keywords: seedVariants(["dental veneers","teeth veneers","porcelain veneers","composite veneers","hollywood smile","hollywood teeth","dental laminates","e max veneers","emax veneers","smile veneers"], ["فينير الأسنان","قشور الأسنان","ابتسامة هوليود","ابتسامة هوليوود","عدسات الأسنان"]), firstTreatmentValueAed: null, contributionMargin: null },
  { key: 'whitening', label: 'Stains & whitening', pattern: /whiten|bleaching|yellow teeth|stain|coffee|smok(?:e|er|ing)|تبييض|تصبغ|تصبغات|اصفرار|بقع الاسنان/, keywords: seedVariants(["teeth whitening","tooth whitening","teeth bleaching","laser teeth whitening","zoom whitening","coffee stains teeth","smoking stains teeth","stained teeth","yellow teeth treatment","dental whitening"], ["تبييض الأسنان","تبييض اسنان بالليزر","تصبغات الأسنان","إزالة بقع الأسنان","اصفرار الأسنان"]), firstTreatmentValueAed: 1699, contributionMargin: null },
  { key: 'hygiene', label: 'Bad breath & hygiene', pattern: /cleaning|scaling|polishing|scale and polish|bad breath|halitosis|hygiene|check[ -]?up|first look|smile club|تنظيف|رائحة الفم|تلميع|جير الاسنان/, keywords: seedVariants(["teeth cleaning","dental cleaning","scaling and polishing","scale and polish","deep dental cleaning","bad breath","bad breath treatment","halitosis treatment","dental hygiene","dental checkup"], ["تنظيف الأسنان","إزالة جير الأسنان","تلميع الأسنان","رائحة الفم","علاج رائحة الفم"]), firstTreatmentValueAed: 799, contributionMargin: null },
  { key: 'other', label: 'Other', pattern: /general dentist|dentist consultation|family dentist|dental clinic|dental examination|dental advice|dental consultation|dentist appointment|طبيب اسنان|عيادة اسنان|استشارة|فحص الاسنان/, keywords: seedVariants(["general dentist","dentist consultation","family dentist","dental clinic","dental examination","dental advice","dental consultation","dentist appointment"], ["طبيب أسنان","عيادة أسنان","استشارة طبيب الأسنان","فحص الأسنان"]), firstTreatmentValueAed: null, contributionMargin: null },
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
