import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Per-doctor performance for the board report: appointments (from the live
 * Practo appointment feed) + finalized revenue (from the Practo bill line-item
 * charges, by conducting doctor), over a window. Test rows excluded.
 */
export interface DoctorPerf {
  doctor: string;
  department: string | null;
  appointments: number;
  revenue: number;
}

const inRange = (day: string | null, from?: string, to?: string) =>
  !!day && (!from || day >= from) && (!to || day <= to);
const toDay = (v: unknown): string | null => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
};

export async function getDoctorPerformance(opts: { from?: string; to?: string; limit?: number } = {}): Promise<DoctorPerf[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { from, to, limit = 8 } = opts;
  try {
    const [apptRes, billRes] = await Promise.all([
      db
        .from('practo_appointments_raw')
        .select('doctor, department, patient_name, appt_date')
        .gte('appt_date', from ?? '2000-01-01')
        .lte('appt_date', to ?? '2999-01-01'),
      db.from('practo_bills_raw').select('bill_date, data'),
    ]);

    const rows = new Map<string, DoctorPerf>();
    const keyOf = (d: string) => d.trim();
    for (const a of (apptRes.data as { doctor: string | null; department: string | null; patient_name: string | null }[] | null) ?? []) {
      if (/zavis|test|sagar/i.test(String(a.patient_name ?? ''))) continue;
      const doc = String(a.doctor ?? '').trim();
      if (!doc) continue;
      const r = rows.get(keyOf(doc)) ?? { doctor: doc, department: null, appointments: 0, revenue: 0 };
      r.appointments++;
      if (!r.department && a.department) r.department = String(a.department).trim() || null;
      rows.set(keyOf(doc), r);
    }
    // Revenue by conducting doctor from bill charges in the window.
    for (const b of (billRes.data as { bill_date: string | null; data: Record<string, unknown> }[] | null) ?? []) {
      const bDay = b.bill_date ?? toDay((b.data as { finalized_date?: unknown })?.finalized_date);
      if (!inRange(bDay, from, to)) continue;
      const charges = Array.isArray((b.data as { charges?: unknown }).charges) ? ((b.data as { charges: Record<string, unknown>[] }).charges) : [];
      for (const c of charges) {
        const amt = Number(c.amount) || 0;
        if (amt <= 0) continue;
        const doc = String(c.conducting_doctor ?? '').trim();
        if (!doc) continue;
        const r = rows.get(keyOf(doc)) ?? { doctor: doc, department: null, appointments: 0, revenue: 0 };
        r.revenue += amt;
        rows.set(keyOf(doc), r);
      }
    }

    return [...rows.values()]
      .filter((r) => r.appointments > 0 || r.revenue > 0)
      .map((r) => ({ ...r, revenue: Math.round(r.revenue) }))
      .sort((a, b) => b.revenue - a.revenue || b.appointments - a.appointments)
      .slice(0, limit);
  } catch {
    return [];
  }
}
