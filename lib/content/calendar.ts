/**
 * Content calendar (Marketing › Content calendar, 9 Oct 2026, for Ms Shadi).
 *
 * One entry per publishing slot: what goes out, where, in which format, why
 * (one of four objectives), for whom, when, how often, and who owns it. It
 * consolidates every stream running with Mohan (Smile Club, the YMK Let's
 * Play pilot, Dental Nation campaigns, companies and community) in the
 * columns Ms Shadi asked for on 7 Oct. Production (shoots, edits, design
 * work) is kept apart: a shoot date is not a publishing date.
 *
 * Sources: Mohan's tasks (lib/smileclub/team.ts), the shoot plan
 * (lib/smileclub/shoots.ts), who films which campaign (CASTING in
 * lib/smileclub/creative.ts), the YMK plan (lib/smileclub/ymk.ts) and the
 * 9 Oct approvals (Fahad's email to Ms Shadi and Gautam). Smile Club
 * WhatsApp follows Mr Akbar's rule (team.ts): each dentist writes only to
 * their own patients, up to 20 messages a day per dentist.
 *
 * PURE module: no IO. The page adds live task progress and today's date.
 */
import { DENTISTS } from '@/lib/smileclub/scripts';
import { SHOOT_PLAN, deliveryFor } from '@/lib/smileclub/shoots';

/** The day the plan below was last brought up to date (shown on the page). */
export const DATA_AS_OF = '2026-10-09';

export const OBJECTIVES = ['Promotional', 'Trust-building', 'Educational', 'Engagement'] as const;
export type Objective = (typeof OBJECTIVES)[number];

export const CAMPAIGNS = [
  { key: 'smileclub', label: 'Smile Club' },
  { key: 'ymk', label: 'YMK Let\'s Play pilot' },
  { key: 'dn', label: 'Dental Nation clinics' },
  { key: 'corporate', label: 'Companies and community' },
] as const;
export type CampaignKey = (typeof CAMPAIGNS)[number]['key'];

/**
 * Where a piece stands: live = has gone out or is going out now; scheduled =
 * approved with a fixed date; ready = made, waiting for its slot; proposed =
 * the posting date is not agreed yet; confirm = it was due, but nobody has
 * confirmed it is made; plan = not planned yet.
 */
export type Status = 'live' | 'scheduled' | 'ready' | 'proposed' | 'confirm' | 'plan';
export const STATUS_LABEL: Record<Status, string> = {
  live: 'Out',
  scheduled: 'Scheduled',
  ready: 'Made',
  proposed: 'Date to agree',
  confirm: 'Check with Mohan',
  plan: 'Not planned yet',
};

export interface CalendarItem {
  id: string;
  what: string;
  objective: Objective;
  platform: string;
  format: string;
  campaign: CampaignKey;
  audience: string;
  /** Publishing date (ISO) when fixed or proposed; null when there is no single date. */
  date: string | null;
  /** How the timing reads when there is no single date, or a detail such as the hour. */
  when: string;
  frequency: string;
  status: Status;
  /** Production status in plain words. */
  detail: string;
  owner: string;
  language: string;
  /** Team task (lib/smileclub/team.ts) behind this piece: once marked done, the piece counts as made. */
  task?: string;
}

const WA_RULE = 'to the dentist\'s own patients only, up to 20 a day per dentist (shared with the patient waves)';

/** The six videos approved by Marketing on 9 Oct: a WhatsApp send that day, then an Instagram slot each. */
const APPROVED_VIDEOS: { id: string; what: string; objective: Objective; language: string; audience: string; reel: string }[] = [
  { id: 'safwan-enhanced', what: 'Dr Safwan: Smile Club video, enhanced version (at reception with MJ)', objective: 'Promotional', language: 'English', audience: 'Dr Safwan\'s patients at DN Al Wasl', reel: '2026-10-12' },
  { id: 'ali', what: 'Dr Ali: Smile Club video', objective: 'Promotional', language: 'English', audience: 'Dr Ali\'s patients at DN Al Wasl', reel: '2026-10-15' },
  { id: 'sevinc', what: 'Dr Sevinc: Smile Club video (English)', objective: 'Promotional', language: 'English', audience: 'Dr Sevinc\'s patients at Dr Tosun Dental Clinic', reel: '2026-10-17' },
  { id: 'safwan-standard', what: 'Dr Safwan: Smile Club video, standard version', objective: 'Promotional', language: 'English', audience: 'Dr Safwan\'s patients at DN Al Wasl', reel: '2026-10-20' },
  { id: 'qasem-footage', what: 'Dr Qasem: clinic footage video, no speaking (extra version)', objective: 'Trust-building', language: 'No speaking', audience: 'Dr Qasem\'s patients at DN Al Wasl', reel: '2026-10-22' },
  { id: 'tosun', what: 'Dr Tosun: Smile Club video', objective: 'Promotional', language: 'Turkish, English', audience: 'Dr Tosun\'s patients at Dr Tosun Dental Clinic', reel: '2026-10-24' },
];

