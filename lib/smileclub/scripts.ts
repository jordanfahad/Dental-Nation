/**
 * Smile Club scripts curated per dentist (24 Sep) — each dentist presents
 * Smile Club to their OWN patients, in their own name, with a reason that fits
 * their specialty. Three formats per dentist: the one-line chairside
 * recommendation, the WhatsApp message to their own patients, and a ~30-second
 * video script. Branch rosters from the doctors' schedule (branch-wise).
 * Professional names and clinic days only — no personal data.
 */

export type Branch = 'tosun' | 'alwasl' | 'amc';
export type Specialty = 'ortho' | 'general' | 'perio' | 'hygiene' | 'pedo' | 'prostho' | 'endo';

export const BRANCH_LABEL: Record<Branch, string> = {
  tosun: 'Dr. Tosun Dental Clinic',
  alwasl: 'Dental Nation Al Wasl',
  amc: 'Al Maher Medical Centre',
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
  note?: string;
}

export const DENTISTS: Dentist[] = [
  { id: 'yahya-tosun', name: 'Dr. Yahya Tosun', title: 'Specialist Orthodontist', branch: 'tosun', specialty: 'ortho', days: 'Mon–Tue, Thu–Sat', code: 'SC-DR-TOSUN' },
  { id: 'dilsad-ozdogan', name: 'Dr. Dilsad Ozdogan', title: 'General Dentist', branch: 'tosun', specialty: 'general', days: 'Tue–Sat', code: 'SC-DR-DILSAD' },
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

/** Why THIS dentist's patients should care — the specialty angle. */
const ANGLE: Record<Specialty, { chair: string; whatsapp: string; video: string }> = {
  ortho: {
    chair: 'While we straighten your teeth, keeping them clean and healthy matters just as much — Smile Club puts your check-ups and cleanings into the plan.',
    whatsapp: 'As your orthodontist, I want your new smile to stay healthy. With braces or aligners, regular check-ups and professional cleaning matter even more.',
    video: 'A beautiful, straight smile deserves to stay healthy. Braces and aligners make regular cleaning even more important.',
  },
  general: {
    chair: 'The best way to avoid bigger problems is to keep your check-ups and cleanings on track — Smile Club makes that simple for the whole year.',
    whatsapp: 'Most dental problems start small and are easy to deal with when we catch them early — that’s why regular check-ups matter.',
    video: 'Most dental problems start small. Catching them early keeps treatment simple — and costs down.',
  },
  perio: {
    chair: 'Healthy gums need regular maintenance — with Smile Club your preventive visits are planned for the year, so nothing slips.',
    whatsapp: 'Healthy gums are the foundation of healthy teeth, and they need regular care to stay that way.',
    video: 'Healthy gums are the foundation of a healthy smile — and they need regular care, not just a visit when something bleeds or hurts.',
  },
  hygiene: {
    chair: 'A professional cleaning every six months is the simplest protection there is — Smile Club includes it, so you never have to think about booking.',
    whatsapp: 'A professional cleaning every six months is one of the best things you can do for your teeth and gums.',
    video: 'A professional cleaning every six months is the simplest protection for your teeth and gums.',
  },
  pedo: {
    chair: 'Good habits start young — Smile Club helps the whole family keep regular check-ups, children included.',
    whatsapp: 'Children’s teeth change quickly, and regular check-ups help us catch small problems early and build good habits.',
    video: 'Good dental habits start young. Regular check-ups help children grow up with healthy, confident smiles.',
  },
  prostho: {
    chair: 'If you’re planning crowns, bridges or dentures, members pay member rates on eligible treatments — and regular check-ups help your new teeth last.',
    whatsapp: 'If you’re planning restorative work like crowns, bridges or dentures, looking after it with regular check-ups helps it last for years.',
    video: 'Crowns, bridges and dentures last longest when they’re looked after with regular check-ups.',
  },
  endo: {
    chair: 'After a root canal or an implant, regular check-ups protect the work we’ve done — and members pay member rates on eligible treatments.',
    whatsapp: 'After treatment such as a root canal or an implant, regular check-ups are the best way to protect it.',
    video: 'After a root canal or an implant, regular check-ups are what protect the work — and your investment.',
  },
};

/** One accurate, plain description of the offer — used everywhere. */
export const OFFER = 'Membership starts from AED 99 a month. Depending on the plan, it includes check-ups and a professional cleaning, help when you have an urgent dental problem, priority appointments, and member rates on eligible treatments.';

export interface DentistScripts { chair: string; whatsapp: string; video: string }

export function scriptsFor(d: Dentist): DentistScripts {
  const a = ANGLE[d.specialty];
  const where = BRANCH_LABEL[d.branch];
  return {
    chair: `“${a.chair} I’ve signed an invitation for you — the front desk can explain the plans in a minute.”`,
    whatsapp: [
      `Hello [patient first name], this is ${d.name} from ${where}${d.branch === 'alwasl' ? '' : ', part of Dental Nation'}.`,
      a.whatsapp,
      `I’d like to introduce Smile Club — a simple way to stay on top of your dental care all year, instead of waiting until something hurts. ${OFFER}`,
      `Just reply to this message and my team will explain the plans and book your next visit.`,
      `(Reply STOP if you’d prefer not to receive these messages.)`,
    ].join('\n\n'),
    video: [
      `[On camera, in the clinic] Hi, I’m ${d.name}, ${d.title} at ${where}.`,
      a.video,
      `That’s why we created Smile Club by Dental Nation. ${OFFER}`,
      `It’s care that keeps you ahead of problems — not just treatment when something hurts.`,
      `[End card] Ask at reception, scan the QR code, or message us on WhatsApp to join Smile Club.`,
    ].join('\n'),
  };
}

/** Words that must never appear in Smile Club scripts (regulatory). */
export const BANNED_WORDS = ['insurance', 'coverage', 'covered', 'claim', 'premium', 'policy', 'insured'];

/** Mohan's first shoot. */
export const SHOOT = {
  date: 'Fri 25 Sep',
  branch: 'tosun' as Branch,
  dentists: ['yahya-tosun', 'dilsad-ozdogan'],
  suggested: 'maysoon-abdelmajeed',
};
