/**
 * Execution playbooks (25 Sep) — for each segment, the exact steps: who does
 * what, at which moment, through which channel (in person first; WhatsApp or
 * digital only where stated), and what gets recorded where. Team members
 * execute these as written; changes go through Fahad.
 */
import type { SegmentId } from '@/lib/smileclub/segments';

export type Channel = 'In person' | 'WhatsApp' | 'Phone' | 'Email' | 'LinkedIn' | 'Online' | 'System' | 'Print';

export interface PlayStep {
  when: string;
  who: string;
  how: Channel[];
  do: string;
  record: string;
  /** Task key that carries this step, if any. */
  task?: string;
  /** Sub-tab holding the words to use. */
  words?: 'scripts';
}

export interface Playbook {
  seg: SegmentId;
  accountable: string;
  doers: string;
  starts: string;
  /** The channel sequence, first touch first. */
  path: string[];
  /** When WhatsApp or digital comes in — and when it does not. */
  digital: string;
  /** Who teaches the people who execute, and when. */
  trained: string;
  steps: PlayStep[];
  track: string[];
}

export const PLAYBOOKS: Record<SegmentId, Playbook> = {
  chair: {
    seg: 'chair',
    accountable: 'Dr Luvi',
    doers: 'Treating dentists recommend · receptionists close',
    starts: 'Fri 25 Sep — each dentist from the day Dr Luvi briefs them',
    path: ['In person — dentist', 'In person — desk', 'WhatsApp — only if the patient asks for time'],
    digital: 'WhatsApp comes in only after the patient has heard it in person and asked for time — never as the first touch.',
    trained: 'Dr Luvi briefs every dentist one to one (15 min) and every desk team (30-minute refresher).',
    steps: [
      { when: 'Before the dentist’s first clinic day', who: 'Dr Luvi → each dentist', how: ['In person'], task: 'l-brief', words: 'scripts',
        do: 'Fifteen minutes, one to one, with the Dentist scripts tab open. The seven points: (1) which patients — non-members at a check-up, cleaning or consultation, never someone in pain or mid-treatment; (2) the moment — the last minute of the visit, after explaining what you saw; (3) your own sentence; (4) sign and date the invitation card; (5) the hand-over line “The front desk will explain the plans”; (6) your three WhatsApp group messages; (7) the AED 40 thank-you for each member from your own patients.',
        record: 'Dentist ticked as briefed; sentence and messages approved.' },
      { when: 'Every morning, before the first patient', who: 'Receptionist', how: ['System'],
        do: 'Go through the day’s appointments and mark “SC” on the day sheet next to every non-member with a check-up, cleaning or consultation. Check every treatment room has signed-card stock.',
        record: 'Number of SC-marked patients on the daily tally.' },
      { when: 'Last minute of the visit', who: 'Dentist', how: ['In person'], task: 'd-pitch', words: 'scripts',
        do: 'Say your chair sentence, tailored to what you just saw. Sign and date the invitation card, tick the reason box, hand it over: “The front desk will explain the plans in a minute.”',
        record: 'The card goes to the desk with the patient.' },
      { when: 'At checkout', who: 'Receptionist', how: ['In person'],
        do: 'Take the card and say: “Dr ___ mentioned Smile Club. Let me show you today’s bill against the member price.” Show the savings sheet, answer questions, then ask: “Would you like to join today?”',
        record: '—' },
      { when: 'The patient says yes', who: 'Receptionist', how: ['System'],
        do: 'Enrol at the desk with the branch code and the dentist code from the card; take payment; book the first included visit before the patient leaves; keep the card with the form.',
        record: 'Membership in the CRM with branch and dentist code; first visit booked.' },
      { when: 'The patient wants time to think', who: 'Receptionist → Zavis', how: ['WhatsApp'], task: 'c-wa-setup',
        do: 'Ask: “May we send you the details on WhatsApp?” Only if yes, add them to the “desk — let me think” list in Zavis. The approved follow-up goes out automatically the same day and once more on day 3, then stops.',
        record: 'Added to the Zavis desk list with the branch code.' },
      { when: 'The patient says no', who: 'Receptionist', how: ['Print'],
        do: 'One line on the “no” sheet: price / has insurance / not now / other. No second ask.',
        record: '“No” sheet — reasons only, no names.' },
      { when: '18:00 every clinic day', who: 'Receptionist → Dr Luvi', how: ['WhatsApp'],
        do: 'Send the branch tally to Dr Luvi’s staff group: SC-marked, cards at the desk, joined, “let me think”, no.',
        record: 'Dr Luvi updates the branch pace tasks with paid memberships.' },
      { when: 'Every Friday', who: 'Dr Luvi', how: ['In person'],
        do: 'Ten minutes with each branch: joins per dentist and the “no” reasons; coach anyone below pace.',
        record: 'Weekly clinic results task.' },
    ],
    track: ['Daily, per branch: SC-marked → cards at the desk → joined (18:00 tally)', 'Weekly: joins per dentist code and “no” reasons (Dr Luvi, Friday)', 'Checkpoints: 12 / 21 / 30 / 36 paid (Team tab, T5)'],
  },

  patients: {
    seg: 'patients',
    accountable: 'Dr Luvi',
    doers: 'Each treating dentist (in their own name) · CRM-DN sends through Zavis · branch desk answers',
    starts: 'Wave 1 Tue 29 Sep · wave 2 Mon 5 Oct · wave 3 Mon 12 Oct',
    path: ['WhatsApp — from the dentist, to a group', 'WhatsApp or phone — desk replies the same day', 'In person — at the visit'],
    digital: 'WhatsApp is the first touch here — but only from the patient’s own dentist, only with consent, and only to a group list, never a blanket broadcast.',
    trained: 'Dr Luvi covers the three messages in the same one-to-one briefing; CRM-DN sets up the sends.',
    steps: [
      { when: 'By Fri 25 Sep', who: 'Dr Luvi + CRM-DN', how: ['System'], task: 'l-doctor-lists',
        do: 'In the patient system, split each dentist’s own patients into active (check-up due) / inactive (6–18 months) / dormant (over 18 months). Keep only patients with contact consent; remove opt-outs. Only the counts come into this plan.',
        record: 'Counts per dentist and group.' },
      { when: 'In the dentist’s briefing', who: 'Dr Luvi → each dentist', how: ['In person'], task: 'd-approve', words: 'scripts',
        do: 'Show the three group messages in the branch’s two languages; the dentist adjusts the wording and says “approved”.',
        record: 'Approval recorded.' },
      { when: 'On each wave’s start date', who: 'CRM-DN (Zavis)', how: ['WhatsApp'], task: 'c-doctor-send',
        do: 'Load each dentist’s approved message for that group and language; send in the dentist’s name from the branch number — at most 20 per dentist per day, 10:00–13:00, each carrying the dentist’s code.',
        record: 'Zavis send log per dentist code.' },
      { when: 'Same day as any reply', who: 'Branch receptionist', how: ['WhatsApp', 'Phone'],
        do: 'Answer in the Zavis inbox: explain the plans; offer a booking only if the patient asks; call if they prefer. “STOP” = removed at once.',
        record: 'Reply tagged: interested / booked / joined / not interested / STOP.' },
      { when: 'The patient joins or visits', who: 'Receptionist', how: ['In person'],
        do: 'Enrol with the dentist’s code; at the visit the chair steps apply.',
        record: 'Membership with the dentist’s code.' },
      { when: 'No reply', who: '—', how: ['System'],
        do: 'Nothing. One message per patient per wave; no chasing.',
        record: '—' },
      { when: 'Every Friday', who: 'CRM-DN → Dr Luvi → each dentist', how: ['Email'],
        do: 'Per dentist: sent, replies, bookings, joins, opt-outs. Dr Luvi shares each dentist’s own numbers with them.',
        record: 'Wave tasks updated.' },
    ],
    track: ['Per dentist code: sent → replies → bookings → paid joins → opt-outs', 'Opt-outs above 5% in a wave: pause and rewrite before the next wave'],
  },

  corporate: {
    seg: 'corporate',
    accountable: 'Gautam',
    doers: 'Gautam (visits, meetings, proposals) · Fahad and Mr Akbar (warm introductions) · Dr Luvi (dental days) · Mohan (kits)',
    starts: 'Warm introductions now · door-to-door from Tue 29 Sep',
    path: ['Email / LinkedIn — warm introduction', 'In person — door visit and meeting', 'Email — proposal within 24 hours', 'Company’s own channel — staff launch'],
    digital: 'Email and LinkedIn warm the door and follow up; the sale itself is face to face.',
    trained: 'Gautam runs it himself; the company types, stages and calendar rule are in Team → Gautam’s companies.',
    steps: [
      { when: 'By Fri 25 Sep', who: 'Gautam', how: ['System'], task: 'g-doors-15',
        do: 'Enter 40–60 target companies in the pipeline (Team → Gautam’s companies), each with its type, area, staff size and source.',
        record: 'Pipeline — stage “Target”.' },
      { when: 'This week', who: 'Fahad / Mr Akbar → Gautam', how: ['Email', 'LinkedIn'], task: 'f-warm-doors',
        do: 'Introduce Gautam to each warm company. Gautam replies the same day with two meeting times.',
        record: 'Stage “Contacted”; calendar entry “SC – Company – meeting”.' },
      { when: 'Tue–Thu from 29 Sep, 10:00–12:00 and 14:00–16:00', who: 'Gautam', how: ['In person'], task: 'g-doors-20',
        do: 'Door visits to 20–200-staff companies only. Ask for the HR or office manager. First question: “What dental care do your staff get today — is it enough?” Leave the one-pager and a QR card; ask for a 20-minute meeting.',
        record: 'Calendar entry “SC – Company – visit”; stage “Contacted”.' },
      { when: 'Within 3 working days of a visit', who: 'Gautam', how: ['Email', 'Phone'],
        do: 'Follow up with the one-pager attached and two meeting times.',
        record: 'Calendar entry “SC – Company – follow-up”.' },
      { when: 'The meeting', who: 'Gautam', how: ['In person'],
        do: 'Walk through the savings table and the five benefit questions; offer the free on-site dental day; agree who pays — company, shared or staff.',
        record: 'Stage “Meeting held”.' },
      { when: 'Within 24 hours of the meeting', who: 'Gautam', how: ['Email'], task: 'g-pilot',
        do: 'Send the standard proposal: price option, eligible staff, dental-day date, company code, review date.',
        record: 'Stage “Proposal sent”; calendar entry “SC – Company – proposal”.' },
      { when: 'Signed', who: 'Gautam + the company’s HR', how: ['Email', 'WhatsApp'], task: 'g-launch',
        do: 'Mohan’s launch kit; the message goes from the CEO or HR, not from us; reminders on day 3 and day 7.',
        record: 'Stage “Staff launched”; joins counted under the company code.' },
      { when: 'Dental day', who: 'Dr Luvi + Gautam + Mohan', how: ['In person'], task: 'g-onsite',
        do: 'Checks for staff, joining on the spot by the company QR code, first visits booked.',
        record: 'Joins and bookings under the company code.' },
      { when: 'Every Friday, or after any change', who: 'Gautam', how: ['System'],
        do: 'Upload the calendar file. Every “SC – Company – …” entry is filed against the company and the right corporate task. Update each company’s stage.',
        record: 'Team → Gautam’s companies.' },
    ],
    track: ['Pipeline by type: target → contacted → meeting → proposal → signed → launched', 'Weekly from the calendar: visits, follow-ups, meetings, proposals', 'Members per company code'],
  },

  search: {
    seg: 'search',
    accountable: 'Fahad',
    doers: 'Fahad (ads) · CRM-DN (page, replies, follow-up) · Gautam (gets the follow-up live) · Mohan (creative)',
    starts: 'Google now · follow-up Wed 30 Sep · Facebook/Instagram Fri 2 Oct',
    path: ['Online ad', 'Web page or WhatsApp', 'Reply within 10 minutes', 'Automatic follow-up on day 1 and day 3'],
    digital: 'This segment is digital by design — these people are already searching.',
    trained: 'CRM-DN runs the 10-minute reply rule with its own script; Gautam signs off the follow-up test.',
    steps: [
      { when: 'Now', who: 'Fahad', how: ['Online'], task: 'f-keywords',
        do: 'Three Google search campaigns (brand, price searches, insurance gap) and Facebook/Instagram reminder ads; every link carries its campaign code.',
        record: 'Campaign code on every enquiry.' },
      { when: 'A visitor lands', who: 'Website', how: ['Online'], task: 'c-landing',
        do: 'Membership page in English and Arabic: join online, WhatsApp us, or call.',
        record: 'Visit source recorded.' },
      { when: 'Within 10 minutes of an enquiry', who: 'Contact centre (CRM-DN)', how: ['WhatsApp', 'Phone'], task: 'c-contact',
        do: 'Answer; tag “membership” or “appointment”; offer to join or book.',
        record: 'Enquiry tagged in Zavis.' },
      { when: 'Enquired but did not book', who: 'Zavis, automatically — Gautam owns getting it live', how: ['WhatsApp'], task: 'c-retarget',
        do: 'The approved follow-up with Mohan’s image card on day 1 and day 3; stops on any reply or STOP.',
        record: 'Follow-up tag and code.' },
      { when: 'Every Monday', who: 'Fahad', how: ['System'], task: 'f-google-gate',
        do: 'Cost per enquiry and per paid member, by campaign. Cut anything costing more than AED 600 per member.',
        record: 'Weekly report; 5 Oct funding review.' },
    ],
    track: ['By campaign: clicks → enquiries → paid joins → cost per member', 'Contact centre: share of replies under 10 minutes'],
  },

  community: {
    seg: 'community',
    accountable: 'Fahad',
    doers: 'Fahad (partners, placement) · Dr Luvi (event, school talks) · Mohan (print) · Gautam (orders the print)',
    starts: 'Partners now · print placed and first event by Fri 9 Oct',
    path: ['In person — partner, school, building', 'Print with a QR code', 'In person — event'],
    digital: 'No digital awareness ads: trust comes from local places, and each place’s QR code makes it measurable.',
    trained: 'Fahad briefs each partner at signing; Dr Luvi briefs the clinician for the event.',
    steps: [
      { when: 'By Fri 2 Oct', who: 'Fahad', how: ['In person'], task: 'f-partners',
        do: 'Sign 2 local businesses (pharmacy, gym, salon) and 3 family promoters: one-page agreement, commission only on paid members, their own code.',
        record: 'Partner code live.' },
      { when: 'By Thu 8 Oct', who: 'Mohan → Gautam', how: ['Print'], task: 'g-procure-2',
        do: 'Posters, counter cards and school leaflets, each with its location’s QR code; Gautam orders them.',
        record: 'Quantities received.' },
      { when: 'By Fri 9 Oct', who: 'Fahad', how: ['In person'], task: 'f-awareness',
        do: 'Counter cards at partners; posters in building lobbies with the building manager’s OK; leaflets through two schools; the building WhatsApp admin posts one message.',
        record: 'Placement list: location and code.' },
      { when: 'Fri 9 Oct', who: 'Dr Luvi', how: ['In person'], task: 'l-csr',
        do: 'Community event: free smile checks, joining by QR with the event code, first visits booked.',
        record: 'Joins under the event code.' },
      { when: 'Monthly', who: 'Finance', how: ['System'],
        do: 'Pay partner and promoter commissions only for paid, active memberships under their code.',
        record: 'Commission report.' },
    ],
    track: ['Joins by location, partner and event code', 'Placements that bring no joins by 16 Oct are removed'],
  },
};
