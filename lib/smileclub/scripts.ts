/**
 * Smile Club scripts curated per dentist (rev. 25 Sep) — each dentist presents
 * Smile Club to their OWN patients, in their own name, with a reason that fits
 * their specialty.
 *
 * - WhatsApp goes to patient SEGMENTS (active · inactive · dormant) as one
 *   message per segment — never personalised with a patient's name.
 * - Every filming appointment yields TWO videos: Smile Club + the dentist's
 *   lane campaign (DN Scan, First Look, Glow Up, urgent care, Restore).
 * - Languages by branch: Dr. Tosun Dental Clinic (Turkish specialty clinic) →
 *   Turkish + English; Al Wasl → Arabic + English; AMC → Arabic + English
 *   (confirmed 25 Sep). Turkish and Arabic are drafts for native review.
 *
 * Branch rosters from the doctors' schedule (branch-wise). Professional names
 * and clinic days only — no personal data.
 */

export type Branch = 'tosun' | 'alwasl' | 'amc';
export type Specialty = 'ortho' | 'general' | 'perio' | 'hygiene' | 'pedo' | 'prostho' | 'endo';
export type Lang = 'en' | 'tr' | 'ar';
export type PatientSeg = 'active' | 'inactive' | 'dormant';
export type LaneId = 'scan' | 'firstlook' | 'glowup' | 'sos' | 'restore';

export const BRANCH_LABEL: Record<Branch, string> = {
  tosun: 'Dr. Tosun Dental Clinic',
  alwasl: 'Dental Nation Al Wasl',
  amc: 'Al Maher Medical Centre',
};

const BRANCH_NAME: Record<Lang, Record<Branch, string>> = {
  en: BRANCH_LABEL,
  tr: BRANCH_LABEL,
  ar: { tosun: 'Dr. Tosun Dental Clinic', alwasl: 'دنتال نيشن الوصل', amc: 'مركز الماهر الطبي' },
};

/** Default languages per branch — the first is the branch's main language. */
export const BRANCH_LANGS: Record<Branch, Lang[]> = {
  tosun: ['tr', 'en'],
  alwasl: ['ar', 'en'],
  amc: ['ar', 'en'],
};

export const LANG_LABEL: Record<Lang, string> = { en: 'English', tr: 'Türkçe · Turkish', ar: 'العربية · Arabic' };

/** Who checks each translation before anything is sent or filmed. */
export const LANG_REVIEW: Record<Lang, string> = {
  en: 'Final wording.',
  tr: 'Draft translation — to be checked by a Turkish-speaking dentist at Dr. Tosun Dental Clinic before use.',
  ar: 'Draft translation — to be checked by an Arabic-speaking dentist (names and job titles in Arabic script, male/female wording) before use.',
};

export const PATIENT_SEGS: { id: PatientSeg; label: string; when: string }[] = [
  { id: 'active', label: 'Active — check-up due', when: 'Wave 1 · from Tue 29 Sep' },
  { id: 'inactive', label: 'Inactive — last seen 6–18 months ago', when: 'Wave 2 · from Mon 5 Oct' },
  { id: 'dormant', label: 'Dormant — last seen over 18 months ago', when: 'Wave 3 · from Mon 12 Oct' },
];

export interface Lane { name: string; tag: string; page: string; offer: string }

/** The lane campaigns that already run on dentalnation.com (Ads → Lanes & landing pages). */
export const LANES: Record<LaneId, Lane> = {
  scan: { name: 'The DN Scan', tag: 'Lane J', page: '/en/scan', offer: 'Braces & aligner planning — 3D scan, specialist consultation and written plan, AED 499, fully deducted if treatment goes ahead' },
  firstlook: { name: 'The DN First Look', tag: 'Lane B', page: '/en/first-look', offer: 'Welcome visit — full examination, digital X-rays and professional clean, AED 799 all-inclusive' },
  glowup: { name: 'The DN Glow Up', tag: 'Lane E', page: '/en/glow-up', offer: 'Zoom whitening, dentist-supervised, about one hour, AED 1,699 all-inclusive' },
  sos: { name: 'Urgent dental care (DN SOS)', tag: 'Lane D', page: '/en/sos', offer: 'Seen within 60 minutes, AED 699 all-inclusive, at Al Maher Medical Centre' },
  restore: { name: 'Restore', tag: 'Lane C', page: '/en/care-journeys/restore', offer: 'Crowns, bridges and implants — consultation from AED 1,000, full cost in writing first' },
};

const LANE_BY_SPECIALTY: Record<Specialty, LaneId> = {
  ortho: 'scan', general: 'firstlook', perio: 'firstlook', hygiene: 'glowup', pedo: 'firstlook', prostho: 'restore', endo: 'sos',
};

