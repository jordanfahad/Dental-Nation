/**
 * The segmented Smile Club plan (rev. 6, 23 Sep — Mr Akbar: "no one solution
 * for all"). Five segments, each with its own people, message, messenger,
 * channel, unlock condition and target; each links to the tracked tasks that
 * execute it (lib/smileclub/team.ts, via `seg`).
 */

export type SegmentId = 'chair' | 'patients' | 'corporate' | 'search' | 'community';

export interface Segment {
  id: SegmentId;
  name: string;
  who: string;
  target: number;
  targetNote: string;
  messenger: string;
  message: string;
  how: { title: string; body: string }[];
  scripts?: { label: string; text: string }[];
  unlock: string;
  notDo: string[];
  owner: string;
}

export const SEGMENTS: Segment[] = [
  {
    id: 'chair', name: 'Patients in the chair today', owner: 'Dr Luvi · treating doctors · receptionists',
    who: 'Patients visiting a branch this month — they already trust us and are standing at the desk with a bill in their hand.',
    target: 36, targetNote: '12 per branch (Al Wasl · Dr Tosun · AMC)',
    messenger: 'The dentist recommends; the receptionist closes. A recommendation from the patient’s own dentist carries far more weight than a leaflet.',
    message: '“You’re already part of Dental Nation — Smile Club means your check-ups and cleanings are planned for the year, and you pay member rates for anything else.”',
    how: [
      { title: '1 · The dentist’s one sentence (chairside)', body: 'At the end of every check-up or cleaning, the dentist says one sentence tailored to what they just saw, and hands over a Smile Club invitation card signed with their name.' },
      { title: '2 · The receptionist closes (checkout)', body: 'At checkout the receptionist picks up the dentist’s recommendation, shows the saving against today’s bill, and enrols the patient by QR under the branch code.' },
      { title: '3 · First member visit booked before they leave', body: 'The member’s next check-up is booked there and then. A member who never comes back cancels.' },
      { title: '4 · Every “no” written down', body: 'One line on the “no” sheet: why. Dr Luvi reviews the reasons each Friday and adjusts the pitch.' },
    ],
    scripts: [
      { label: 'Dentist — after a cleaning', text: '“Your gums look good today. To keep them that way I’d like to see you every six months — Smile Club covers exactly that. I’ve signed an invitation for you; the front desk can explain it in a minute.”' },
      { label: 'Dentist — treatment still to do', text: '“You still have the two fillings we talked about. As a Smile Club member you’d pay member rates on those, and your check-ups are included.”' },
      { label: 'Receptionist — checkout', text: '“Dr ___ mentioned Smile Club. Today’s visit came to AED ___; as a member your check-ups and cleaning are included and treatments are at member rates — it’s AED 99 a month. Shall I set it up now and book your next check-up?”' },
      { label: 'Parent with a child', text: '“One membership can cover the whole family — one dental home for everyone.”' },
    ],
    unlock: 'Unlocked now — the reception guide, scripts and QR stands already exist. The dentist’s sentence starts after the Thursday 24 Sep refresher.',
    notDo: ['No leaflet-only approach — the recommendation must come from the dentist.', 'Never the words insurance, coverage or claim.', 'No pressure on a patient in pain or mid-treatment — offer at checkout, not in the chair during treatment.'],
  },
  {
    id: 'patients', name: 'Our patients who are not visiting', owner: 'Treating doctors · Dr Luvi · CRM-DN',
    who: 'Existing Dental Nation patients, grouped by their own dentist and by how recently they visited: ACTIVE but due a check-up · INACTIVE (last visit 6–18 months ago) · DORMANT (over 18 months).',
    target: 24, targetNote: 'Active-due 10 · inactive 8 · dormant 6',
    messenger: 'Each dentist writes only to their OWN patients, in their own name — Dr Hasna to Dr Hasna’s patients, Dr Tosun to his, Dr Maisoon to hers, and so on for every treating dentist. Never a blanket message from “Dental Nation”.',
    message: 'One short, personal WhatsApp from the patient’s own dentist, different for each group — a nudge for those due, a welcome back for those who have drifted.',
    how: [
      { title: '1 · One list per dentist', body: 'Dr Luvi and CRM-DN split the patient base by treating dentist, then into active-due / inactive / dormant. Only patients who agreed to be contacted are included.' },
      { title: '2 · Each dentist approves their own three messages', body: 'Same idea, the dentist’s own words. Nothing is sent that the dentist has not read and approved.' },
      { title: '3 · Small daily batches', body: 'At most 20 messages per dentist per day, so every reply gets a real answer the same day. Replies go to the dentist’s branch.' },
      { title: '4 · Three waves, warmest first', body: 'Active-due patients first (w/c 28 Sep), then inactive (w/c 5 Oct), then dormant (w/c 12 Oct) — so we learn from the warm group before writing to the cold one.' },
      { title: '5 · Every message tracked to the dentist', body: 'Each dentist has their own code (e.g. SC-DR-HASNA), so we know whose patients joined and whose messages worked.' },
    ],
    scripts: [
      { label: 'ACTIVE — check-up due', text: '“Hi ___, it’s Dr Hasna from Dental Nation. Your six-month check-up is due. Many of my patients now use Smile Club — check-ups and cleanings included, member rates on everything else, AED 99 a month. Would you like me to book you in?”' },
      { label: 'INACTIVE — 6–18 months', text: '“Hi ___, Dr Tosun here from Dental Nation. It’s been a while since your last visit — I’d love to see how you’re doing. Smile Club makes it simple to stay on track: your check-ups are planned and included. Shall I find you a time?”' },
      { label: 'DORMANT — over 18 months', text: '“Hi ___, Dr Maisoon from Dental Nation. It’s been some time — no pressure at all, but if you’d like a fresh start, a Smile Club membership includes your first check-up. Just reply and I’ll arrange it.”' },
    ],
    unlock: 'Unlocks only when all four are true: (1) each dentist’s list is consent-checked, (2) each dentist has approved their messages, (3) Mr Akbar has approved the approach, (4) per-dentist tracking codes are live. Target: first wave Mon 28 Sep.',
    notDo: ['No blanket broadcast — this replaces the mass WhatsApp test that produced no confirmed members.', 'No message from a dentist the patient has never seen.', 'No patient who has opted out; any “stop” is honoured immediately.'],
  },
  {
    id: 'corporate', name: 'Companies', owner: 'Gautam (sells) · Fahad (warm introductions) · Mr Akbar (introductions)',
    who: 'Employers whose medical insurance gives staff little or no dental — they buy Smile Club for their team as an employee benefit.',
    target: 24, targetNote: 'First company trial ≈12 · on-site dental day ≈12',
    messenger: 'Gautam, face to face. Warm doors first (people who already know us), then door-to-door in the right places.',
    message: '“Your medical insurance probably doesn’t give your team much dental. Smile Club sits beside it: a benefit your staff will actually use, at a fixed cost per employee — we run the joining, bookings and reporting.”',
    how: [
      { title: 'The company list — by type, in this order', body: '1) WARM: Assembly Global, ArabyAds (staff), RBS, existing DN partners and Mr Akbar’s three introductions. 2) SMEs of 20–200 staff in JLT, Business Bay, DIFC and Al Quoz — close to a branch. 3) FRONTLINE employers — hotels, restaurants, retail, facilities, security — whose staff are on basic insurance. 4) SCHOOLS — staff first, families later. Large enterprises (1,000+) go through warm introductions and brokers only, never cold knocks.' },
      { title: 'When door-to-door works', body: 'Where the owner or general manager decides on the spot (companies under ~200 staff), where many small offices share one tower (several doors per trip), and on Tuesday–Thursday, 10:00–12:00 or 14:00–16:00. It does NOT work for large companies with procurement, on Mondays/Fridays, or in the last week of the month.' },
      { title: 'The first question at every door', body: '“Does your medical insurance include dental?” — if the answer is yes (as at Michael Page), thank them, ask for a referral and move on. Time goes only to companies with a gap.' },
      { title: 'The door-opener is a dental day, not a sales pitch', body: 'Offer a free on-site dental check day for staff. Staff meet our dentists, see the value, and join on the spot — the company says yes to the benefit afterwards.' },
    ],
    unlock: 'Door-to-door unlocks Tue 29 Sep, once four things are in hand: corporate price and funding options approved · print kit ready · company list built by type · the on-site dental day costed. Warm introductions start now.',
    notDo: ['No cold knocks on large enterprises.', 'No discount-led pitch (“20% off crowns”) — it is an employee benefit.', 'No time spent on companies whose insurance already covers dental well.'],
  },
  {
    id: 'search', name: 'People searching online', owner: 'Fahad · CRM-DN',
    who: 'People already looking — searching the price of a check-up or cleaning, frustrated with their insurance, or searching for Smile Club by name.',
    target: 12, targetNote: 'Google ≈3 · Facebook/Instagram return visitors ≈7 · website banner ≈2',
    messenger: 'The ad and the web page — then a person from the contact centre within 10 minutes.',
    message: 'Match the search: price searchers see “know what you’ll pay — check-ups included”; insurance-frustrated searchers see “your insurance and your dental membership do different jobs”.',
    how: [
      { title: 'Google campaign 1 — Brand', body: '“smile club dental nation”, “dental nation membership” — cheap, and stops competitors catching people who heard of us. AED 500.' },
      { title: 'Google campaign 2 — Price searches', body: '“teeth cleaning price dubai”, “dental checkup cost dubai”, “scaling polishing offer” — the membership is the answer to the price they just saw. AED 4,500.' },
      { title: 'Google campaign 3 — Insurance gap', body: '“dentist without insurance dubai”, “dental insurance for individuals” — careful, honest wording: a membership, not insurance. AED 1,000.' },
      { title: 'Call ads for local searches', body: 'A “call the branch” button on mobile — many people prefer to phone.' },
      { title: 'Facebook/Instagram — only people who already visited us', body: 'Reminder ads to people who looked at the Smile Club page, plus a “chat on WhatsApp” offer. No cold audiences.' },
    ],
    unlock: 'Brand and price campaigns run now. Google gets its second AED 6,000 only if, at Day 14, a genuine membership enquiry costs AED 150 or less.',
    notDo: ['No “dentist near me” or treatment searches — those belong to the clinic campaigns.', 'No display, PMax or broad awareness ads for Smile Club.', 'No cold Facebook audiences.'],
  },
  {
    id: 'community', name: 'Families & neighbourhoods', owner: 'Fahad · Dr Luvi · Mohan',
    who: 'Families and residents living or working near our three branches who have never visited us.',
    target: 24, targetNote: 'Local partners 7 · family promoters 7 · brokers 3 · benefit platforms 3 · community events 4',
    messenger: 'People they already trust locally — a school, their building, their gym or pharmacy, a parent they follow — not our ads.',
    message: '“One dental home for the whole family — stay ahead of problems instead of reacting to them.”',
    how: [
      { title: 'Awareness goes offline', body: 'Digital awareness ads are unlikely to work for a product nobody searches for. The AED 3,000 moves to local, physical presence near each branch.' },
      { title: 'Schools & nurseries', body: 'A dentist-led 20-minute talk for parents; staff offered Smile Club; a leaflet in school bags at the start of term.' },
      { title: 'Residential buildings & community groups', body: 'Posters in building lobbies near each branch; the building or community WhatsApp admin shares one message.' },
      { title: 'Gyms, pharmacies, salons', body: 'A counter card with a QR code under that partner’s own code — they earn a commission only on paid members.' },
      { title: 'Family promoters', body: 'Three local parent creators with their own tracked code, showing a real family visit.' },
      { title: 'One community event', body: 'Free smile checks at a school, community centre or sports event, with on-the-spot joining.' },
    ],
    unlock: 'Partner agreements start now; the first community event by Fri 9 Oct.',
    notDo: ['No billboards or radio.', 'No payment to partners for posts or clicks — only for paid members.'],
  },
];

export const SEGMENT_BY_ID: Record<SegmentId, Segment> = Object.fromEntries(SEGMENTS.map((s) => [s.id, s])) as Record<SegmentId, Segment>;
