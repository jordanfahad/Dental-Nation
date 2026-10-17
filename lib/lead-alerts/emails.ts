import { GMB_CLINICS } from '@/config/gmb-clinics';
import { sheetMapping } from '@/config/sheet-mapping';
import { canonicalBranch } from '@/lib/lead-tracker/branch';
import { leadGroup, type LeadChannelFields } from '@/lib/lead-tracker/reporting';
import { GROUPS } from '@/lib/performance/core';

export interface AlertLead extends LeadChannelFields { id: string; clinic: string | null }
export const LEAD_TRACKER_LINK = `https://docs.google.com/spreadsheets/d/${sheetMapping.leadTracker.spreadsheetId}/edit`;
export const LEAD_ALERT_FOOTER = 'Counts reflect new WhatsApp leads first observed after sync. Alerts can lag the desk entry by the sync interval (about 15 minutes), plus any delay in the desk logging it. Batched alerts can wait longer. Real instant alerts need a separate Zavis webhook or API integration.';

/** Only fixed branch/group labels and counts reach the renderer. */
export function buildWhatsAppLeadAlert(leads: AlertLead[]) {
  const branches = [...GMB_CLINICS, { key: 'unassigned', label: 'Unassigned' }];
  const byBranch = new Map(branches.map((b) => [b.key, 0]));
  const byGroup = new Map(GROUPS.map((g) => [g, 0]));
  for (const lead of leads) {
    const branch = canonicalBranch(lead.clinic || lead.raw_row?.['Clinic / Branch'], lead.raw_row?.['_source_tab']);
    byBranch.set(branch, (byBranch.get(branch) ?? 0) + 1);
    const group = leadGroup(lead);
    byGroup.set(group, (byGroup.get(group) ?? 0) + 1);
  }
  const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rows = [...branches.map((b) => [b.label, byBranch.get(b.key)] as const), ...GROUPS.map((g) => [g, byGroup.get(g)] as const)];
  return { subject: `WhatsApp lead update - ${leads.length} new leads`,
    html: `<div style="font-family:Arial,sans-serif;color:#244260;max-width:640px"><h2>WhatsApp lead update</h2><p>${leads.length} new WhatsApp leads since the last email (or initial baseline).</p><table><thead><tr><th>Branch / channel group</th><th>New leads</th></tr></thead><tbody>${rows.map(([label, count]) => `<tr><td>${esc(label)}</td><td>${count}</td></tr>`).join('')}</tbody></table><p><a href="${LEAD_TRACKER_LINK}">Open In-House Lead Tracker</a></p><p style="font-size:12px">${LEAD_ALERT_FOOTER}</p></div>` };
}