export interface Dentist {
  id: string;
  name: string;
  title: string;
  branch: Branch;
  specialty: Specialty;
  days: string;
  /** Tracking code for this dentist's WhatsApp messages. */
  code: string;
  /** Overrides the specialty's lane for the second video. */
  lane?: LaneId;
  laneWhy?: string;
  note?: string;
}

export const DENTISTS: Dentist[] = [
  { id: 'yahya-tosun', name: 'Dr. Yahya Tosun', title: 'Specialist Orthodontist', branch: 'tosun', specialty: 'ortho', days: 'Mon–Tue, Thu–Sat', code: 'SC-DR-TOSUN' },
  { id: 'dilsad-ozdogan', name: 'Dr. Dilsad Ozdogan', title: 'General Dentist', branch: 'tosun', specialty: 'general', days: 'Tue–Sat', code: 'SC-DR-DILSAD', lane: 'glowup', laneWhy: 'Glow Up has no video yet — its Facebook/Instagram campaign is waiting for creative, so this is the most useful second video.' },
  { id: 'maysoon-abdelmajeed', name: 'Dr. Maysoon Abdelmajeed', title: 'General Dentist', branch: 'tosun', specialty: 'general', days: 'Mon–Tue, Thu–Sat', code: 'SC-DR-MAYSOON' },
  { id: 'bulent-ozdogan', name: 'Dr. Bulent Ozdogan', title: 'General Dentist', branch: 'tosun', specialty: 'general', days: 'Tue, Thu, Sat', code: 'SC-DR-BULENT' },
  { id: 'sevinc-behruzoglu', name: 'Dr. Sevinc Behruzoglu', title: 'General Dentist', branch: 'tosun', specialty: 'general', days: 'Mon, Wed', code: 'SC-DR-SEVINC' },
  { id: 'maysoun-ahmad', name: 'Dr. Maysoun Ahmad', title: 'General Dentist', branch: 'tosun', specialty: 'general', days: 'Mon', code: 'SC-DR-MAYSOUN' },
  { id: 'sathyapriya-surendar', name: 'Dr. Sathyapriya Surendar', title: 'Periodontist', branch: 'tosun', specialty: 'perio', days: 'Tue–Wed', code: 'SC-DR-SATHYA' },

  { id: 'hasna-alsaeed', name: 'Dr. Hasna Alsaeed', title: 'Consultant Orthodontist', branch: 'alwasl', specialty: 'ortho', days: 'Sun', code: 'SC-DR-HASNA' },
  { id: 'ali-ghasemi', name: 'Dr. Ali Ghasemi', title: 'Hygienist', branch: 'alwasl', specialty: 'hygiene', days: 'Sat–Thu', code: 'SC-DR-ALI' },
  { id: 'safwan-sultan', name: 'Dr. M Safwan Sultan', title: 'General Dentist', branch: 'alwasl', specialty: 'general', days: 'Sat–Thu', code: 'SC-DR-SAFWAN' },
  { id: 'yasmin-youssef', name: 'Dr. Yasmin Youssef', title: 'Orthodontist', branch: 'alwasl', specialty: 'ortho', days: 'Sun', code: 'SC-DR-YASMIN' },
  { id: 'ghada-hussain', name: 'Dr. Ghada Hussain', title: 'Pedodontist (children’s dentist)', branch: 'alwasl', specialty: 'pedo', days: 'Sat', code: 'SC-DR-GHADA' },
  { id: 'mohammad-qasem', name: 'Dr. Mohammad Qasem', title: 'Periodontist', branch: 'alwasl', specialty: 'perio', days: 'Thu', code: 'SC-DR-QASEM' },
  { id: 'helmi-shaath', name: 'Dr. Helmi Shaath', title: 'Prosthodontist', branch: 'alwasl', specialty: 'prostho', days: 'Sat', code: 'SC-DR-HELMI' },
  { id: 'chahira-berlarbi', name: 'Dr. Chahira Berlarbi', title: 'Dentist', branch: 'alwasl', specialty: 'general', days: 'Mon–Thu, Sat', code: 'SC-DR-CHAHIRA', note: 'Specialty not listed on the schedule — using the general script; confirm with Dr Luvi.' },

  { id: 'maher-selman', name: 'Dr. Maher Selman', title: 'Consultant Endodontist & Implantologist', branch: 'amc', specialty: 'endo', days: 'Sun–Mon, Wed–Thu', code: 'SC-DR-MAHER' },
  { id: 'suzanna-almaali', name: 'Dr. Suzanna Almaali', title: 'Specialist Orthodontist', branch: 'amc', specialty: 'ortho', days: 'Sun', code: 'SC-DR-SUZANNA' },
  { id: 'leila-mostawe', name: 'Dr. Leila Mostawe', title: 'General Dentist', branch: 'amc', specialty: 'general', days: 'Sun, Tue, Thu', code: 'SC-DR-LEILA' },
];

export const laneFor = (d: Dentist): LaneId => d.lane ?? LANE_BY_SPECIALTY[d.specialty];
export const langsFor = (d: Dentist): Lang[] => BRANCH_LANGS[d.branch];

