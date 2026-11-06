import { PreviewShell } from '@/components/next/PreviewShell';
import { CalendarView } from '@/components/next/calendar/CalendarView';

/**
 * The content calendar at /next/calendar (Mr Akbar, 6 Nov 2026: everything
 * linked and opened from reports.dentalnation.com). Data is
 * config/content-calendar.ts, edited by hand as production moves; the
 * password gate (middleware.ts) covers it like every other route.
 */
export default function NextCalendarPage() {
  return (
    <PreviewShell active="Content Calendar">
      <CalendarView />
    </PreviewShell>
  );
}
