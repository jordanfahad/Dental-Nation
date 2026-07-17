import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/role';
import { getSheetsClient, isGoogleConfigured } from '@/lib/sync/google-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Google Sheet discovery probe (admin-only, read-only). Reports the service
 * account email to share the sheet with, and — once the sheet is shared with it
 * as Viewer — returns the tab list plus the header row + a few sample rows for a
 * chosen tab, so a new source can be mapped precisely.
 *
 *   GET /api/sheets/probe?id=<spreadsheetId>&gid=<gid>
 *   GET /api/sheets/probe?id=<spreadsheetId>&tab=<Tab%20Name>
 * Auth: signed-in admin OR ?secret=<CRON_SECRET>.
 */
function hasSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get('secret') === secret;
}

export async function GET(req: NextRequest) {
  if (!hasSecret(req) && !(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? null;
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: 'Google service account not configured', serviceAccountEmail }, { status: 503 });
  }

  const sp = req.nextUrl.searchParams;
  const spreadsheetId = sp.get('id')?.trim();
  if (!spreadsheetId) {
    return NextResponse.json({ error: 'Pass ?id=<spreadsheetId>', serviceAccountEmail }, { status: 400 });
  }
  const gid = sp.get('gid') ? Number(sp.get('gid')) : null;
  const wantTab = sp.get('tab')?.trim() || null;

  const sheets = getSheetsClient();

  // 1) Spreadsheet metadata (tab names + gids). This is also the access check:
  //    a PERMISSION_DENIED here means the sheet isn't shared with the SA yet.
  let title: string | null = null;
  let tabs: { title: string; gid: number | null; rows: number | null; cols: number | null }[] = [];
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties(title),sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))',
    });
    title = meta.data.properties?.title ?? null;
    tabs = (meta.data.sheets ?? []).map((s) => ({
      title: s.properties?.title ?? '',
      gid: s.properties?.sheetId ?? null,
      rows: s.properties?.gridProperties?.rowCount ?? null,
      cols: s.properties?.gridProperties?.columnCount ?? null,
    }));
  } catch (e) {
    return NextResponse.json(
      {
        error: `Cannot read the sheet — share it with the service account as Viewer, then retry. (${(e as Error).message})`,
        serviceAccountEmail,
        spreadsheetId,
      },
      { status: 403 },
    );
  }

  // 2) Resolve the target tab (by name, else by gid, else first tab) and read a
  //    small window so we can see the header row + a few sample rows.
  const target =
    (wantTab && tabs.find((t) => t.title === wantTab)) ||
    (gid != null && tabs.find((t) => t.gid === gid)) ||
    tabs[0] ||
    null;

  let sample: { tab: string | null; firstRows: string[][] } = { tab: target?.title ?? null, firstRows: [] };
  if (target?.title) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${target.title}!A1:Z8`,
        majorDimension: 'ROWS',
      });
      sample = {
        tab: target.title,
        firstRows: (res.data.values ?? []).map((row) => row.map((c) => String(c ?? ''))),
      };
    } catch (e) {
      sample = { tab: target.title, firstRows: [[`read error: ${(e as Error).message}`]] };
    }
  }

  return NextResponse.json({
    serviceAccountEmail,
    spreadsheetId,
    title,
    tabs,
    sample,
    hint: 'Share the sheet with serviceAccountEmail as Viewer if tabs is empty or you got a 403. Then paste this JSON back.',
  });
}