/** Job titles on camera in Turkish and Arabic (English uses the dentist's own title). */
const TITLE: Record<'tr' | 'ar', Record<Specialty, string>> = {
  tr: { ortho: 'Ortodonti Uzmanı', general: 'Diş Hekimi', perio: 'Periodontoloji Uzmanı', hygiene: 'Diş Hijyenisti', pedo: 'Çocuk Diş Hekimi', prostho: 'Protetik Diş Tedavisi Uzmanı', endo: 'Endodonti ve İmplantoloji Uzmanı' },
  ar: { ortho: 'أخصائي تقويم الأسنان', general: 'طبيب أسنان عام', perio: 'أخصائي أمراض اللثة', hygiene: 'أخصائي صحة الفم والأسنان', pedo: 'طبيب أسنان الأطفال', prostho: 'أخصائي تركيبات الأسنان', endo: 'استشاري علاج العصب وزراعة الأسنان' },
};

/** Why THIS dentist's patients should care — the specialty angle. */
const ANGLE: Record<Lang, Record<Specialty, { chair: string; why: string }>> = {
  en: {
    ortho: { chair: 'While we straighten your teeth, keeping them clean and healthy matters just as much — Smile Club puts your check-ups and cleanings into the plan.', why: 'A straight smile deserves to stay healthy — with braces or aligners, regular check-ups and professional cleaning matter even more.' },
    general: { chair: 'The best way to avoid bigger problems is to keep your check-ups and cleanings on track — Smile Club makes that simple for the whole year.', why: 'Most dental problems start small — catching them early keeps treatment simple and costs down.' },
    perio: { chair: 'Healthy gums need regular maintenance — with Smile Club your preventive visits are planned for the year, so nothing slips.', why: 'Healthy gums are the foundation of a healthy smile — and they need regular care, not just a visit when something bleeds or hurts.' },
    hygiene: { chair: 'A professional cleaning every six months is the simplest protection there is — Smile Club includes it, so you never have to think about booking.', why: 'A professional cleaning every six months is the simplest protection for your teeth and gums.' },
    pedo: { chair: 'Good habits start young — Smile Club helps the whole family keep regular check-ups, children included.', why: 'Good dental habits start young — regular check-ups help children grow up with healthy, confident smiles.' },
    prostho: { chair: 'If you’re planning crowns, bridges or dentures, members pay member rates on eligible treatments — and regular check-ups help your new teeth last.', why: 'Crowns, bridges and dentures last longest when they are looked after with regular check-ups.' },
    endo: { chair: 'After a root canal or an implant, regular check-ups protect the work we’ve done — and members pay member rates on eligible treatments.', why: 'After a root canal or an implant, regular check-ups are what protect the work — and your investment.' },
  },
  tr: {
    ortho: { chair: 'Dişlerinizi düzeltirken onları temiz ve sağlıklı tutmak da aynı derecede önemlidir. Smile Club, seçtiğiniz plana göre diş kontrolleri ve profesyonel diş temizliği sunar.', why: 'Düzgün dişlerin sağlıklı kalması da önemlidir. Diş teli ya da şeffaf plak kullanırken düzenli diş kontrolleri ve profesyonel diş temizliği daha da önemlidir.' },
    general: { chair: 'Daha büyük sorunları önlemenin en iyi yolu diş kontrollerini ve profesyonel diş temizliğini aksatmamaktır. Smile Club, yıl boyunca bunu kolaylaştırır.', why: 'Diş sorunlarının çoğu küçük başlar. Erken fark edilmeleri tedaviyi kolaylaştırır ve maliyeti azaltır.' },
    perio: { chair: 'Sağlıklı diş etleri düzenli bakım ister. Smile Club ile koruyucu diş hekimi ziyaretleriniz yıl boyunca planlanır; böylece takiplerini yapmak kolaylaşır.', why: 'Sağlıklı diş etleri, sağlıklı bir gülüşün temelidir. Yalnızca kanama ya da ağrı olduğunda değil, düzenli olarak bakım gerektirir.' },
    hygiene: { chair: 'Altı ayda bir profesyonel diş temizliği, dişlerinizi korumanın en basit yollarından biridir. Smile Club, seçtiğiniz plana göre profesyonel diş temizliği sunarak düzenli bakımınızı planlamanızı kolaylaştırır.', why: 'Altı ayda bir profesyonel diş temizliği, dişlerinizi ve diş etlerinizi korumanın en basit yollarından biridir.' },
    pedo: { chair: 'İyi alışkanlıklar küçük yaşta başlar. Smile Club, çocuklar dahil tüm ailenin düzenli diş kontrollerini sürdürmesine yardımcı olur.', why: 'İyi ağız ve diş sağlığı alışkanlıkları küçük yaşta başlar. Düzenli diş kontrolleri, çocukların sağlıklı ve özgüvenli gülüşlerle büyümesine yardımcı olur.' },
    prostho: { chair: 'Kron, köprü ya da diş protezi düşünüyorsanız üyelik koşullarına uygun tedavilerde üyelere özel fiyatlardan yararlanabilirsiniz. Düzenli diş kontrolleri de yeni dişlerinizin daha uzun ömürlü olmasına yardımcı olur.', why: 'Kron, köprü ve diş protezleri, düzenli diş kontrolleriyle takip edildiğinde daha uzun ömürlü olur.' },
    endo: { chair: 'Kanal tedavisi ya da implant sonrasında düzenli diş kontrolleri, yapılan tedaviyi korumaya yardımcı olur. Üyelik koşullarına uygun tedavilerde üyelere özel fiyatlardan da yararlanabilirsiniz.', why: 'Kanal tedavisi ya da implant sonrasında düzenli diş kontrolleri, yapılan tedaviyi ve ona yaptığınız yatırımı korumaya yardımcı olur.' },
  },
  ar: {
    ortho: { chair: 'خلال تقويم أسنانكم، لا تقلّ العناية بنظافتها وصحتها أهمية. وعضوية Smile Club تتضمن فحوصات دورية وتنظيفاً احترافياً للأسنان بحسب الخطة.', why: 'الابتسامة المتناسقة تستحق أن تبقى صحية. ومع التقويم الثابت أو قوالب التقويم الشفافة، تصبح الفحوصات الدورية والتنظيف الاحترافي للأسنان أكثر أهمية.' },
    general: { chair: 'أفضل طريقة لتجنّب المشكلات الكبيرة هي الالتزام بالفحوصات الدورية والتنظيف الاحترافي للأسنان. وعضوية Smile Club تسهّل ذلك طوال العام.', why: 'معظم مشاكل الأسنان تبدأ صغيرة — واكتشافها مبكراً يجعل العلاج أبسط والتكلفة أقل.' },
    perio: { chair: 'اللثة السليمة تحتاج إلى عناية منتظمة. ومع Smile Club، تُخطّط الزيارات الوقائية طوال العام لتسهيل الالتزام بها.', why: 'اللثة السليمة هي أساس الابتسامة الصحية — وتحتاج إلى عناية منتظمة، لا إلى زيارة فقط عند النزيف أو الألم.' },
    hygiene: { chair: 'التنظيف الاحترافي للأسنان كل ستة أشهر من أبسط طرق العناية بها. وعضوية Smile Club تتضمن التنظيف بحسب الخطة، وتساعد على التخطيط للعناية المنتظمة.', why: 'التنظيف الاحترافي للأسنان كل ستة أشهر من أبسط طرق العناية بالأسنان واللثة.' },
    pedo: { chair: 'العادات الجيدة تبدأ منذ الصغر. وعضوية Smile Club تساعد العائلة كلها، بما فيها الأطفال، على الالتزام بالفحوصات الدورية.', why: 'العادات الصحية للأسنان تبدأ منذ الصغر، والفحوصات الدورية تساعد الأطفال على النمو بابتسامات صحية وواثقة.' },
    prostho: { chair: 'عند التخطيط لتيجان أو جسور أو أطقم أسنان، تتوفر أسعار خاصة للأعضاء للعلاجات المؤهلة. كما تساعد الفحوصات الدورية على إطالة عمر الأسنان الجديدة.', why: 'التيجان والجسور وأطقم الأسنان تدوم أطول عندما تتم متابعتها بالفحوصات الدورية.' },
    endo: { chair: 'بعد علاج العصب أو زراعة الأسنان، تساعد الفحوصات الدورية على الحفاظ على نتائج العلاج. وتتوفر أسعار خاصة للأعضاء للعلاجات المؤهلة.', why: 'بعد علاج العصب أو زراعة الأسنان، تساعد الفحوصات الدورية على الحفاظ على نتائج العلاج وما استُثمر فيه.' },
  },
};