const YMK_ROLE = 'YMK publishes · Mohan designs · Fahad coordinates';
const CHECK = (due: string) => `Was due ${due}; not confirmed as made`;
const DENTIST_VIDEOS = 'a Smile Club video and a second story each';
const AFTER_SHOOT = 'Filming 5 to 13 Oct; first edit 3 days after each shoot, finished 6 days after';

export const CALENDAR: CalendarItem[] = [
  ...APPROVED_VIDEOS.flatMap((v): CalendarItem[] => [
    { id: `${v.id}-wa`, what: v.what, objective: v.objective, platform: 'WhatsApp, in the dentist\'s name', format: 'Video', campaign: 'smileclub', audience: v.audience, date: '2026-10-09', when: '4:00 pm', frequency: 'One send', status: 'scheduled', detail: `Approved by Marketing 9 Oct; ${WA_RULE}`, owner: 'Mohan finishes the file · CRM-DN team sends', language: v.language },
    { id: `${v.id}-reel`, what: v.what, objective: v.objective, platform: 'Instagram and Facebook', format: 'Reel', campaign: 'smileclub', audience: `${v.audience}; new patients nearby`, date: v.reel, when: '', frequency: '2 to 3 Smile Club Reels a week', status: 'proposed', detail: 'Video approved 9 Oct; posting date not agreed yet', owner: 'Fahad posts · Ms Shadi agrees the date', language: v.language },
  ]),
  { id: 'sevinc-tr', what: 'Dr Sevinc: Smile Club video (Turkish)', objective: 'Promotional', platform: 'WhatsApp, then Instagram and Facebook', format: 'Reel', campaign: 'smileclub', audience: 'Dr Sevinc\'s Turkish-speaking patients', date: null, when: 'Date to agree, once the edit is finished', frequency: 'Once', status: 'proposed', detail: 'In edit; delivery date from Mohan', owner: 'Mohan edits · Fahad · Ms Shadi agrees the date', language: 'Turkish' },
  { id: 'yasmin', what: 'Dr Yasmin: Smile Club video', objective: 'Promotional', platform: 'WhatsApp, then Instagram and Facebook', format: 'Reel', campaign: 'smileclub', audience: 'Dr Yasmin\'s patients at DN Al Wasl', date: null, when: 'Date to agree', frequency: 'Once', status: 'confirm', detail: `Filmed 22 Sep; ${CHECK('24 Sep').toLowerCase()}`, owner: 'Mohan edits · Dr Yasmin approves · Fahad', language: 'Arabic, English', task: 'm-video-yasmin' },

  // The rest of the dentists, from the 5 to 13 Oct shoots.
  { id: 'sc-tosun-clinic', what: `Dentist videos, Dr Tosun Dental Clinic: Dr Maysoun Ahmad, Dr Maysoon Abdelmajeed, Dr Bulent, Dr Dilsad, Dr Sathyapriya (${DENTIST_VIDEOS})`, objective: 'Promotional', platform: 'WhatsApp, then Instagram and Facebook', format: 'Reel', campaign: 'smileclub', audience: 'Each dentist\'s own patients', date: '2026-10-26', when: 'From 26 Oct, 2 to 3 a week, in order of approval', frequency: '2 to 3 Smile Club Reels a week', status: 'proposed', detail: AFTER_SHOOT, owner: 'Mohan · Fahad · Ms Shadi, Dr Luvi, Gautam', language: 'Turkish and English; Arabic and English (Dr Maysoun, Dr Maysoon); English only (Dr Sathyapriya)' },
  { id: 'sc-alwasl', what: `Dentist videos, DN Al Wasl: Dr Qasem, Dr Ghada, Dr Hasna, and Dr Chahira once her date is set (${DENTIST_VIDEOS})`, objective: 'Promotional', platform: 'WhatsApp, then Instagram and Facebook', format: 'Reel', campaign: 'smileclub', audience: 'Each dentist\'s own patients', date: '2026-10-26', when: 'From 26 Oct, 2 to 3 a week, in order of approval', frequency: '2 to 3 Smile Club Reels a week', status: 'proposed', detail: 'Filming 7 to 11 Oct; Dr Chahira\'s date comes from MJ', owner: 'Mohan · Fahad · Ms Shadi, Dr Luvi, Gautam', language: 'Arabic, English' },
  { id: 'sc-amc', what: `Dentist videos, Al Maher Medical Centre: Dr Leila, Dr Maher, Dr Suzanna (${DENTIST_VIDEOS})`, objective: 'Promotional', platform: 'WhatsApp, then Instagram and Facebook', format: 'Reel', campaign: 'smileclub', audience: 'Each dentist\'s own patients', date: '2026-10-26', when: 'From 26 Oct, after the Al Maher announcement', frequency: '2 to 3 Smile Club Reels a week', status: 'proposed', detail: 'Filming 6 and 11 Oct', owner: 'Mohan · Fahad · Ms Shadi, Dr Luvi, Gautam', language: 'Arabic, English' },

  // Smile Club pieces from Mohan's task list.
  { id: 'sc-short-prevention', what: 'Short video: a doctor explains why prevention matters', objective: 'Educational', platform: 'Instagram and Facebook', format: 'Reel', campaign: 'smileclub', audience: 'People considering a membership', date: null, when: 'Date to agree', frequency: 'Within the Reels each week', status: 'confirm', detail: CHECK('2 Oct'), owner: 'Mohan · Dr Luvi (script) · Fahad', language: 'English, Arabic', task: 'm-videos' },
  { id: 'sc-short-included', what: 'Short video: what is included, in 30 seconds', objective: 'Promotional', platform: 'Instagram and Facebook', format: 'Reel', campaign: 'smileclub', audience: 'People considering a membership', date: null, when: 'Date to agree', frequency: 'Within the Reels each week', status: 'confirm', detail: CHECK('2 Oct'), owner: 'Mohan · Dr Luvi (script) · Fahad', language: 'English, Arabic', task: 'm-videos' },
  { id: 'sc-short-member', what: 'Short video: a real member\'s story', objective: 'Trust-building', platform: 'Instagram and Facebook', format: 'Reel', campaign: 'smileclub', audience: 'People considering a membership', date: null, when: 'Date to agree', frequency: 'Within the Reels each week', status: 'confirm', detail: CHECK('2 Oct'), owner: 'Mohan · Dr Luvi (script) · Fahad', language: 'English, Arabic', task: 'm-videos' },
  { id: 'sc-ads-1', what: 'Smile Club ads, set 1: 9 image ads for three audiences (worried about cost, parents, existing patients)', objective: 'Promotional', platform: 'Paid ads on Facebook and Instagram', format: 'Ad (image)', campaign: 'smileclub', audience: 'People worried about cost, parents, existing patients', date: null, when: 'Launch was planned for 2 Oct', frequency: 'Always on while the ads run', status: 'confirm', detail: 'Was due 28 Sep; not confirmed as made or launched', owner: 'Mohan designs · Dr Luvi checks · Fahad runs the ads', language: 'English, Arabic', task: 'm-dynamic-v1' },
  { id: 'sc-ads-2', what: 'Smile Club ads, set 2: new versions of the best performers', objective: 'Promotional', platform: 'Paid ads on Facebook and Instagram', format: 'Ad (image)', campaign: 'smileclub', audience: 'The same audiences, more of what worked', date: null, when: 'After the set 1 results', frequency: 'Always on while the ads run', status: 'proposed', detail: 'Due 15 Oct', owner: 'Mohan designs · Dr Luvi checks · Fahad runs the ads', language: 'English, Arabic', task: 'm-v2' },
  { id: 'sc-banner', what: 'Website banner: "Smile Club, dental care from AED 99/month, Join"', objective: 'Promotional', platform: 'Website', format: 'Banner', campaign: 'smileclub', audience: 'Every website visitor', date: null, when: 'Always on once built', frequency: 'Always on', status: 'confirm', detail: CHECK('24 Sep'), owner: 'Mohan designs · CRM-DN team builds', language: 'English, Arabic', task: 'm-banner' },
  { id: 'sc-cards', what: 'Invitation cards signed by the dentist, with a QR code to join', objective: 'Promotional', platform: 'In clinic', format: 'Print', campaign: 'smileclub', audience: 'Patients at their visit', date: null, when: 'Handed out at visits', frequency: 'Every visit', status: 'confirm', detail: CHECK('26 Sep'), owner: 'Mohan designs · Dr Luvi checks · Gautam orders the print', language: 'By clinic', task: 'm-invite' },
  { id: 'sc-followup', what: 'WhatsApp follow-up for people who enquired but did not book', objective: 'Promotional', platform: 'WhatsApp (automatic)', format: 'WhatsApp message', campaign: 'smileclub', audience: 'People who enquired but did not book, and patients who said "let me think" at the desk', date: null, when: '1 day and 3 days after the enquiry', frequency: 'Per enquiry', status: 'confirm', detail: CHECK('28 Sep'), owner: 'Mohan designs · Dr Luvi checks · CRM-DN team sets it up', language: 'English, Arabic, Turkish', task: 'm-wa-creative' },
  { id: 'sc-wave1', what: 'WhatsApp invitation, wave 1: active patients (check-up due)', objective: 'Promotional', platform: 'WhatsApp, in the dentist\'s name', format: 'WhatsApp message', campaign: 'smileclub', audience: 'Each dentist\'s own patients', date: '2026-09-29', when: '29 Sep to 2 Oct', frequency: 'Daily batches of up to 20 per dentist', status: 'live', detail: 'Approved wording per dentist', owner: 'CRM-DN team sends in each dentist\'s name', language: 'By dentist' },
  { id: 'sc-wave2', what: 'WhatsApp invitation, wave 2: inactive patients (last seen 6 to 18 months ago)', objective: 'Promotional', platform: 'WhatsApp, in the dentist\'s name', format: 'WhatsApp message', campaign: 'smileclub', audience: 'Each dentist\'s own patients', date: '2026-10-05', when: '', frequency: 'Daily batches of up to 20 per dentist', status: 'live', detail: 'Approved wording per dentist', owner: 'CRM-DN team sends in each dentist\'s name', language: 'By dentist' },
  { id: 'sc-wave3', what: 'WhatsApp invitation, wave 3: dormant patients (last seen over 18 months ago)', objective: 'Promotional', platform: 'WhatsApp, in the dentist\'s name', format: 'WhatsApp message', campaign: 'smileclub', audience: 'Each dentist\'s own patients', date: '2026-10-12', when: '', frequency: 'Daily batches of up to 20 per dentist', status: 'scheduled', detail: 'Approved wording per dentist', owner: 'CRM-DN team sends in each dentist\'s name', language: 'By dentist' },

  // YMK Let's Play pilot, 14 to 24 Oct (the plan approved on 7 Oct).
  { id: 'ymk-carousel', what: 'Launch post: 5 slides on the partnership (Smile Club with code YMK20), posted jointly with YMK', objective: 'Promotional', platform: 'Instagram (joint post with YMK)', format: 'Carousel', campaign: 'ymk', audience: 'YMK families', date: '2026-10-14', when: '', frequency: 'Once', status: 'scheduled', detail: 'Plan approved 7 Oct; designs approved 12 Oct', owner: YMK_ROLE, language: 'English' },
  { id: 'ymk-stories', what: 'Launch Story (3 frames)', objective: 'Engagement', platform: 'Instagram (YMK)', format: 'Story', campaign: 'ymk', audience: 'YMK families', date: '2026-10-14', when: '', frequency: 'Once', status: 'scheduled', detail: 'Plan approved 7 Oct; designs approved 12 Oct', owner: YMK_ROLE, language: 'English' },
  { id: 'ymk-wa1', what: 'WhatsApp announcement 1', objective: 'Promotional', platform: 'YMK WhatsApp group', format: 'WhatsApp message', campaign: 'ymk', audience: 'YMK families', date: '2026-10-14', when: '', frequency: 'Once', status: 'scheduled', detail: 'Plan approved 7 Oct; designs approved 12 Oct', owner: YMK_ROLE, language: 'English' },
  { id: 'ymk-poster', what: 'QR poster and table card at YMK', objective: 'Promotional', platform: 'At YMK', format: 'Print', campaign: 'ymk', audience: 'Families at YMK', date: '2026-10-14', when: '', frequency: 'For the pilot', status: 'scheduled', detail: 'Printed in-house by 13 Oct', owner: YMK_ROLE, language: 'English' },
  { id: 'ymk-clips', what: 'Story clips from the game day (8 to 10 short clips)', objective: 'Engagement', platform: 'Instagram (YMK)', format: 'Story', campaign: 'ymk', audience: 'YMK families', date: '2026-10-16', when: '16 to 24 Oct', frequency: 'Across the pilot', status: 'scheduled', detail: 'Filming 14 or 15 Oct; clips delivered 16 Oct', owner: YMK_ROLE, language: 'English' },
  { id: 'ymk-spots', what: '"Places left" Story: how many of the 20 discount places remain', objective: 'Engagement', platform: 'Instagram (YMK)', format: 'Story', campaign: 'ymk', audience: 'YMK families', date: '2026-10-17', when: '', frequency: 'Once', status: 'scheduled', detail: 'Plan approved 7 Oct', owner: YMK_ROLE, language: 'English' },
  { id: 'ymk-reel', what: 'Reel "Game day with our dentist", posted jointly with YMK', objective: 'Trust-building', platform: 'Instagram (joint post with YMK)', format: 'Reel', campaign: 'ymk', audience: 'YMK families', date: '2026-10-19', when: '', frequency: 'Once', status: 'scheduled', detail: 'Filming 14 or 15 Oct; Reel delivered 19 Oct', owner: YMK_ROLE, language: 'English' },
  { id: 'ymk-wa2', what: 'WhatsApp announcement 2 (shares the Reel)', objective: 'Promotional', platform: 'YMK WhatsApp group', format: 'WhatsApp message', campaign: 'ymk', audience: 'YMK families', date: '2026-10-19', when: '', frequency: 'Once', status: 'scheduled', detail: 'Plan approved 7 Oct', owner: YMK_ROLE, language: 'English' },
  { id: 'ymk-lastcall', what: 'Last-call Story', objective: 'Promotional', platform: 'Instagram (YMK)', format: 'Story', campaign: 'ymk', audience: 'YMK families', date: '2026-10-21', when: '', frequency: 'Once', status: 'scheduled', detail: 'Plan approved 7 Oct', owner: YMK_ROLE, language: 'English' },
  { id: 'ymk-wa3', what: 'WhatsApp announcement 3 (last call)', objective: 'Promotional', platform: 'YMK WhatsApp group', format: 'WhatsApp message', campaign: 'ymk', audience: 'YMK families', date: '2026-10-21', when: '', frequency: 'Once', status: 'scheduled', detail: 'Plan approved 7 Oct', owner: YMK_ROLE, language: 'English' },

  // Dental Nation clinics.
  { id: 'dn-announce-tosun', what: 'Announcement: Dr Tosun Dental Clinic is now part of Dental Nation', objective: 'Trust-building', platform: 'Instagram, Facebook, WhatsApp', format: 'Reel', campaign: 'dn', audience: 'Dr Tosun Dental Clinic patients: what changes and what stays the same', date: null, when: 'Date to agree (Gautam and Dr Tosun)', frequency: 'Once', status: 'confirm', detail: 'To film with Dr Tosun\'s second video once Gautam confirms the facts', owner: 'Gautam (facts) · Mohan · Fahad', language: 'Turkish, English', task: 'g-announce' },
  { id: 'dn-announce-amc', what: 'Announcement: Al Maher Medical Centre is now part of Dental Nation (Dr Maher\'s version first)', objective: 'Trust-building', platform: 'Instagram, Facebook, WhatsApp', format: 'Reel', campaign: 'dn', audience: 'Al Maher patients: what changes and what stays the same', date: null, when: 'Date to agree (Gautam and Dr Maher)', frequency: 'Once per dentist', status: 'confirm', detail: 'Filming planned 6 Oct (Dr Leila) and 11 Oct (Dr Maher, Dr Suzanna); not confirmed', owner: 'Gautam (facts) · Mohan · Fahad', language: 'Arabic, English' },
  { id: 'dn-scan', what: 'Campaign video: The DN Scan (braces and aligner planning), with Dr Tosun, Dr Yasmin and Dr Suzanna', objective: 'Promotional', platform: 'Paid ads on Facebook and Instagram', format: 'Ad (video)', campaign: 'dn', audience: 'People in Dubai looking at braces or aligners', date: null, when: 'Starts once the videos are approved', frequency: 'Always on while the ads run', status: 'proposed', detail: 'Filming planned 5 Oct (Dr Tosun) and 11 Oct (Dr Yasmin, Dr Suzanna); 15 s and 30 s versions to follow', owner: 'Mohan · Fahad runs the ads', language: 'Per dentist' },
  { id: 'dn-firstlook', what: 'Campaign video: The DN First Look (welcome visit), with Dr Safwan, Dr Leila and Dr Bulent', objective: 'Promotional', platform: 'Paid ads on Facebook and Instagram', format: 'Ad (video)', campaign: 'dn', audience: 'New patients in Dubai', date: null, when: 'Starts once the videos are approved', frequency: 'Always on while the ads run', status: 'proposed', detail: 'Filming planned 6 Oct; not confirmed', owner: 'Mohan · Fahad runs the ads', language: 'Per dentist' },
  { id: 'dn-glowup', what: 'Campaign video: The DN Glow Up (whitening), with Dr Ali and Dr Dilsad', objective: 'Promotional', platform: 'Paid ads on Facebook and Instagram', format: 'Ad (video)', campaign: 'dn', audience: 'People in Dubai looking at whitening', date: null, when: 'Starts once the videos are approved', frequency: 'Always on while the ads run', status: 'proposed', detail: 'Filming planned 6 and 7 Oct; not confirmed', owner: 'Mohan · Fahad runs the ads', language: 'Per dentist' },
  { id: 'dn-sos', what: 'Campaign video: Urgent dental care (DN SOS), with Dr Maher', objective: 'Promotional', platform: 'Paid ads on Facebook and Instagram', format: 'Ad (video)', campaign: 'dn', audience: 'People in pain who need a dentist today', date: null, when: 'Starts once the video is approved', frequency: 'Always on while the ads run', status: 'proposed', detail: 'Filming planned 11 Oct', owner: 'Mohan · Fahad runs the ads', language: 'Arabic, English' },
  { id: 'dn-portraits', what: 'Doctor portraits, including a new shoot for Dr Chahira', objective: 'Trust-building', platform: 'Website, Google Business Profile, Instagram', format: 'Photo', campaign: 'dn', audience: 'Patients choosing a dentist', date: null, when: 'When ready', frequency: 'Once per dentist', status: 'confirm', detail: 'To schedule: better locations, composition and posing; no thumbs-up poses', owner: 'Mohan · Fahad · Ms Shadi', language: 'n/a' },
  // The gap: always-on Dental Nation content (not in the plan with Mohan yet).
  { id: 'dn-explainers', what: 'Treatment explainers: what happens, how long it takes, aftercare', objective: 'Educational', platform: 'Instagram and Facebook', format: 'Reel', campaign: 'dn', audience: 'People researching a treatment', date: null, when: 'To plan with Ms Shadi', frequency: 'Proposed: 1 a week', status: 'plan', detail: 'Not in the plan yet', owner: 'Fahad and Ms Shadi plan · Mohan makes', language: 'English, Arabic' },
  { id: 'dn-reviews', what: 'Patient reviews and testimonials (with consent)', objective: 'Trust-building', platform: 'Instagram, Google Business Profile', format: 'Post', campaign: 'dn', audience: 'People comparing clinics', date: null, when: 'To plan with Ms Shadi', frequency: 'Proposed: 1 a week', status: 'plan', detail: 'Not in the plan yet', owner: 'Fahad and Ms Shadi plan · Mohan makes', language: 'English, Arabic' },
  { id: 'dn-gbp', what: 'Google Business Profile posts: offers, news, new doctors', objective: 'Engagement', platform: 'Google Business Profile', format: 'Post', campaign: 'dn', audience: 'People finding us on Google Maps', date: null, when: 'To plan with Ms Shadi', frequency: 'Proposed: 1 a week per clinic', status: 'plan', detail: 'Not in the plan yet', owner: 'Fahad and Ms Shadi plan · Mohan makes', language: 'English, Arabic' },
  { id: 'dn-team', what: 'The clinics and the team: behind the scenes, equipment, new faces', objective: 'Trust-building', platform: 'Instagram', format: 'Story', campaign: 'dn', audience: 'Followers and existing patients', date: null, when: 'To plan with Ms Shadi', frequency: 'Proposed: 3 a week', status: 'plan', detail: 'Not in the plan yet', owner: 'Fahad and Ms Shadi plan · Mohan makes', language: 'English, Arabic' },

  // Companies and community.
  { id: 'co-linkedin', what: 'LinkedIn posts for HR managers: "Dental benefits made simple" (6 posts)', objective: 'Educational', platform: 'LinkedIn', format: 'Post', campaign: 'corporate', audience: 'HR managers, before Gautam\'s company visits', date: null, when: 'Date to agree', frequency: '2 a week; Fahad posts', status: 'confirm', detail: `${CHECK('25 Sep')}; with a one-page benefits checklist`, owner: 'Mohan designs · Gautam and Fahad approve', language: 'English', task: 'm-linkedin' },
  { id: 'co-printkit', what: 'Company visit kit: one-page summary, savings table, dental-day banner, QR cards', objective: 'Promotional', platform: 'Company visits', format: 'Print', campaign: 'corporate', audience: 'HR managers and staff at company visits', date: null, when: 'At each visit', frequency: 'Per visit', status: 'confirm', detail: CHECK('25 Sep'), owner: 'Mohan designs · Gautam orders the print', language: 'English, Arabic', task: 'm-printkit' },
  { id: 'co-launchkit', what: 'Staff launch kit for a company that signs: email, WhatsApp card, QR poster', objective: 'Promotional', platform: 'Email, WhatsApp, office poster', format: 'Email', campaign: 'corporate', audience: 'Staff of a company that has signed', date: '2026-10-14', when: 'First company launch, if a company has signed', frequency: 'Per company', status: 'proposed', detail: CHECK('5 Oct'), owner: 'Mohan designs · Gautam approves · the company\'s CEO or HR sends', language: 'English, Arabic', task: 'm-launchkit' },
  { id: 'co-dentalday', what: 'Company dental day: photos and video', objective: 'Trust-building', platform: 'LinkedIn, Instagram', format: 'Reel', campaign: 'corporate', audience: 'The next companies: proof from a real dental day', date: null, when: 'After the company approves', frequency: 'Per dental day', status: 'proposed', detail: 'Filming planned 16 Oct, with written consent', owner: 'Mohan · Gautam · Dr Luvi', language: 'English', task: 'm-film-onsite' },
  { id: 'co-community', what: 'Community print: lobby posters, pharmacy and gym counter cards, school leaflet', objective: 'Promotional', platform: 'Near the clinics', format: 'Print', campaign: 'corporate', audience: 'Families and neighbours near the clinics', date: null, when: 'Ongoing once placed', frequency: 'Always on', status: 'confirm', detail: `${CHECK('7 Oct')}; each piece has its own QR code`, owner: 'Mohan designs · Dr Luvi checks · Fahad', language: 'English, Arabic', task: 'm-geo' },
  { id: 'co-promoters', what: 'Guide and ready-made post for people promoting Smile Club with their own code', objective: 'Engagement', platform: 'Instagram (promoters\' own accounts)', format: 'Post', campaign: 'corporate', audience: 'Promoters Fahad signs up', date: null, when: 'When each promoter signs up', frequency: 'Per promoter', status: 'confirm', detail: CHECK('2 Oct'), owner: 'Mohan designs · Fahad approves', language: 'English, Arabic', task: 'm-creator' },
];

