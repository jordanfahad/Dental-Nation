/**
 * The social content calendar (/next/calendar), edited by hand as the month is
 * planned. Approved in the DN Ortho plan with Mr Akbar on 5 Nov 2026: 5 ortho
 * posts and 1 Smile Club post a week, three tracks, plus 2 to 3 stories a day.
 *
 * `status` is the production state, updated by marketing as things move:
 *  - 'posted': live on the channels;
 *  - 'scheduled': creative ready and scheduled;
 *  - 'in-production': being made by its track owner;
 *  - 'creative-pending': waiting on Zavis for the creative (their responsibility);
 *  - 'planned': in the plan, production not started.
 */
export type CalendarTrack = 'zavis' | 'ai' | 'real';
export type CalendarSegment = 'S1' | 'S2' | 'S3' | 'SC' | 'all';
export type CalendarStatus = 'posted' | 'scheduled' | 'in-production' | 'creative-pending' | 'planned';

export interface CalendarPost {
  /** Dubai posting day, YYYY-MM-DD. */
  date: string;
  title: string;
  track: CalendarTrack;
  segment: CalendarSegment;
  /** Also runs as a paid ad for its segment. */
  ad: boolean;
  status: CalendarStatus;
  /** One line of context (doctor, language, consent), optional. */
  note?: string;
}

export interface CalendarWeek {
  theme: string;
  posts: CalendarPost[];
}

export const TRACK_LABEL: Record<CalendarTrack, string> = {
  zavis: 'Zavis (premium everyday)',
  ai: 'AI video (personalised)',
  real: 'Real (clinic and doctors)',
};
export const SEGMENT_LABEL: Record<CalendarSegment, string> = {
  S1: 'S1 adults', S2: 'S2 after braces', S3: 'S3 parents', SC: 'Smile Club', all: 'All',
};
export const STATUS_LABEL: Record<CalendarStatus, string> = {
  posted: 'Posted',
  scheduled: 'Scheduled',
  'in-production': 'In production',
  'creative-pending': 'Creative pending (Zavis)',
  planned: 'Planned',
};

/** November 2026 (8 Nov to 4 Dec), as agreed on 5 Nov 2026. */
export const CONTENT_CALENDAR: CalendarWeek[] = [
  {
    theme: "It's not too late",
    posts: [
      { date: '2026-11-08', title: 'Dr Hasna: "Am I too old for braces?" (reel)', track: 'real', segment: 'S1', ad: true, status: 'scheduled' },
      { date: '2026-11-09', title: 'Premium static: a straighter smile in 3 steps', track: 'zavis', segment: 'S1', ad: false, status: 'creative-pending' },
      { date: '2026-11-10', title: 'AI video: "Teeth moved after braces? Here’s why"', track: 'ai', segment: 'S2', ad: true, status: 'in-production', note: 'English and Arabic' },
      { date: '2026-11-11', title: 'The digital scan in 60 seconds (reel)', track: 'real', segment: 'S1', ad: false, status: 'planned' },
      { date: '2026-11-12', title: 'AI video for parents: "When is the first ortho check?"', track: 'ai', segment: 'S3', ad: true, status: 'in-production' },
      { date: '2026-11-13', title: 'Smile Club: your company’s smile perk', track: 'zavis', segment: 'SC', ad: false, status: 'creative-pending' },
    ],
  },
  {
    theme: 'Discreet',
    posts: [
      { date: '2026-11-15', title: 'Dr Yahya: clear aligners or ceramic braces?', track: 'real', segment: 'S1', ad: true, status: 'planned' },
      { date: '2026-11-16', title: 'Premium static: invisible at work', track: 'zavis', segment: 'S1', ad: false, status: 'creative-pending' },
      { date: '2026-11-17', title: 'AI video: "Lost your retainer? What to do this week"', track: 'ai', segment: 'S2', ad: true, status: 'planned' },
      { date: '2026-11-18', title: 'Patient story, with signed consent', track: 'real', segment: 'S1', ad: true, status: 'planned' },
      { date: '2026-11-19', title: 'Parent myth: "wait until all adult teeth are in"', track: 'ai', segment: 'S3', ad: false, status: 'planned' },
      { date: '2026-11-20', title: 'Smile Club: team smile day at a partner company', track: 'zavis', segment: 'SC', ad: false, status: 'creative-pending' },
    ],
  },
  {
    theme: 'Confidence',
    posts: [
      { date: '2026-11-22', title: 'Doctors answer your DMs (reel)', track: 'real', segment: 'S1', ad: false, status: 'planned' },
      { date: '2026-11-23', title: 'Smile result, with patient consent', track: 'zavis', segment: 'S1', ad: false, status: 'creative-pending' },
      { date: '2026-11-24', title: 'AI video (Arabic): "Do I need a retainer for life?"', track: 'ai', segment: 'S2', ad: false, status: 'planned' },
      { date: '2026-11-25', title: 'Behind the scenes: aligner fitting day', track: 'real', segment: 'S1', ad: false, status: 'planned' },
      { date: '2026-11-26', title: 'Parent guide: 4 signs your child may need ortho', track: 'ai', segment: 'S3', ad: true, status: 'planned' },
      { date: '2026-11-27', title: 'Smile Club: how to join, in 3 steps', track: 'zavis', segment: 'SC', ad: false, status: 'creative-pending' },
    ],
  },
  {
    theme: 'National Day smiles',
    posts: [
      { date: '2026-11-29', title: 'Top questions of November, answered', track: 'real', segment: 'S1', ad: false, status: 'planned' },
      { date: '2026-11-30', title: 'AI video: relapse fixed quickly, step by step', track: 'ai', segment: 'S2', ad: true, status: 'planned' },
      { date: '2026-12-01', title: 'Commemoration Day: respectful message only, no offer', track: 'zavis', segment: 'all', ad: false, status: 'creative-pending' },
      { date: '2026-12-02', title: 'National Day: the team in each clinic', track: 'real', segment: 'all', ad: false, status: 'planned' },
      { date: '2026-12-03', title: 'Dr Yasmin: what happens at a child’s first visit', track: 'real', segment: 'S3', ad: false, status: 'planned' },
      { date: '2026-12-04', title: 'Smile Club: year-end team check-ups', track: 'zavis', segment: 'SC', ad: false, status: 'creative-pending' },
    ],
  },
];

export const CALENDAR_NOTE =
  'Plus 2 to 3 stories a day (behind the scenes, new Google reviews, doctor Q&A, Smile Club shout-outs). The best post each week becomes a paid ad for its segment. Clinical claims, results and patient content are signed off by Dr Luvi before posting.';