/** One accurate, plain description of the offer — used everywhere. */
export const OFFER = 'Membership starts from AED 99 a month. Depending on the plan, it includes check-ups and a professional cleaning, help when you have an urgent dental problem, priority appointments, and member rates on eligible treatments.';

/** Fixed wording per language. */
const COPY: Record<Lang, {
  offer: string;
  partOf: string;
  hello: (name: string, from: string) => string;
  seg: Record<PatientSeg, string>;
  club: Record<PatientSeg, string>;
  cta: Record<PatientSeg, string>;
  stop: string;
  invite: string;
  vIntro: (name: string, title: string, where: string) => string;
  vWhy: string;
  vKeep: string;
  vEnd: string;
}> = {
  en: {
    offer: OFFER,
    partOf: ', part of Dental Nation',
    hello: (name, from) => `Hello, this is ${name} from ${from}.`,
    seg: {
      active: 'Your next check-up is coming up, so it’s a good moment to tell you about something new.',
      inactive: 'It’s been a while since your last visit, and I wanted to check in.',
      dormant: 'It’s been a long time since we last saw you — you are always welcome back, with no pressure at all.',
    },
    club: {
      active: 'Smile Club is a simple way to keep your dental care on track all year, instead of waiting until something hurts.',
      inactive: 'Smile Club is an easy way to get your dental care back on track and keep it there all year.',
      dormant: 'Whenever you decide to come back, Smile Club makes it simple.',
    },
    cta: {
      active: 'Just reply to this message and my team will explain the plans and book your check-up.',
      inactive: 'Reply to this message and my team will explain the plans and find a time that suits you.',
      dormant: 'If you’d like to hear more, just reply and my team will explain — no obligation.',
    },
    stop: '(Reply STOP if you’d prefer not to receive these messages.)',
    invite: 'I’ve signed an invitation for you — the front desk can explain the plans in a minute.',
    vIntro: (name, title, where) => `[On camera, in the clinic] Hi, I’m ${name}, ${title} at ${where}.`,
    vWhy: 'That’s why we created Smile Club by Dental Nation.',
    vKeep: 'It’s care that keeps you ahead of problems — not just treatment when something hurts.',
    vEnd: '[End card] Ask at reception, scan the QR code, or message us on WhatsApp to join Smile Club.',
  },
  tr: {
    offer: 'Üyelik aylık 99 AED’den başlar. Plana göre diş kontrolleri, profesyonel diş temizliği, acil diş sorunlarında destek, öncelikli randevular ve üyelik koşullarına uygun tedavilerde üyelere özel fiyatlar sunar.',
    partOf: ' (Dental Nation bünyesinde)',
    hello: (name, from) => `Merhaba, ben ${name}. Sizlere ${from} ekibinden yazıyorum.`,
    seg: {
      active: 'Bir sonraki diş kontrolünüz yaklaşıyor. Bu vesileyle sizlerle bir yeniliği paylaşmak istedim.',
      inactive: 'Son ziyaretinizin üzerinden biraz zaman geçti. Sizlere yeniden ulaşmak istedim.',
      dormant: 'Uzun zamandır görüşemedik. Ne zaman isterseniz sizi yeniden görmekten mutluluk duyarız; kendinizi mecbur hissetmeyin.',
    },
    club: {
      active: 'Smile Club, ağrı başlamasını beklemeden diş bakımınızı yıl boyunca düzenli sürdürmenin kolay bir yoludur.',
      inactive: 'Smile Club, diş bakımınızı yeniden düzene koymanızı ve yıl boyunca düzenli sürdürmenizi kolaylaştırır.',
      dormant: 'Yeniden gelmeye karar verdiğinizde Smile Club bu adımı kolaylaştırır.',
    },
    cta: {
      active: 'Bu mesaja yanıt vermeniz yeterli; ekibim planları açıklayıp diş kontrolü randevunuzu ayarlayacaktır.',
      inactive: 'Bu mesaja yanıt vermeniz yeterli; ekibim planları açıklayıp size uygun bir randevu saati bulacaktır.',
      dormant: 'Daha fazla bilgi için bu mesaja yanıt vermeniz yeterli; ekibim planları açıklayacaktır. Herhangi bir yükümlülüğünüz yoktur.',
    },
    stop: '(Bu mesajları almak istemiyorsanız bu mesaja STOP yazarak yanıt verebilirsiniz.)',
    invite: 'Sizin için bir davetiye imzaladım. Resepsiyon ekibi planları bir dakikada açıklayabilir.',
    vIntro: (name, title, where) => `[Kamerada, klinikte] Merhaba, ben ${name}. ${title} olarak ${where} ekibindeyim.`,
    vWhy: 'Dental Nation olarak Smile Club üyeliğini bu nedenle oluşturduk.',
    vKeep: 'Amaç, yalnızca ağrı olduğunda tedavi etmek değil, düzenli bakımla sorunların önüne geçmenize yardımcı olmaktır.',
    vEnd: '[Kapanış kartı] Smile Club üyeliği için resepsiyona danışın, QR kodu okutun ya da bize WhatsApp üzerinden yazın.',
  },
  ar: {
    offer: 'تبدأ العضوية من 99 درهماً شهرياً. وبحسب الخطة، تشمل الفحوصات الدورية وتنظيفاً احترافياً للأسنان، والمساعدة عند وجود مشكلة طارئة في الأسنان، وأولوية في المواعيد، وأسعاراً خاصة للأعضاء للعلاجات المؤهلة.',
    partOf: '، إحدى عيادات دنتال نيشن',
    hello: (name, from) => `مرحباً، معكم ${name} من ${from}.`,
    seg: {
      active: 'يقترب موعد فحوصاتكم الدورية، وأودّ أن أشارككم خبراً جديداً.',
      inactive: 'مرّ بعض الوقت منذ زياراتكم الأخيرة، وأحببت أن أطمئن عليكم.',
      dormant: 'لم نلتقِ بكم منذ فترة طويلة. يسعدنا استقبالكم مجدداً متى شئتم، دون أي ضغط.',
    },
    club: {
      active: 'Smile Club طريقة بسيطة للعناية بأسنانكم بانتظام طوال العام، بدلاً من الانتظار حتى يبدأ الألم.',
      inactive: 'Smile Club طريقة سهلة للعودة إلى العناية المنتظمة بأسنانكم والاستمرار عليها طوال العام.',
      dormant: 'متى قررتم العودة، يجعل Smile Club هذه الخطوة أسهل.',
    },
    cta: {
      active: 'يكفي الرد على هذه الرسالة، وسيشرح فريقي الخطط ويرتب مواعيد فحوصاتكم الدورية.',
      inactive: 'يكفي الرد على هذه الرسالة، وسيشرح فريقي الخطط ويساعدكم في اختيار مواعيد مناسبة.',
      dormant: 'للمزيد من المعلومات، يكفي الرد على هذه الرسالة، وسيشرح فريقي الخطط دون أي التزام من جانبكم.',
    },
    stop: '(لإيقاف استلام هذه الرسائل، يرجى الرد بكلمة STOP.)',
    invite: 'وقّعت دعوة خاصة بكم، ويمكن لفريق الاستقبال شرح الخطط في دقيقة.',
    vIntro: (name, title, where) => `[أمام الكاميرا، في العيادة] مرحباً، أنا ${name}، ${title} في ${where}.`,
    vWhy: 'لهذا أطلقنا Smile Club من دنتال نيشن.',
    vKeep: 'إنها عناية تساعد على استباق المشكلات، وليست مجرد علاج عند الشعور بالألم.',
    vEnd: '[البطاقة الختامية] للانضمام إلى Smile Club، يمكن الاستفسار لدى الاستقبال، أو مسح رمز QR، أو مراسلتنا عبر واتساب.',
  },
};

