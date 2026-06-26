import { LEAVE_HTML_B64 } from './content';

/**
 * Leave Calendar — hosted UI (Phase D design, approved reference) at
 * /Leave-Calendar. Served as raw HTML behind the existing auth gate (middleware)
 * for now. The functional build (super-admin–provisioned per-user login, real
 * leave/attendance/payroll data) replaces this content in the coming phases.
 */
export function GET() {
  const html = Buffer.from(LEAVE_HTML_B64, 'base64').toString('utf8');
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-robots-tag': 'noindex',
    },
  });
}
