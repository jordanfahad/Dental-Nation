/**
 * Smile Club x YMK Let's Play: the approved 10-day community pilot
 * (plan approved 7 Oct 2026). Organic only, on YMK's Instagram and WhatsApp;
 * no media spend and no paid talent. One source for the daily alert section,
 * Mohan's morning email and the shoot schedule on the dashboard.
 */

export const YMK = {
  start: '2026-10-14',
  end: '2026-10-24',
  review: '2026-10-26',
  /** The daily alert section runs from the day after approval to the final review. */
  alertFrom: '2026-10-08',
  offer: 'Smile Club plans from AED 99/month; the first 20 YMK members get 20% off plan prices for the full year with code YMK20, then code YMK.',
  film: { days: ['2026-10-14', '2026-10-15'], label: 'Wed 14 or Thu 15 Oct', note: 'One YMK session (football or volleyball, YMK confirms which and the time). Arrive at warm-up, 60 to 90 minutes. Players with consent only, plus one of our dentists courtside for the Reel.' },
};

export type YmkOwner = 'Mohan' | 'YMK' | 'Fahad';
export interface YmkItem { iso: string; owner: YmkOwner; what: string }

/** Every dated step of the approved plan, in order. Sizes are on page 2 of the plan. */
export const YMK_ITEMS: YmkItem[] = [
  { iso: '2026-10-10', owner: 'Mohan', what: 'Deliver the launch statics: partnership carousel (5 slides, 1080 x 1350), launch Story set (3 frames, 1080 x 1920) and the WhatsApp launch image (1080 x 1080)' },
  { iso: '2026-10-12', owner: 'Fahad', what: 'Approvals for the launch statics: Marketing review first, then Gautam and Ms Shadi, then YMK' },
  { iso: '2026-10-13', owner: 'Mohan', what: 'QR poster (A3) and table card (A5), print-ready PDF with 3 mm bleed, printed in-house; QR tested on two phones' },
  { iso: '2026-10-14', owner: 'YMK', what: 'Launch day: Collab carousel, launch Story set and WhatsApp announcement 1; posters up at check-in and rest areas' },
  { iso: '2026-10-14', owner: 'Mohan', what: 'Film one YMK session (Wed 14 or Thu 15 Oct, YMK confirms the time)' },
  { iso: '2026-10-16', owner: 'Mohan', what: 'Deliver 8 to 10 raw Story clips (5 to 10 s, 1080 x 1920) for YMK, plus the "spots left" Story frame' },
  { iso: '2026-10-17', owner: 'YMK', what: '"Spots left" Story with the real count of YMK20 places used' },
  { iso: '2026-10-19', owner: 'Mohan', what: 'Deliver the Reel "Game day with our dentist" (30 s, 15 s and 6 s, 1080 x 1920) and the Reel cover' },
  { iso: '2026-10-19', owner: 'YMK', what: 'Reel goes out as a Collab; WhatsApp announcement 2 shares it' },
  { iso: '2026-10-19', owner: 'Fahad', what: 'Mid-point check: reach and views, link clicks, enquiries, sign-ups and code use' },
  { iso: '2026-10-20', owner: 'Mohan', what: 'Deliver the last-call Story frame and WhatsApp image, each with a second version for code YMK' },
  { iso: '2026-10-21', owner: 'YMK', what: 'Last-call Story and WhatsApp announcement 3 (switch to code YMK if all 20 YMK20 places are used)' },
  { iso: '2026-10-24', owner: 'YMK', what: 'Pilot ends' },
  { iso: '2026-10-26', owner: 'Fahad', what: 'Final report: memberships completed, code use, reach and enquiries; decision on next steps' },
];

const DAY_MS = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY_MS);
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
export const fmtYmkDay = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`;
};

export const ymkActive = (today: string) => today >= YMK.alertFrom && today <= YMK.review;

/** One line on where the pilot stands today. */
export function ymkStatus(today: string): string {
  if (today < YMK.start) {
    const n = daysBetween(today, YMK.start);
    return `Launches in ${n} day${n === 1 ? '' : 's'}, on ${fmtYmkDay(YMK.start)}.`;
  }
  if (today <= YMK.end) return `Day ${daysBetween(YMK.start, today) + 1} of ${daysBetween(YMK.start, YMK.end) + 1} (runs to ${fmtYmkDay(YMK.end)}).`;
  return `Pilot ended ${fmtYmkDay(YMK.end)}; final report ${today === YMK.review ? 'today' : fmtYmkDay(YMK.review)}.`;
}

/** Items due today and in the next `ahead` days. */
export function ymkWindow(today: string, ahead = 3) {
  const until = addDays(today, ahead);
  return {
    today: YMK_ITEMS.filter((i) => i.iso === today),
    next: YMK_ITEMS.filter((i) => i.iso > today && i.iso <= until),
  };
}