type LaneLines = (name: string, title: string, where: string) => string[];

/** The second video — the dentist's lane campaign, filmed in the same session. */
const LANE_VIDEO: Record<LaneId, Record<Lang, LaneLines>> = {
  scan: {
    en: (n, t, w) => [
      `[On camera] Thinking about braces or clear aligners? I’m ${n}, ${t} at ${w}.`,
      'Before you commit to anything, see your plan: a 3D scan of your teeth, a consultation with an orthodontist, and a written treatment plan.',
      'It’s called The DN Scan — AED 499, and the full amount is deducted from your treatment if you go ahead.',
      'No pressure, no guesswork — just a clear plan for your smile.',
      '[End card] Book The DN Scan — link in the ad, or message us on WhatsApp.',
    ],
    tr: (n, t, w) => [
      `[Kamerada] Diş teli ya da şeffaf plak mı düşünüyorsunuz? Ben ${n}. ${t} olarak ${w} ekibindeyim.`,
      'Karar vermeden önce tedavi planınızı görün: dişlerinizin üç boyutlu taraması, bir ortodonti uzmanıyla görüşme ve yazılı tedavi planı.',
      'The DN Scan ücreti 499 AED. Tedaviye başlarsanız bu tutarın tamamı tedavi ücretinizden düşülür.',
      'Baskı olmadan, tahminlerle ilerlemeden; gülüşünüz için net bir plan.',
      '[Kapanış kartı] The DN Scan randevusu için reklamdaki bağlantıyı kullanın ya da bize WhatsApp üzerinden yazın.',
    ],
    ar: (n, t, w) => [
      `[أمام الكاميرا] هل تفكّرون في التقويم الثابت أو قوالب التقويم الشفافة؟ أنا ${n}، ${t} في ${w}.`,
      'قبل أي التزام، يمكنكم الاطّلاع على خطة العلاج: مسح ثلاثي الأبعاد لأسنانكم، واستشارة مع أخصائي تقويم الأسنان، وخطة علاج مكتوبة.',
      'اسمه The DN Scan، بسعر 499 درهماً. ويُخصم المبلغ كاملاً من تكلفة العلاج إذا بدأتم العلاج.',
      'بلا ضغط وبلا تخمين، فقط خطة واضحة لابتسامتكم.',
      '[البطاقة الختامية] لحجز The DN Scan، يمكن استخدام الرابط في الإعلان أو مراسلتنا عبر واتساب.',
    ],
  },
  firstlook: {
    en: (n, t, w) => [
      `[On camera] Hi, I’m ${n}, ${t} at ${w}.`,
      'If it’s been a while since your last check-up, the easiest way to start is The DN First Look.',
      'One visit: a full examination, digital X-rays and a professional clean — AED 799, all-inclusive, no surprises.',
      'You leave knowing exactly where your teeth stand, and what — if anything — needs doing.',
      '[End card] Book The DN First Look — link in the ad, or message us on WhatsApp.',
    ],
    tr: (n, t, w) => [
      `[Kamerada] Merhaba, ben ${n}. ${t} olarak ${w} ekibindeyim.`,
      'Son diş kontrolünüzün üzerinden zaman geçtiyse yeniden başlamanın en kolay yolu The DN First Look.',
      'Tek ziyarette kapsamlı muayene, dijital röntgenler ve profesyonel diş temizliği; her şey dahil 799 AED, sürpriz yok.',
      'Dişlerinizin durumunu ve gerekiyorsa neyin yapılması gerektiğini net olarak öğrenirsiniz.',
      '[Kapanış kartı] The DN First Look randevusu için reklamdaki bağlantıyı kullanın ya da bize WhatsApp üzerinden yazın.',
    ],
    ar: (n, t, w) => [
      `[أمام الكاميرا] مرحباً، أنا ${n}، ${t} في ${w}.`,
      'إذا مرّ وقت على آخر فحص دوري لأسنانكم، فأسهل بداية هي The DN First Look.',
      'زيارة واحدة: فحص شامل، وأشعة رقمية، وتنظيف احترافي للأسنان، بسعر 799 درهماً شاملاً كل شيء، بلا مفاجآت.',
      'بعد الزيارة، تتضح حالة أسنانكم وما يحتاج إلى علاج، إن وُجد.',
      '[البطاقة الختامية] لحجز The DN First Look، يمكن استخدام الرابط في الإعلان أو مراسلتنا عبر واتساب.',
    ],
  },
  glowup: {
    en: (n, t, w) => [
      `[On camera] Coffee, tea, or simply time — teeth lose their brightness. I’m ${n}, ${t} at ${w}.`,
      'The DN Glow Up is professional Zoom whitening, supervised by a dentist, in about an hour.',
      'AED 1,699, all-inclusive — we check your teeth first, so it’s safe and the result looks natural.',
      'A brighter smile, done properly.',
      '[End card] Book The DN Glow Up — link in the ad, or message us on WhatsApp.',
    ],
    tr: (n, t, w) => [
      `[Kamerada] Dişler, kahve, çay veya zamanın etkisiyle parlaklığını kaybedebilir. Ben ${n}. ${t} olarak ${w} ekibindeyim.`,
      'The DN Glow Up, diş hekimi gözetiminde yaklaşık bir saat süren profesyonel Zoom diş beyazlatma işlemidir.',
      'Her şey dahil 1.699 AED — önce dişlerinizi kontrol edip beyazlatmanın size uygun olup olmadığını değerlendiriyoruz.',
      'Daha parlak bir gülüş için profesyonel bakım.',
      '[Kapanış kartı] The DN Glow Up randevusu için reklamdaki bağlantıyı kullanın ya da bize WhatsApp üzerinden yazın.',
    ],
    ar: (n, t, w) => [
      `[أمام الكاميرا] القهوة والشاي ومرور الوقت — كلها تُفقد الأسنان لمعانها. أنا ${n}، ${t} في ${w}.`,
      'The DN Glow Up هو تبييض احترافي للأسنان بتقنية Zoom، بإشراف طبيب أسنان، في نحو ساعة.',
      'بسعر 1,699 درهماً شاملاً كل شيء — نفحص أسنانكم أولاً لتقييم مدى ملاءمة التبييض لكم.',
      'عناية احترافية من أجل ابتسامة أكثر إشراقاً.',
      '[البطاقة الختامية] لحجز The DN Glow Up، يمكن استخدام الرابط في الإعلان أو مراسلتنا عبر واتساب.',
    ],
  },
  sos: {
    en: (n, t, w) => [
      `[On camera] Toothache, a broken tooth, a swelling that won’t wait? I’m ${n}, ${t} at ${w}.`,
      'With Dental Nation’s urgent dental care, you’re seen within 60 minutes.',
      'AED 699, all-inclusive — you know the price before you arrive.',
      'Don’t wait for the pain to get worse. Call us, and we’ll see you today.',
      '[End card] Tap to call now — urgent dental care, seen within 60 minutes.',
    ],
    tr: (n, t, w) => [
      `[Kamerada] Diş ağrısı, kırık diş ya da gecikmeden değerlendirilmesi gereken bir şişlik mi var? Ben ${n}. ${t} olarak ${w} ekibindeyim.`,
      'Dental Nation acil diş sağlığı hizmetinde 60 dakika içinde muayene olursunuz.',
      'Her şey dahil 699 AED — fiyatı gelmeden önce bilirsiniz.',
      'Ağrının artmasını beklemeyin. Acil bir randevu ayarlamak için bizi arayın.',
      '[Kapanış kartı] Hemen arayın: acil diş sağlığı hizmeti, 60 dakika içinde muayene.',
    ],
    ar: (n, t, w) => [
      `[أمام الكاميرا] ألم في الأسنان، أو سن مكسور، أو تورّم لا يحتمل الانتظار؟ أنا ${n}، ${t} في ${w}.`,
      'مع خدمة العناية العاجلة بالأسنان من دنتال نيشن، تُجرى المعاينة خلال 60 دقيقة.',
      'بسعر 699 درهماً شاملاً كل شيء، وتعرفون السعر قبل الوصول.',
      'لا داعي لانتظار اشتداد الألم؛ يمكنكم الاتصال بنا لترتيب موعد عاجل.',
      '[البطاقة الختامية] للاتصال الآن، يرجى الضغط على زر الاتصال: عناية عاجلة بالأسنان، ومعاينة خلال 60 دقيقة.',
    ],
  },
  restore: {
    en: (n, t, w) => [
      `[On camera] Missing a tooth — or several? I’m ${n}, ${t} at ${w}.`,
      'A missing tooth affects how you eat, how you smile, and the teeth around the gap.',
      'It starts with a consultation from AED 1,000: we examine, plan, and give you the full cost in writing before anything begins.',
      'Crowns, bridges or implants — the right option for you, explained clearly.',
      '[End card] Book your Restore consultation — link in the ad, or message us on WhatsApp.',
    ],
    tr: (n, t, w) => [
      `[Kamerada] Eksik bir ya da birkaç dişiniz mi var? Ben ${n}. ${t} olarak ${w} ekibindeyim.`,
      'Eksik bir diş, yemek yemenizi, gülümsemenizi ve boşluğun çevresindeki dişleri etkiler.',
      'İlk adım, 1.000 AED’den başlayan bir danışma randevusudur. Sizi muayene eder, planınızı hazırlar ve tedavi başlamadan önce toplam ücreti yazılı olarak veririz.',
      'Kron, köprü ya da implant — size uygun seçenek, açıkça anlatılır.',
      '[Kapanış kartı] Restore danışma randevusu için reklamdaki bağlantıyı kullanın ya da bize WhatsApp üzerinden yazın.',
    ],
    ar: (n, t, w) => [
      `[أمام الكاميرا] هل لديكم سن مفقود أو أكثر؟ أنا ${n}، ${t} في ${w}.`,
      'فقدان سن واحد يؤثر على طريقة الأكل والابتسامة، وعلى الأسنان المحيطة بالفراغ.',
      'الخطوة الأولى استشارة تبدأ من 1,000 درهم. نجري الفحص ونضع الخطة، ونقدّم التكلفة الكاملة كتابةً قبل البدء بأي إجراء.',
      'تيجان أو جسور أو زراعة أسنان، مع شرح واضح للخيار المناسب لكم.',
      '[البطاقة الختامية] لحجز استشارة Restore، يمكن استخدام الرابط في الإعلان أو مراسلتنا عبر واتساب.',
    ],
  },
};

