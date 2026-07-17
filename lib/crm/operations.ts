import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Zavis CRM operational breakdowns — conversations by inbox (channel), by agent,
 * and by label (campaign / PR / segment). Snapshot tables, refreshed on each
 * Zavis report upload. Read-only; empty tables → empty arrays (honest gap).
 */

export interface InboxRow {
  inbox: string;
  type: string | null;
  conversations: number;
  resolutionCount: number;
  firstResponse: string | null;
  resolution: string | null;
}
export interface AgentRow {
  agent: string;
  assigned: number;
  resolutionCount: number;
  firstResponse: string | null;
  resolution: string | null;
  waiting: string | null;
}
export interface LabelRow {
  label: string;
  conversations: number;
  resolutionCount: number;
  firstResponse: string | null;
  resolution: string | null;
  reply: string | null;
}
export interface CrmOperations {
  source: 'live' | 'empty';
  inbox: InboxRow[];
  agents: AgentRow[];
  labels: LabelRow[];
  totals: { conversations: number; inboxes: number; agents: number; labels: number };
}

const num = (v: unknown) => Number(v ?? 0) || 0;

export async function getCrmOperations(): Promise<CrmOperations> {
  const empty: CrmOperations = { source: 'empty', inbox: [], agents: [], labels: [], totals: { conversations: 0, inboxes: 0, agents: 0, labels: 0 } };
  const db = getSupabaseAdmin();
  if (!db) return empty;

  try {
    const [ib, ag, lb] = await Promise.all([
      db.from('crm_inbox_report').select('*'),
      db.from('crm_agent_report').select('*'),
      db.from('crm_label_report').select('*'),
    ]);

    const inbox: InboxRow[] = ((ib.data as Record<string, unknown>[] | null) ?? [])
      .map((r) => ({
        inbox: String(r.inbox_name ?? ''),
        type: (r.inbox_type as string) ?? null,
        conversations: num(r.conversations),
        resolutionCount: num(r.resolution_count),
        firstResponse: (r.avg_first_response_text as string) ?? null,
        resolution: (r.avg_resolution_text as string) ?? null,
      }))
      .sort((a, b) => b.conversations - a.conversations);

    const agents: AgentRow[] = ((ag.data as Record<string, unknown>[] | null) ?? [])
      .map((r) => ({
        agent: String(r.agent_name ?? ''),
        assigned: num(r.assigned_conversations),
        resolutionCount: num(r.resolution_count),
        firstResponse: (r.avg_first_response_text as string) ?? null,
        resolution: (r.avg_resolution_text as string) ?? null,
        waiting: (r.avg_waiting_text as string) ?? null,
      }))
      .sort((a, b) => b.assigned - a.assigned);

    const labels: LabelRow[] = ((lb.data as Record<string, unknown>[] | null) ?? [])
      .map((r) => ({
        label: String(r.label ?? ''),
        conversations: num(r.conversations),
        resolutionCount: num(r.resolution_count),
        firstResponse: (r.avg_first_response_text as string) ?? null,
        resolution: (r.avg_resolution_text as string) ?? null,
        reply: (r.avg_reply_text as string) ?? null,
      }))
      .sort((a, b) => b.conversations - a.conversations);

    if (inbox.length + agents.length + labels.length === 0) return empty;

    return {
      source: 'live',
      inbox,
      agents,
      labels,
      totals: {
        conversations: inbox.reduce((s, r) => s + r.conversations, 0),
        inboxes: inbox.filter((r) => r.conversations > 0).length,
        agents: agents.filter((r) => r.assigned > 0).length,
        labels: labels.filter((r) => r.conversations > 0).length,
      },
    };
  } catch {
    return empty;
  }
}
