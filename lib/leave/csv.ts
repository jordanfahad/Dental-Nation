/** Minimal attendance-CSV parser. Expected columns: email, date (YYYY-MM-DD),
 *  hours. A header row containing "email" is skipped. Bad rows are dropped. */
export interface AttendanceCsvRow { email: string; date: string; hours: number; }

export function parseAttendanceCsv(text: string): AttendanceCsvRow[] {
  const rows: AttendanceCsvRow[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (i === 0 && /email/i.test(cols[0])) continue; // header
    if (cols.length < 3) continue;
    const [email, date, hoursRaw] = cols;
    const hours = Number(hoursRaw);
    if (!email || !date || !Number.isFinite(hours)) continue;
    rows.push({ email: email.toLowerCase(), date, hours });
  }
  return rows;
}