export interface DentistScripts {
  chair: string;
  /** One message per patient segment — sent to the segment list, never personalised. */
  whatsapp: Record<PatientSeg, string>;
  /** Video 1 — Smile Club. */
  clubVideo: string;
  /** Video 2 — the dentist's lane campaign, filmed in the same session. */
  laneVideo: string;
}

export function scriptsFor(d: Dentist, lang: Lang): DentistScripts {
  const c = COPY[lang];
  const a = ANGLE[lang][d.specialty];
  const where = BRANCH_NAME[lang][d.branch];
  const from = `${where}${d.branch === 'alwasl' ? '' : c.partOf}`;
  const title = lang === 'en' ? d.title : TITLE[lang][d.specialty];
  const wa = (s: PatientSeg) => [c.hello(d.name, from), c.seg[s], a.why, `${c.club[s]} ${c.offer}`, c.cta[s], c.stop].join('\n\n');
  return {
    chair: `“${a.chair} ${c.invite}”`,
    whatsapp: { active: wa('active'), inactive: wa('inactive'), dormant: wa('dormant') },
    clubVideo: [c.vIntro(d.name, title, where), a.why, `${c.vWhy} ${c.offer}`, c.vKeep, c.vEnd].join('\n'),
    laneVideo: LANE_VIDEO[laneFor(d)][lang](d.name, title, where).join('\n'),
  };
}

/** Words that must never appear in Smile Club scripts (regulatory). */
export const BANNED_WORDS = ['insurance', 'coverage', 'covered', 'claim', 'premium', 'policy', 'insured'];
/** The same rule in Turkish and Arabic. */
export const BANNED_TR_AR = ['sigorta', 'poliçe', 'teminat', 'tazminat', 'تأمين', 'بوليصة', 'تغطية', 'مطالبة'];

/** Mohan's first shoot — each appointment films two videos, each in the branch's two languages. */
export const SHOOT = {
  date: 'Fri 25 Sep',
  branch: 'tosun' as Branch,
  dentists: ['yahya-tosun', 'dilsad-ozdogan'],
  suggested: 'maysoon-abdelmajeed',
};