/** How often we post on each platform: a proposal to agree with Ms Shadi. */
export const FREQUENCY: { platform: string; how: string; fills: string }[] = [
  { platform: 'Instagram and Facebook Reels', how: '2 to 3 Smile Club Reels a week, plus 1 treatment explainer', fills: 'The approved dentist videos first, then the rest in order of approval' },
  { platform: 'Instagram Stories', how: 'About 3 a week; plus YMK\'s Stories during the pilot', fills: 'The clinics and the team, Smile Club reminders' },
  { platform: 'Instagram posts', how: '1 a week', fills: 'Patient reviews and Smile Club explainers' },
  { platform: 'Google Business Profile', how: '1 post a week per clinic', fills: 'Offers, news, new doctors, reviews' },
  { platform: 'WhatsApp', how: 'Each dentist to their own patients, up to 20 a day; automatic follow-up 1 and 3 days after an enquiry', fills: 'Smile Club invitations and the approved videos, in each dentist\'s name' },
  { platform: 'LinkedIn', how: '2 posts a week while company visits run', fills: 'HR managers (Smile Club for companies)' },
  { platform: 'Paid ads on Facebook and Instagram', how: 'Always on while each campaign runs', fills: 'Smile Club, The DN Scan, The DN First Look, The DN Glow Up, urgent dental care' },
];

