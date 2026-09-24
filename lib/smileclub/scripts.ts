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
 *   (assumed — confirm). Turkish and Arabic are drafts for native review.
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

export const AMC_LANG_NOTE = 'Al Maher Medical Centre is set to Arabic + English by assumption — confirm with Dr Luvi.';

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
    ortho: { chair: 'Dişlerinizi düzeltirken onları temiz ve sağlıklı tutmak da aynı derecede önemli — Smile Club kontrollerinizi ve temizliklerinizi plana dahil ediyor.', why: 'Düzgün bir gülüşün sağlıklı da kalması gerekir — diş teli ya da şeffaf plak kullanırken düzenli kontrol ve profesyonel temizlik daha da önemlidir.' },
    general: { chair: 'Büyük sorunlardan kaçınmanın en iyi yolu kontrol ve temizliklerinizi aksatmamaktır — Smile Club bunu tüm yıl boyunca kolaylaştırıyor.', why: 'Diş sorunlarının çoğu küçük başlar — erken fark edildiğinde tedavi basit kalır, maliyet de düşük olur.' },
    perio: { chair: 'Sağlıklı diş etleri düzenli bakım ister — Smile Club ile koruyucu ziyaretleriniz yıl boyunca planlanır, hiçbiri atlanmaz.', why: 'Sağlıklı diş etleri sağlıklı bir gülüşün temelidir — ve yalnızca kanadığında ya da ağrıdığında değil, düzenli bakım ister.' },
    hygiene: { chair: 'Altı ayda bir profesyonel temizlik en basit korumadır — Smile Club bunu içerir, randevuyu düşünmenize bile gerek kalmaz.', why: 'Altı ayda bir profesyonel temizlik, dişleriniz ve diş etleriniz için en basit korumadır.' },
    pedo: { chair: 'İyi alışkanlıklar küçük yaşta başlar — Smile Club, çocuklar dahil tüm ailenin düzenli kontrollerini sürdürmesine yardımcı olur.', why: 'İyi diş alışkanlıkları küçük yaşta başlar — düzenli kontroller çocukların sağlıklı ve özgüvenli gülüşlerle büyümesine yardımcı olur.' },
    prostho: { chair: 'Kron, köprü ya da protez planlıyorsanız üyeler uygun tedavilerde üye fiyatı öder — düzenli kontroller de yeni dişlerinizin uzun ömürlü olmasını sağlar.', why: 'Kron, köprü ve protezler düzenli kontrollerle bakıldığında en uzun ömürlü olur.' },
    endo: { chair: 'Kanal tedavisi ya da implant sonrasında düzenli kontroller yapılan işi korur — üyeler uygun tedavilerde üye fiyatı öder.', why: 'Kanal tedavisi ya da implant sonrasında yapılan işi — ve yatırımınızı — koruyan şey düzenli kontrollerdir.' },
  },
  ar: {
    ortho: { chair: 'بينما نقوم بتقويم أسنانك، فإن الحفاظ على نظافتها وصحتها لا يقل أهمية — و Smile Club يضع فحوصاتك وتنظيف أسنانك ضمن الخطة.', why: 'الابتسامة المتناسقة تستحق أن تبقى صحية — ومع التقويم أو المصففات الشفافة تصبح الفحوصات الدورية والتنظيف الاحترافي أكثر أهمية.' },
    general: { chair: 'أفضل طريقة لتجنّب المشاكل الكبيرة هي الالتزام بالفحوصات والتنظيف — و Smile Club يجعل ذلك سهلاً طوال العام.', why: 'معظم مشاكل الأسنان تبدأ صغيرة — واكتشافها مبكراً يجعل العلاج أبسط والتكلفة أقل.' },
    perio: { chair: 'اللثة السليمة تحتاج إلى متابعة منتظمة — ومع Smile Club تكون زياراتك الوقائية مخططة طوال العام فلا يفوتك شيء.', why: 'اللثة السليمة هي أساس الابتسامة الصحية — وتحتاج إلى عناية منتظمة، لا إلى زيارة فقط عند النزيف أو الألم.' },
    hygiene: { chair: 'التنظيف الاحترافي كل ستة أشهر هو أبسط حماية — و Smile Club يشمله، فلا داعي لأن تتذكر الحجز.', why: 'التنظيف الاحترافي كل ستة أشهر هو أبسط حماية لأسنانك ولثتك.' },
    pedo: { chair: 'العادات الجيدة تبدأ منذ الصغر — و Smile Club يساعد العائلة كلها، بما فيها الأطفال، على الالتزام بالفحوصات المنتظمة.', why: 'العادات الصحية للأسنان تبدأ منذ الصغر — والفحوصات المنتظمة تساعد الأطفال على النمو بابتسامات صحية وواثقة.' },
    prostho: { chair: 'إذا كنت تخطط لتيجان أو جسور أو طقم أسنان، يحصل الأعضاء على أسعار خاصة على العلاجات المؤهلة — والفحوصات المنتظمة تساعد أسنانك الجديدة على أن تدوم.', why: 'التيجان والجسور وأطقم الأسنان تدوم أطول عندما تتم متابعتها بفحوصات منتظمة.' },
    endo: { chair: 'بعد علاج العصب أو الزراعة، تحمي الفحوصات المنتظمة العلاج الذي قمنا به — ويحصل الأعضاء على أسعار خاصة على العلاجات المؤهلة.', why: 'بعد علاج العصب أو زراعة الأسنان، الفحوصات المنتظمة هي ما يحمي العلاج — ويحمي ما استثمرته فيه.' },
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
    offer: 'Üyelik aylık 99 AED’den başlar. Seçtiğiniz plana göre kontroller ve profesyonel diş temizliği, acil bir diş sorununuz olduğunda destek, öncelikli randevu ve uygun tedavilerde üyelere özel fiyatlar içerir.',
    partOf: ' (Dental Nation ailesinin bir parçası)',
    hello: (name, from) => `Merhaba, ben ${name} — ${from}.`,
    seg: {
      active: 'Bir sonraki kontrolünüzün zamanı yaklaşıyor; bu yüzden size yeni bir şeyden bahsetmek istedim.',
      inactive: 'Son ziyaretinizin üzerinden bir süre geçti; nasıl olduğunuzu sormak istedim.',
      dormant: 'Sizi uzun zamandır görmedik. Kapımız size her zaman açık — hiçbir baskı olmadan.',
    },
    club: {
      active: 'Smile Club, bir şey ağrıyana kadar beklemek yerine diş bakımınızı tüm yıl düzenli tutmanın kolay bir yolu.',
      inactive: 'Smile Club, diş bakımınızı yeniden düzene sokmanın ve tüm yıl öyle tutmanın kolay bir yolu.',
      dormant: 'Geri dönmeye karar verdiğinizde Smile Club bunu kolaylaştırıyor.',
    },
    cta: {
      active: 'Bu mesaja yanıt vermeniz yeterli; ekibim planları anlatıp kontrol randevunuzu ayarlasın.',
      inactive: 'Bu mesaja yanıt verin; ekibim planları anlatsın ve size uygun bir zaman bulsun.',
      dormant: 'Daha fazla bilgi isterseniz yanıt vermeniz yeterli, ekibim anlatsın — hiçbir yükümlülük yok.',
    },
    stop: '(Bu mesajları almak istemiyorsanız STOP yazmanız yeterli.)',
    invite: 'Sizin için bir davetiye imzaladım — resepsiyon planları bir dakikada anlatabilir.',
    vIntro: (name, title, where) => `[Kamerada, klinikte] Merhaba, ben ${name} — ${title}, ${where}.`,
    vWhy: 'İşte bu yüzden Dental Nation olarak Smile Club’ı oluşturduk.',
    vKeep: 'Bu, yalnızca bir şey ağrıdığında yapılan tedavi değil — sorunların önüne geçmenizi sağlayan bir bakım.',
    vEnd: '[Kapanış kartı] Smile Club’a katılmak için resepsiyona sorun, QR kodu okutun ya da bize WhatsApp’tan yazın.',
  },
  ar: {
    offer: 'تبدأ العضوية من 99 درهماً شهرياً. وحسب الخطة، تشمل الفحوصات الدورية وتنظيفاً احترافياً للأسنان، والمساعدة عند وجود مشكلة طارئة في الأسنان، وأولوية في المواعيد، وأسعاراً خاصة للأعضاء على العلاجات المؤهلة.',
    partOf: '، إحدى عيادات دنتال نيشن',
    hello: (name, from) => `مرحباً، معكم ${name} من ${from}.`,
    seg: {
      active: 'موعد فحصك الدوري القادم يقترب، لذلك أحببت أن أخبرك بشيء جديد.',
      inactive: 'مرّ بعض الوقت منذ زيارتك الأخيرة، وأحببت أن أطمئن عليك.',
      dormant: 'لم نرك منذ فترة طويلة — أبوابنا مفتوحة لك دائماً، ودون أي ضغط.',
    },
    club: {
      active: 'Smile Club طريقة بسيطة للحفاظ على العناية بأسنانك طوال العام، بدلاً من الانتظار حتى تشعر بالألم.',
      inactive: 'Smile Club طريقة سهلة لتعود إلى العناية المنتظمة بأسنانك وتحافظ عليها طوال العام.',
      dormant: 'وعندما تقرر العودة، يجعل Smile Club ذلك بسيطاً.',
    },
    cta: {
      active: 'فقط ردّ على هذه الرسالة وسيشرح لك فريقي الخطط ويحجز لك موعد الفحص.',
      inactive: 'ردّ على هذه الرسالة وسيشرح لك فريقي الخطط ويجد لك الوقت المناسب.',
      dormant: 'إذا رغبت في معرفة المزيد، فقط ردّ على هذه الرسالة وسيشرح لك فريقي — دون أي التزام.',
    },
    stop: '(إذا كنت لا ترغب في استلام هذه الرسائل، أرسل STOP.)',
    invite: 'وقّعت لك دعوة — ويمكن لفريق الاستقبال شرح الخطط لك في دقيقة.',
    vIntro: (name, title, where) => `[أمام الكاميرا، في العيادة] مرحباً، أنا ${name}، ${title} في ${where}.`,
    vWhy: 'لهذا أطلقنا Smile Club من دنتال نيشن.',
    vKeep: 'إنها عناية تسبق المشاكل — وليست مجرد علاج عندما تشعر بالألم.',
    vEnd: '[البطاقة الختامية] للانضمام إلى Smile Club: اسأل في الاستقبال، أو امسح رمز QR، أو راسلنا عبر واتساب.',
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
      `[Kamerada] Diş teli ya da şeffaf plak mı düşünüyorsunuz? Ben ${n} — ${t}, ${w}.`,
      'Karar vermeden önce planınızı görün: dişlerinizin 3D taraması, bir ortodontistle görüşme ve yazılı tedavi planı.',
      'Adı The DN Scan — 499 AED; tedaviye başlarsanız ücretin tamamı tedavinizden düşülür.',
      'Baskı yok, tahmin yok — gülüşünüz için net bir plan.',
      '[Kapanış kartı] The DN Scan randevunuzu alın — reklamdaki bağlantıdan ya da WhatsApp’tan.',
    ],
    ar: (n, t, w) => [
      `[أمام الكاميرا] تفكّر في تقويم الأسنان أو المصففات الشفافة؟ أنا ${n}، ${t} في ${w}.`,
      'قبل أن تلتزم بأي شيء، شاهد خطتك: مسح ثلاثي الأبعاد لأسنانك، واستشارة مع أخصائي تقويم، وخطة علاج مكتوبة.',
      'اسمه The DN Scan — بسعر 499 درهماً، ويُخصم المبلغ كاملاً من علاجك إذا قررت البدء.',
      'بلا ضغط وبلا تخمين — فقط خطة واضحة لابتسامتك.',
      '[البطاقة الختامية] احجز The DN Scan — عبر الرابط في الإعلان أو راسلنا على واتساب.',
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
      `[Kamerada] Merhaba, ben ${n} — ${t}, ${w}.`,
      'Son kontrolünüzün üzerinden zaman geçtiyse başlamanın en kolay yolu The DN First Look.',
      'Tek ziyarette: kapsamlı muayene, dijital röntgen ve profesyonel temizlik — her şey dahil 799 AED, sürpriz yok.',
      'Dişlerinizin durumunu ve gerekiyorsa neyin yapılması gerektiğini net olarak öğrenirsiniz.',
      '[Kapanış kartı] The DN First Look randevunuzu alın — reklamdaki bağlantıdan ya da WhatsApp’tan.',
    ],
    ar: (n, t, w) => [
      `[أمام الكاميرا] مرحباً، أنا ${n}، ${t} في ${w}.`,
      'إذا مرّ وقت على آخر فحص لك، فأسهل بداية هي The DN First Look.',
      'زيارة واحدة: فحص شامل، وأشعة رقمية، وتنظيف احترافي — بسعر 799 درهماً شاملاً كل شيء، بلا مفاجآت.',
      'تخرج وأنت تعرف تماماً حالة أسنانك، وما الذي يحتاج إلى علاج إن وُجد.',
      '[البطاقة الختامية] احجز The DN First Look — عبر الرابط في الإعلان أو راسلنا على واتساب.',
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
      `[Kamerada] Kahve, çay ya da sadece zaman — dişler parlaklığını kaybeder. Ben ${n} — ${t}, ${w}.`,
      'The DN Glow Up, diş hekimi gözetiminde yaklaşık bir saatte yapılan profesyonel Zoom beyazlatmadır.',
      'Her şey dahil 1.699 AED — önce dişlerinizi kontrol ediyoruz; böylece işlem güvenli, sonuç doğal olur.',
      'Daha parlak bir gülüş, doğru şekilde.',
      '[Kapanış kartı] The DN Glow Up randevunuzu alın — reklamdaki bağlantıdan ya da WhatsApp’tan.',
    ],
    ar: (n, t, w) => [
      `[أمام الكاميرا] القهوة والشاي ومرور الوقت — كلها تُفقد الأسنان لمعانها. أنا ${n}، ${t} في ${w}.`,
      'The DN Glow Up هو تبييض Zoom احترافي بإشراف طبيب أسنان، في حوالي ساعة.',
      'بسعر 1,699 درهماً شاملاً كل شيء — نفحص أسنانك أولاً ليكون الإجراء آمناً والنتيجة طبيعية.',
      'ابتسامة أكثر إشراقاً، بالطريقة الصحيحة.',
      '[البطاقة الختامية] احجز The DN Glow Up — عبر الرابط في الإعلان أو راسلنا على واتساب.',
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
      `[Kamerada] Diş ağrısı, kırık bir diş ya da bekleyemeyecek bir şişlik mi? Ben ${n} — ${t}, ${w}.`,
      'Dental Nation’ın acil diş bakımıyla 60 dakika içinde muayene olursunuz.',
      'Her şey dahil 699 AED — fiyatı gelmeden önce bilirsiniz.',
      'Ağrının artmasını beklemeyin. Bizi arayın, sizi bugün görelim.',
      '[Kapanış kartı] Hemen arayın — acil diş bakımı, 60 dakika içinde muayene.',
    ],
    ar: (n, t, w) => [
      `[أمام الكاميرا] ألم في الأسنان، أو سن مكسور، أو تورّم لا يحتمل الانتظار؟ أنا ${n}، ${t} في ${w}.`,
      'مع خدمة رعاية الأسنان العاجلة من دنتال نيشن، يتم فحصك خلال 60 دقيقة.',
      'بسعر 699 درهماً شاملاً كل شيء — تعرف السعر قبل وصولك.',
      'لا تنتظر حتى يشتد الألم. اتصل بنا وسنراك اليوم.',
      '[البطاقة الختامية] اتصل الآن — رعاية عاجلة للأسنان، الفحص خلال 60 دقيقة.',
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
      `[Kamerada] Eksik bir ya da birkaç dişiniz mi var? Ben ${n} — ${t}, ${w}.`,
      'Eksik bir diş; nasıl yediğinizi, nasıl gülümsediğinizi ve boşluğun çevresindeki dişleri etkiler.',
      'Her şey 1.000 AED’den başlayan bir konsültasyonla başlar: muayene eder, planlar ve tedavi başlamadan önce toplam maliyeti size yazılı olarak veririz.',
      'Kron, köprü ya da implant — size uygun seçenek, açıkça anlatılır.',
      '[Kapanış kartı] Restore konsültasyonunuzu alın — reklamdaki bağlantıdan ya da WhatsApp’tan.',
    ],
    ar: (n, t, w) => [
      `[أمام الكاميرا] هل تفقد سناً أو أكثر؟ أنا ${n}، ${t} في ${w}.`,
      'فقدان سن واحد يؤثر على طريقة أكلك وابتسامتك، وعلى الأسنان المحيطة بالفراغ.',
      'البداية باستشارة تبدأ من 1,000 درهم: نفحص ونخطط ونعطيك التكلفة الكاملة مكتوبة قبل أن نبدأ أي شيء.',
      'تيجان أو جسور أو زراعة — الخيار المناسب لك، بشرح واضح.',
      '[البطاقة الختامية] احجز استشارة Restore — عبر الرابط في الإعلان أو راسلنا على واتساب.',
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
