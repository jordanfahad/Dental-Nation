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

// ---- board (Apply / Approvals / Calendar) ----
export interface LeaveType {
  code: string; name: string; paid: boolean; requires_cert: boolean; default_days: number | null;
}
export interface Balance {
  code: string; name: string; entitled: number; taken: number; pending: number; remaining: number;
}
export interface LadderRung { step: number; name: string | null; action: string; }
export interface Approval {
  request_id: string; name: string; designation: string | null; department: string | null;
  type_code: string; type_name: string; days: number; reason: string | null;
  start: string; end: string; direct_report: boolean; ladder: LadderRung[];
}
export interface CalendarEvent { name: string; type_code: string; start: string; end: string; status: string; }
export interface TeamMember { id: string; name: string; }
export interface AttendanceRow { name: string; designation: string | null; worked: number; required: number; days: number; }
export interface Attendance {
  week_label: string; logged_today: number; team_size: number; hours_week: number; rows: AttendanceRow[];
}
export interface PayrollRow {
  name: string; working_days: number; present: number; paid_leave: number; unpaid: number; worked_hours: number;
}
export interface LeaveBoard {
  viewer: { name: string; email: string; role: string; is_super: boolean; can_payroll: boolean };
  year: number; month: number;
  leave_types: LeaveType[];
  my_balances: Balance[];
  approvals: Approval[];
  calendar: CalendarEvent[];
  holidays: { name: string; date: string }[];
  team: TeamMember[];
  attendance: Attendance;
  payroll_period: string;
  payroll: PayrollRow[];
}

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    db: { schema: 'public' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getLeaveDashboard(email: string): Promise<LeaveDashboard | null> {
  const sb = client();
  if (!sb) return null;
  const { data, error } = await sb.rpc('leave_dashboard', { p_email: email });
  if (error || !data) return null;
  return data as LeaveDashboard;
}

export async function getLeaveBoard(email: string): Promise<LeaveBoard | null> {
  const sb = client();
  if (!sb) return null;
  const { data, error } = await sb.rpc('leave_board', { p_email: email });
  if (error || !data) return null;
  return data as LeaveBoard;
}