/* ─── Helpers ─────────────────────────────────────────────────────────── */

const DAY = 86_400_000;
const at = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Monday of the week an ISO date falls in. */
export function weekStart(iso: string): string {
  const d = new Date(at(iso));
  return isoOf(at(iso) - ((d.getUTCDay() + 6) % 7) * DAY);
}
export const addDays = (iso: string, n: number) => isoOf(at(iso) + n * DAY);
export function dayLabel(iso: string): string {
  const d = new Date(at(iso));
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MO[d.getUTCMonth()]}`;
}
/** "5 to 11 Oct" for the week starting on a Monday. */
export function weekLabel(monday: string): string {
  const a = new Date(at(monday)), b = new Date(at(addDays(monday, 6)));
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()} to ${b.getUTCDate()} ${MO[b.getUTCMonth()]}`
    : `${a.getUTCDate()} ${MO[a.getUTCMonth()]} to ${b.getUTCDate()} ${MO[b.getUTCMonth()]}`;
}

/**
 * A team task marked done means the piece is made: a piece waiting on
 * confirmation becomes "Made"; a piece whose date is still to agree keeps that
 * status and says it is made.
 */
export function withTaskProgress(items: CalendarItem[], done: (task: string) => boolean): CalendarItem[] {
  return items.map((i) => {
    if (!i.task || !done(i.task)) return i;
    if (i.status === 'confirm') return { ...i, status: 'ready' as const, detail: 'Made (Mohan\'s task is marked done)' };
    if (i.status === 'proposed') return { ...i, detail: `${i.detail}; made (Mohan's task is marked done)` };
    return i;
  });
}

