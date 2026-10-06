import { PRODUCT_RULES } from '../../config/demand-themes';
import type { ThemeReport } from './demandToDesk';

export interface ThemeLearning {
  theme: ThemeReport;
  learned: string;
  action: 'Scale' | 'Keep' | 'Fix the desk step' | 'Fix the creative' | 'Pause';
  owner: 'Marketing' | 'Front desk' | 'Dr Luvi' | 'Fahad';
  due: string;
}
const number = (n: number) => Math.round(n).toLocaleString('en-US');
const due = (end: string, days: number) => new Date(Date.parse(`${end}T00:00:00Z`) + days * 86400_000).toISOString().slice(0, 10);
export const competitionLabel = (n: number | null) => n == null ? 'Unknown' : n >= PRODUCT_RULES.highCompetition ? 'High' : n >= 34 ? 'Medium' : 'Low';

/** Suggestions only. Every reason refers to the displayed row's measured counts. */
export function themeLearning(theme: ThemeReport, end: string): ThemeLearning {
  const { desk: d, meta: m, product: p } = theme;
  const result = (learned: string, action: ThemeLearning['action'], owner: ThemeLearning['owner'], days: number): ThemeLearning => ({ theme, learned, action, owner, due: due(end, days) });
  if (d.logged && d.reached != null && d.reached / d.logged < .5) return result(`Only ${d.reached} of ${d.logged} leads were reached; the first conversation needs attention.`, 'Fix the desk step', 'Front desk', 1);
  if (d.interested && d.booked === 0) return result(`${d.interested} interested leads produced 0 bookings; the booking conversation needs review.`, 'Fix the desk step', 'Dr Luvi', 2);
  if (m.spend && m.chats === 0) return result(`AED ${number(m.spend)} in Meta spend produced 0 chats.`, 'Fix the creative', 'Marketing', 3);
  if (p.searches != null && p.searches < PRODUCT_RULES.lowDemand && m.spend && d.booked === 0) return result(`${number(p.searches)} monthly searches and AED ${number(m.spend)} in Meta spend accompany 0 desk bookings.`, 'Pause', 'Fahad', 2);
  if (p.searches != null && p.searches >= PRODUCT_RULES.highDemand && d.interested != null && d.interested >= PRODUCT_RULES.minimumInterested && d.booked && p.competition != null && p.competition < PRODUCT_RULES.highCompetition) return result(`${number(p.searches)} monthly searches accompany ${d.interested} interested leads and ${d.booked} desk bookings.`, 'Scale', 'Marketing', 7);
  if (d.booked && m.spend != null) return result(`${d.booked} desk bookings accompany AED ${number(m.spend)} in Meta spend.`, 'Keep', 'Marketing', 7);
  if (p.searches != null) return result(`${number(p.searches)} monthly searches are recorded across ${theme.keywords.length} checked keywords.`, 'Keep', 'Marketing', 7);
  return result(`AED ${number(m.spend ?? 0)} in Meta spend is recorded; keyword demand is unavailable.`, 'Keep', 'Marketing', 7);
}

export function demandLearnings(themes: ThemeReport[], end: string) {
  const rows = themes.filter((r) => (r.product.searches ?? 0) > 0 || (r.meta.spend ?? 0) > 0).map((r) => themeLearning(r, end));
  const unfunded = rows.filter((r) => r.theme.meta.spend === 0 && (r.theme.product.searches ?? 0) > 0).sort((a, b) => b.theme.product.searches! - a.theme.product.searches!)[0];
  const leak = rows.filter((r) => (r.theme.desk.logged ?? 0) > 0 && r.theme.desk.reached != null)
    .sort((a, b) => (b.theme.desk.logged! - b.theme.desk.reached!) - (a.theme.desk.logged! - a.theme.desk.reached!))[0];
  const best = rows.filter((r) => (r.theme.desk.booked ?? 0) > 0 && (r.theme.meta.spend ?? 0) > 0)
    .sort((a, b) => a.theme.meta.spend! / a.theme.desk.booked! - b.theme.meta.spend! / b.theme.desk.booked!)[0];
  const choices = [
    unfunded ? `${unfunded.theme.label}: consider funding ${number(unfunded.theme.product.searches!)} monthly searches with AED 0 Meta spend.` : 'No theme with measured demand and AED 0 Meta spend was found.',
    leak && leak.theme.desk.logged! > leak.theme.desk.reached! ? `${leak.theme.label}: review the first conversation; ${leak.theme.desk.logged! - leak.theme.desk.reached!} of ${leak.theme.desk.logged} leads were not reached.` : 'No measurable gap between logged and reached leads was found.',
    best ? `${best.theme.label}: retain the lowest spend per desk booking, AED ${number(best.theme.meta.spend! / best.theme.desk.booked!)} (${number(best.theme.meta.spend!)} spend / ${best.theme.desk.booked} booked).` : 'No theme has both positive Meta spend and desk bookings to compare.',
  ];
  return { rows, choices };
}
