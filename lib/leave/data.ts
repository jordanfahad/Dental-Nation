import { createClient } from '@supabase/supabase-js';

/**
 * Live data for the standalone /Leave-Calendar. Calls the SECURITY DEFINER
 * `public.leave_dashboard()` aggregate with the service-role key (the route is
 * already gated to CEO / super-admin), so the `leave` schema never needs to be
 * exposed to PostgREST. Returns null when Supabase isn't configured — the route
 * then renders empty states rather than breaking.
 */
export interface LeaveEmployee {
  name: string;
  designation: string | null;
  department: string | null;
  manager: string | null;
  is_ceo: boolean;
  role: string;
  annual_left: number;
  sick_left: number;
  join_date: string | null;
}
export interface ApprovalItem {
  name: string;
  designation: string | null;
  department: string | null;
  days: number;
  type_code: string;
  type_name: string;
  range: string;
}
export interface AwayItem {
  name: string;
  department: string | null;
  type_code: string;
  type_name: string;
  back: string;
}
export interface LeaveDashboard {
  today: string;
  today_short: string;
  year: number;
  headcount: number;
  on_leave_today: number;
  pending_count: number;
  liability_days: number;
  dept_count: number;
  whos_away: AwayItem[];
  approval_queue: ApprovalItem[];
  employees: LeaveEmployee[];
}

export async function getLeaveDashboard(): Promise<LeaveDashboard | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const sb = createClient(url, key, {
    db: { schema: 'public' },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb.rpc('leave_dashboard');
  if (error || !data) return null;
  return data as LeaveDashboard;
}