export function filterCampaign(items: CalendarItem[], key: string | undefined): CalendarItem[] {
  return CAMPAIGNS.some((c) => c.key === key) ? items.filter((i) => i.campaign === key) : items;
}

/** Dated items grouped by week (Monday), sorted; undated items apart. */
export function byWeek(items: CalendarItem[]): { weeks: { monday: string; items: CalendarItem[] }[]; undated: CalendarItem[] } {
  const map = new Map<string, CalendarItem[]>();
  for (const i of items.filter((x) => x.date)) {
    const k = weekStart(i.date!);
    (map.get(k) ?? map.set(k, []).get(k)!).push(i);
  }
  const weeks = [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([monday, list]) => ({ monday, items: list.sort((a, b) => a.date!.localeCompare(b.date!)) }));
  const order: Status[] = ['live', 'scheduled', 'ready', 'proposed', 'confirm', 'plan'];
  return { weeks, undated: items.filter((x) => !x.date).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status)) };
}

/** Share of entries by objective, largest first. */
export function mix(items: CalendarItem[]): { objective: Objective; n: number; share: number }[] {
  const total = items.length || 1;
  return OBJECTIVES.map((o) => ({ objective: o, n: items.filter((i) => i.objective === o).length }))
    .map((x) => ({ ...x, share: x.n / total }))
    .sort((a, b) => b.n - a.n);
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Plain-language list of what needs sorting out in the given entries, most
 * useful first. The whole-plan checks (content mix, empty weeks) only make
 * sense for the full calendar, so a campaign view passes whole = false.
 */
export function checks(items: CalendarItem[], today: string, whole = true): string[] {
  const out: string[] = [];
  const confirm = items.filter((i) => i.status === 'confirm');
  if (confirm.length) out.push(`${confirm.length} ${plural(confirm.length, 'piece was', 'pieces were')} due, but nobody has confirmed ${plural(confirm.length, 'it is', 'they are')} made. Ask Mohan; once confirmed, mark ${plural(confirm.length, 'it', 'them')} done in the team task calendar (Smile Club Plan tab) and this page updates itself.`);
  const proposed = items.filter((i) => i.status === 'proposed' && i.date);
  const missed = proposed.filter((i) => i.date! < today);
  if (missed.length) out.push(`${missed.length} posting ${plural(missed.length, 'date has', 'dates have')} passed without being agreed.`);
  const soon = proposed.filter((i) => i.date! >= today && i.date! <= addDays(today, 7));
  if (soon.length) out.push(`${soon.length} posting ${plural(soon.length, 'date', 'dates')} in the next 7 days ${plural(soon.length, 'is', 'are')} not agreed with Ms Shadi yet.`);
  const tosunAnnounce = items.find((i) => i.id === 'dn-announce-tosun');
  const tosunFirst = items.filter((i) => i.campaign === 'smileclub' && /Dr Tosun Dental Clinic/.test(i.audience) && i.date).sort((a, b) => a.date!.localeCompare(b.date!))[0];
  if (tosunAnnounce && !tosunAnnounce.date && tosunFirst) out.push(`The Dr Tosun Dental Clinic announcement has no date yet, while the clinic's Smile Club videos start on ${dayLabel(tosunFirst.date!)}.`);
  const amc = items.find((i) => i.id === 'dn-announce-amc');
  if (amc && !amc.date) out.push('The Al Maher announcement has no date yet; the Al Maher dentist videos wait for it.');
  const edu = items.filter((i) => i.objective === 'Educational').length;
  const promo = items.filter((i) => i.objective === 'Promotional').length;
  if (whole && items.length >= 10 && edu / items.length < 0.1) out.push(`Only ${edu} of ${items.length} entries are educational; ${promo} are promotional. A weekly treatment explainer would balance this.`);
  const gbp = items.find((i) => i.id === 'dn-gbp');
  if (gbp && gbp.status === 'plan') out.push('Nothing is planned yet for Google Business Profile posts, where many patients find us on Google Maps.');
  if (whole && items.some((i) => i.date)) {
    const empty: string[] = [];
    for (let w = 0; w < 4; w++) {
      const monday = addDays(weekStart(today), 7 * w);
      if (!items.some((i) => i.date && weekStart(i.date) === monday)) empty.push(weekLabel(monday));
    }
    if (empty.length) out.push(`Nothing is dated in the ${plural(empty.length, 'week', 'weeks')} of ${empty.join(', ')}.`);
  }
  return out;
}

/* ─── Production: what feeds the calendar (shoot dates are not publishing dates) ── */

export interface ProductionItem { date: string; label: string; what: string; delivery: string; status: string }

const nameOf = (id: string) => {
  const d = DENTISTS.find((x) => x.id === id);
  return d ? d.name.replace(/^Dr\. (M )?/, 'Dr ') : id;
};

/** Shoots from the shoot plan from `from` onwards, with edit dates, plus the other production work. */
export function production(today: string, from = '2026-10-05'): ProductionItem[] {
  const shoots: ProductionItem[] = SHOOT_PLAN.filter((d) => d.iso >= from).map((d) => {
    const del = deliveryFor(d.iso);
    const slots = d.stops.flatMap((s) => s.slots);
    const filmed = slots.filter((s) => s.status === 'filmed').length;
    return {
      date: d.iso,
      label: d.label,
      what: `Filming: ${slots.map((s) => `${nameOf(s.id)}${s.only ? ' (second video)' : ''}`).join(', ')}`,
      delivery: `First edit ${del.firstCutLabel}; finished ${del.finalLabel}`,
      status: filmed === slots.length ? 'Filmed' : d.iso < today ? (filmed ? `${filmed} of ${slots.length} filmed; ask Mohan about the rest` : 'Filming not confirmed: ask Mohan') : 'Planned',
    };
  });
  const other: ProductionItem[] = [
    { date: '2026-10-09', label: 'Fri 9 Oct', what: 'Smile Club name on the six approved videos; final files uploaded', delivery: 'Before 4:00 pm', status: 'In progress' },
    { date: '2026-10-10', label: 'Sat 10 Oct', what: 'YMK launch designs: 5-slide post, Story, WhatsApp image', delivery: 'Approved Mon 12 Oct: Marketing, then Gautam and Ms Shadi, then YMK', status: 'Planned' },
    { date: '2026-10-13', label: 'Tue 13 Oct', what: 'YMK QR poster (A3) and table card (A5)', delivery: 'Printed in-house; QR tested on two phones', status: 'Planned' },
    { date: '2026-10-14', label: 'Wed 14 Oct', what: 'Smile Club logo: two or three options', delivery: 'Ms Shadi and Gautam choose; then used everywhere', status: 'Planned' },
    { date: '2026-10-14', label: 'Wed 14 or Thu 15 Oct', what: 'Film one YMK session', delivery: 'YMK confirms the time', status: 'Planned' },
    { date: '2026-10-15', label: 'Thu 15 Oct', what: 'Smile Club ads, set 2', delivery: 'After the set 1 results', status: 'Planned' },
    { date: '2026-10-16', label: 'Fri 16 Oct', what: 'YMK Story clips (8 to 10) and the "places left" Story frame', delivery: 'To YMK', status: 'Planned' },
    { date: '2026-10-16', label: 'Fri 16 Oct', what: 'Film the company dental day', delivery: 'Written consent; the company approves', status: 'Planned' },
    { date: '2026-10-19', label: 'Mon 19 Oct', what: 'YMK Reel "Game day with our dentist" (30 s, 15 s, 6 s) and its cover', delivery: 'To YMK', status: 'Planned' },
    { date: '2026-10-20', label: 'Tue 20 Oct', what: 'YMK last-call Story frame and WhatsApp image, each with a second version for code YMK', delivery: 'To YMK', status: 'Planned' },
    { date: '2026-10-20', label: 'Tue 20 Oct', what: 'Design library: every design filed with audience, format, approval date and result', delivery: 'Handed to Fahad', status: 'Planned' },
  ];
  return [...shoots, ...other].sort((a, b) => a.date.localeCompare(b.date));
}
