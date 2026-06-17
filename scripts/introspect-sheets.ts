/**
 * Phase 0 — sheet introspection (§6). For every spreadsheet in config/sheet-
 * mapping.ts, this lists every tab + gid, prints the header row and 3 sample
 * rows, reports row counts, and flags empty / inaccessible / non-native sheets.
 *
 * Output: sheet-introspection.md at the repo root. Run AFTER the 12 sheets are
 * shared with GOOGLE_SERVICE_ACCOUNT_EMAIL as Viewer:
 *
 *   pnpm introspect
 *
 * It loads .env.local itself (no dotenv dependency).
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { google } from 'googleapis';
import { allSources } from '../config/sheet-mapping';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let [, key, val] = m;
    val = val.replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

function sheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
  if (!email || !key) {
    throw new Error('Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local first.');
  }
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

function mdTable(rows: string[][]): string {
  if (rows.length === 0) return '_(no rows)_';
  return rows.map((r) => '| ' + r.map((c) => String(c ?? '').replace(/\|/g, '\\|')).join(' | ') + ' |').join('\n');
}

async function main() {
  loadEnvLocal();
  const sheets = sheetsClient();
  const out: string[] = [
    '# Sheet introspection report',
    '',
    `_Generated ${new Date().toISOString()} · ${allSources.length} sources_`,
    '',
    '> Fill the confirmed tab names + column headers back into `config/sheet-mapping.ts`.',
    '',
  ];

  for (const src of allSources) {
    out.push(`## ${src.label}`, '', `- spreadsheetId: \`${src.spreadsheetId}\``, `- target: \`${src.target}\``);
    try {
      const meta = await sheets.spreadsheets.get({
        spreadsheetId: src.spreadsheetId,
        fields: 'sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))',
      });
      const tabs = meta.data.sheets ?? [];
      out.push(`- tabs: ${tabs.length}`, '');
      for (const tab of tabs) {
        const title = tab.properties?.title ?? '(untitled)';
        const gid = tab.properties?.sheetId;
        out.push(`### Tab: \`${title}\` (gid ${gid})`, '');
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: src.spreadsheetId,
          range: title,
          valueRenderOption: 'UNFORMATTED_VALUE',
          dateTimeRenderOption: 'FORMATTED_STRING',
        });
        const values = (res.data.values ?? []) as string[][];
        if (values.length === 0) {
          out.push('_empty tab_', '');
          continue;
        }
        out.push(`Rows (incl. header): **${values.length}**`, '');
        out.push('**Header row:**', '', mdTable([values[0] ?? []]), '');
        out.push('**Sample rows (up to 3):**', '', mdTable(values.slice(1, 4)), '');
      }
    } catch (err) {
      out.push(
        '',
        `> ⚠️ **Inaccessible** — ${(err as Error).message}`,
        '> Likely causes: not shared with the service account as Viewer, or an uploaded .xlsx not converted to a native Google Sheet.',
        '',
      );
    }
    out.push('', '---', '');
  }

  const target = resolve(process.cwd(), 'sheet-introspection.md');
  writeFileSync(target, out.join('\n'));
  console.log(`Wrote ${target}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
