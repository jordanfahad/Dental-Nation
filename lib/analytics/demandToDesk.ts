import { CURRENT_STATUS_FIELDS, DEMAND_THEMES, DN_CAMPAIGN_TAB, FOLLOW_UP_FIELDS, META_LAUNCH_DATE, OUTCOME_RULES, PRODUCT_RULES, type DemandTheme } from '../../config/demand-themes';
import { KPI_MOTIONS } from '../../config/kpi-benchmarks';
import { metaPeople, type MetaActions } from '../meta/people';

export type Row = Record<string, unknown>;
export type Count = number | null;
export interface DemandRange { from: string; to: string }
export const record = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
export const numeric = (value: unknown): Count => {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const filled = (value: unknown) => !!text(value) && !/^(?:n\/?a|none|null|[-—–]+)$/i.test(text(value));
export const ratio = (numerator: Count, denominator: Count): Count => numerator != null && denominator != null && Number.isFinite(numerator) && Number.isFinite(denominator) && numerator >= 0 && denominator > 0 ? numerator / denominator : null;
const sum = (values: Count[]): Count => values.some((n) => n == null) ? null : numeric(values.reduce<number>((n, v) => n + v!, 0));
const mean = (values: Count[]): Count => values.length ? ratio(sum(values), values.length) : null;
const normalized = (value: unknown) => text(value).toLowerCase().normalize('NFKC').replace(/[\u064b-\u065f\u0670]/g, '').replace(/[أإآ]/g, 'ا');

export function classifyTheme(...values: unknown[]): string {
  const value = values.map(normalized).join(' ');
  return DEMAND_THEMES.find((theme) => theme.pattern.test(value))?.key ?? 'other';
}

export function isoDate(value: unknown): string | null {
  const raw = text(value);
  let iso = /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(raw) ? raw.slice(0, 10) : '';
  const match = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (match) iso = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  if (!iso) return null;
  const at = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(at.getTime()) && at.toISOString().slice(0, 10) === iso ? iso : null;
}
export function lastFullMonth(now = new Date()): DemandRange {
  const dubai = new Date(now.getTime() + 4 * 3600_000);
  const end = new Date(Date.UTC(dubai.getUTCFullYear(), dubai.getUTCMonth(), 0));
  return { from: `${end.toISOString().slice(0, 7)}-01`, to: end.toISOString().slice(0, 10) };
}
export function demandRange(input?: Partial<DemandRange>, now = new Date()): DemandRange {
  const from = isoDate(input?.from), to = isoDate(input?.to);
  return from && to && from <= to ? { from, to } : lastFullMonth(now);
}
const inWindow = (date: string | null, range: DemandRange) => !!date && date >= range.from && date <= range.to;
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400_000).toISOString().slice(0, 10);
export function weekOf(date: string): string {
  const at = new Date(`${date}T00:00:00Z`);
  return addDays(date, -((at.getUTCDay() + 6) % 7));
}

export interface Stage { key: string; label: string; count: Count; population: string }
export interface Step { from: string; to: string; rate: Count; comparable: boolean }
export interface Leak extends Step { drop: number }
export function stageSteps(stages: Stage[]): Step[] {
  return stages.slice(1).map((stage, i) => ({
    from: stages[i].label, to: stage.label, rate: ratio(stage.count, stages[i].count),
    comparable: stage.population === stages[i].population,
  }));
}
/** Unlinked populations still get comparison ratios, but cannot prove a leak. */
export function largestLeak(stages: Stage[]): Leak | null {
  let worst: Leak | null = null;
  for (const step of stageSteps(stages)) {
    if (!step.comparable || step.rate == null || step.rate < 0 || step.rate >= 1) continue;
    const drop = 1 - step.rate;
    if (!worst || drop > worst.drop) worst = { ...step, drop };
  }
  return worst;
}

export interface TrackerFact {
  theme: string; date: string; meta: boolean; scoped: boolean; reached: boolean;
  interested: boolean; booked: boolean; converted: boolean; noAnswer: boolean;
  followUps: boolean[]; nextAction: boolean; callAttempt: boolean; callRef: string | null;
  barriers: string[];
}
export function trackerFact(row: Row): TrackerFact | null {
  const data = record(row.data);
  const date = isoDate(data.Date);
  const service = text(data['Service / Inquiry Type']);
  const platform = `${text(data['Inquiry Platform'])} ${text(data['Source Type'])}`;
  const evidence = [service, data['Notes / Remarks'], data['Conversion - Dr Luvi'], data.Conversion, data['Lead Stage'], ...CURRENT_STATUS_FIELDS.map((field) => data[field])].map(text).join(' ');
  if (!date || !filled(platform) || OUTCOME_RULES.excluded.test(evidence) || OUTCOME_RULES.existing.test(evidence)) return null;
  const tab = text(data._source_tab);
  // Existing mirrors lack the tab. They can be classified by channel, with a visible coverage gap.
  if (tab && tab !== DN_CAMPAIGN_TAB) return null;
  const current = CURRENT_STATUS_FIELDS.map((field) => text(data[field])).find(filled);
  const status = current ?? [data['Conversion - Dr Luvi'], data.Conversion, data['Lead Stage'], data['Notes / Remarks']].filter(filled).map(text).join(' ');
  const negative = OUTCOME_RULES.negative.test(status);
  const noAnswer = OUTCOME_RULES.noAnswer.test(status);
  const converted = !negative && !noAnswer && !OUTCOME_RULES.notConverted.test(status) && OUTCOME_RULES.converted.test(status);
  const booked = converted || (!negative && !noAnswer && !OUTCOME_RULES.notBooked.test(status) && OUTCOME_RULES.booked.test(status));
  const interested = booked || (!negative && !noAnswer && OUTCOME_RULES.interested.test(status));
  const theme = classifyTheme(service) === 'other' ? classifyTheme(service, data['Campaign / Offer Name'], evidence) : classifyTheme(service);
  const barriers = Object.entries(OUTCOME_RULES.barriers).filter(([, pattern]) => pattern.test(status)).map(([key]) => key);
  return {
    theme, date, scoped: !!tab, meta: /facebook|instagram|\bmeta\b|lead\s*form/i.test(platform),
    reached: interested || (!noAnswer && (OUTCOME_RULES.reached.test(status) || barriers.some((key) => key !== 'international'))), interested, booked, converted, noAnswer,
    followUps: FOLLOW_UP_FIELDS.map((field) => filled(data[field])),
    nextAction: filled(data['Next Action']) || filled(data['Next Follow-up Date']) || filled(data['Follow-up Date']) || OUTCOME_RULES.nextAction.test(status),
    callAttempt: OUTCOME_RULES.call.test(status),
    callRef: text(data.lead_ref) || text(data['Lead ID']) || null,
    barriers,
  };
}

export interface MetaTotals { rows: number; spend: Count; impressions: Count; reach: Count; chats: Count; net: Count; costChat: Count; costNet: Count; frequency: Count; cpm: Count; chatRate: Count }
function metaMetrics(rows: Row[] | null): MetaTotals {
  const values = rows?.map((row) => {
    const data = record(row.data);
    const raw = data.actions;
    const actions = Array.isArray(raw) && raw.every((a) => typeof a?.action_type === 'string' && numeric(a?.value) != null) ? raw as MetaActions : undefined;
    const chats = actions ? actions.filter((a) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d').reduce((n, a) => n + Number(a.value), 0) : null;
    return { spend: numeric(row.spend), impressions: numeric(row.impressions ?? data.impressions), reach: numeric(data.reach), chats, net: actions ? metaPeople(actions).net : null };
  });
  const field = (key: 'spend' | 'impressions' | 'reach' | 'chats' | 'net') => values ? sum(values.map((row) => row[key])) : null;
  const spend = field('spend'), impressions = field('impressions'), reach = field('reach'), chats = field('chats'), net = field('net');
  return { rows: rows?.length ?? 0, spend, impressions, reach, chats, net, costChat: ratio(spend, chats), costNet: ratio(spend, net), frequency: ratio(impressions, reach), cpm: impressions ? ratio(spend == null ? null : spend * 1000, impressions) : null, chatRate: ratio(chats, reach) };
}
const adTheme = (row: Row) => classifyTheme(row.ad_name, row.adset_name, row.campaign_name);
function dedupe(rows: Row[], field: string): Row[] {
  const found = new Map<string, Row>();
  rows.forEach((row, i) => {
    const key = text(row[field]) || `unkeyed:${i}`;
    const old = found.get(key);
    if (!old || text(row.fetched_at) >= text(old.fetched_at)) found.set(key, row);
  });
  return [...found.values()];
}

export interface MarketKeyword { keyword: string; language: 'en' | 'ar'; searches: Count; cpcUsd: Count; competition: Count }
export interface MarketSnapshot { version: 1 | 2; fetchedAt: string; location: 2784; keywords: MarketKeyword[]; errors: string[]; requestCount?: number; costUsd?: number }
export interface DemandInput {
  ads: Row[] | null; tracker: Row[] | null; canonical: Row[] | null; appointments: Row[] | null;
  calls: Row[] | null; gmb: Row[] | null; market: MarketSnapshot | null;
  ranked: { market: string; rows: { keyword: string; volume: Count }[]; fetchedAt: string } | null;
  creatives?: Row[] | null; creativeMetrics?: Row[] | null;
  gaps?: string[];
}
export interface Product { searches: Count; cpcUsd: Count; competition: Count; valueAed: Count; costInterested: Count; interestedRate: Count; bookingRate: Count; breakEven: Count; recommendation: 'Focus' | 'Test' | 'Hold'; reason: string }
export function recommendProduct(input: { searches: Count; competition: Count; costInterested: Count; breakEven: Count; value: Count; interested: Count }): Pick<Product, 'recommendation' | 'reason'> {
  const r = PRODUCT_RULES;
  if (input.searches == null) return { recommendation: 'Test', reason: 'Market evidence missing' };
  if (input.searches < r.lowDemand) return { recommendation: 'Hold', reason: `Below ${r.lowDemand} monthly searches in the selected keyword set` };
  if (input.competition != null && input.competition >= r.highCompetition && input.costInterested != null && input.breakEven != null && input.costInterested > input.breakEven) return { recommendation: 'Hold', reason: 'High competition and cost above modelled break-even' };
  if (input.breakEven == null) return { recommendation: 'Test', reason: 'Break-even unconfirmed: contribution margin / outcome evidence missing' };
  if (input.searches >= r.highDemand && input.value != null && input.value >= r.highValueAed && input.interested != null && input.interested >= r.minimumInterested && input.costInterested != null && input.costInterested < input.breakEven) return { recommendation: 'Focus', reason: 'Demand, evidence, value and modelled economics meet the stated rule' };
  return { recommendation: 'Test', reason: 'Demand present; evidence or economics below the Focus threshold' };
}

interface DeskTotals { logged: Count; reached: Count; interested: Count; booked: Count; converted: Count; noAnswer: Count; noFollow: Count; barriers: Record<string, number> }
function deskTotals(rows: TrackerFact[] | null): DeskTotals {
  const count = (test: (row: TrackerFact) => boolean) => rows ? rows.filter(test).length : null;
  return {
    logged: rows?.length ?? null, reached: count((r) => r.reached), interested: count((r) => r.interested), booked: count((r) => r.booked), converted: count((r) => r.converted), noAnswer: count((r) => r.noAnswer), noFollow: count((r) => !r.followUps.some(Boolean)),
    barriers: Object.fromEntries(Object.keys(OUTCOME_RULES.barriers).map((key) => [key, rows?.filter((r) => r.barriers.includes(key)).length ?? 0])),
  };
}
interface ClinicTotals { booked: Count; attended: Count; cancelled: Count; noShow: Count }
function clinicTotals(rows: Row[] | null, theme?: string): ClinicTotals {
  if (!rows) return { booked: null, attended: null, cancelled: null, noShow: null };
  const files = new Map<string, { attended: boolean; cancelled: boolean; noShow: boolean }>();
  for (const row of rows) {
    const data = record(row.data);
    const key = text(row.mr_no);
    if (!/^DN/i.test(key) || /block|test/i.test(text(row.status))) continue;
    const treatment = classifyTheme(data.complaint, data.department_name ?? row.department, data.package_name);
    if (theme && treatment !== theme) continue;
    const status = text(row.status ?? data.appointment_status).toLowerCase();
    const old = files.get(key) ?? { attended: false, cancelled: false, noShow: false };
    old.attended ||= /^(?:arrived|completed|attended)$/.test(status);
    old.cancelled ||= /cancel/.test(status);
    old.noShow ||= /no[ -]?show|did not attend/.test(status);
    files.set(key, old);
  }
  const values = [...files.values()];
  return { booked: files.size, attended: values.filter((r) => r.attended).length, cancelled: values.filter((r) => r.cancelled && !r.attended).length, noShow: values.filter((r) => r.noShow && !r.attended).length };
}

export interface CreativePreview {
  platform: string; adId: string; name: string; thumbnailUrl: string | null; body: string; title: string; cta: string;
  spend: Count; chats: Count; costChat: Count;
}
export interface ThemeReport {
  keywords: MarketKeyword[]; creatives: CreativePreview[];
  key: string; label: string; meta: MetaTotals; desk: DeskTotals; clinic: ClinicTotals;
  gbp: Count; gbpThreshold: boolean; rankedSearches: Count; marketShare: Count; spendShare: Count;
  stages: Stage[]; steps: Step[]; leak: Leak | null; product: Product;
}
export interface MetaWeek extends MetaTotals { week: string; end: string; theme: string; label: string; partial: boolean; signal: string }
export interface Cohort extends DeskTotals { week: string; end: string; partial: boolean; chats: Count; clinicAttended: Count }
export interface Discipline { week: string; logged: Count; first: Count; second: Count; third: Count; callLogged: Count; callLinkable: number; nextAction: Count; noFollow: Count }
export interface Launch { theme: string; label: string; campaign: string; adset: string; first: string; last: string; spend: Count; recency: string }
export interface DemandReport {
  range: DemandRange; themes: ThemeReport[]; weekly: MetaWeek[]; cohorts: Cohort[]; discipline: Discipline[]; launches: Launch[];
  findings: string[]; gaps: string[]; marketDate: string | null; rankedMarket: string | null; canonicalCount: Count;
  bookingBenchmark: { lo: number; hi: number; label: string } | null;
}

export function aggregateDemandToDesk(input: DemandInput, range: DemandRange): DemandReport {
  const gaps = [...(input.gaps ?? [])];
  const ads = input.ads ? dedupe(input.ads, 'key').filter((r) => isoDate(r.date)) : null;
  const creatives = input.creatives ?? [];
  const metaCopy = new Map(creatives.filter((r) => r.platform === 'meta').map((r) => [text(r.ad_id), r]));
  const classifyAd = (row: Row) => {
    const copy = metaCopy.get(text(row.ad_id));
    return copy ? classifyTheme(copy.ad_name, copy.body, copy.title) : adTheme(row);
  };
  const adThemes = new Map(ads?.map((row) => [row, classifyAd(row)]) ?? []);
  const themeOfAd = (row: Row) => adThemes.get(row) ?? 'other';
  const facts = input.tracker?.map(trackerFact).filter((r): r is TrackerFact => !!r && r.meta) ?? null;
  if (facts?.some((r) => !r.scoped)) gaps.push('Tracker tab provenance is missing for older rows; those rows are scoped to Meta by channel until the next sync.');
  const rawInvalid = input.tracker?.filter((r) => !isoDate(record(r.data).Date)).length ?? 0;
  if (rawInvalid) gaps.push(`${rawInvalid} tracker rows have no valid date and are excluded.`);
  if (!input.market) gaps.push('UAE keyword snapshot unavailable; market demand, CPC and competition remain unknown.');
  if (input.market?.errors.length) gaps.push(...input.market.errors.map((e) => `Market snapshot: ${e}`));
  if (input.market && Date.parse(`${range.to}T23:59:59Z`) - Date.parse(input.market.fetchedAt) > 7 * 86400_000) gaps.push('UAE keyword snapshot is older than seven days relative to the report end.');
  if (input.ranked) gaps.push(`Ranked keywords cover only dentalnation.com's stored ${input.ranked.market} keyword sample; they are not total market demand.`);
  if (facts?.length && facts.some((r) => !r.callRef)) gaps.push('Call-log references exist for widget leads, not every tracker row. Call coverage uses only explicitly linked tracker references; unlinked calls are unknown.');
  const windowAds = ads?.filter((r) => inWindow(isoDate(r.date), range)) ?? null;
  if (windowAds?.some((r) => numeric(record(r.data).reach) == null)) gaps.push('Some ad rows have no reach: frequency and chat/reach remain unknown until a sync supplies it.');
  const tracker = facts?.filter((r) => inWindow(r.date, range)) ?? null;
  const appts = input.appointments ? dedupe(input.appointments, 'appt_key').filter((r) => inWindow(isoDate(r.appt_date), range)) : null;
  const keywords = input.market?.keywords ?? [];
  const usableMarket = input.market != null && input.market.errors.length === 0;
  const byTheme = new Map(DEMAND_THEMES.map((theme) => [theme.key, keywords.filter((k) => classifyTheme(k.keyword) === theme.key)]));
  const totalSearches = usableMarket ? sum(keywords.map((k) => k.searches ?? 0)) : null;
  const totalSpend = metaMetrics(windowAds).spend;
  const canonicalCount = input.canonical?.filter((r) => inWindow(isoDate(r.inquiry_date), range) && /meta|facebook|instagram/i.test(text(r.channel_source))).length ?? null;
  const themes: ThemeReport[] = DEMAND_THEMES.map((theme: DemandTheme) => {
    const meta = metaMetrics(windowAds?.filter((r) => themeOfAd(r) === theme.key) ?? null);
    const desk = deskTotals(tracker?.filter((r) => r.theme === theme.key) ?? null);
    const clinic = clinicTotals(appts, theme.key);
    const marketRows = byTheme.get(theme.key)!;
    const searches = usableMarket && marketRows.length ? sum(marketRows.map((k) => k.searches ?? 0)) : null;
    const competition = mean(marketRows.map((k) => k.competition).filter((n) => n != null));
    const cpcUsd = mean(marketRows.map((k) => k.cpcUsd).filter((n) => n != null));
    const breakEven = theme.firstTreatmentValueAed != null && theme.contributionMargin != null && desk.converted != null && desk.interested
      ? theme.firstTreatmentValueAed * theme.contributionMargin * desk.converted / desk.interested : null;
    const costInterested = ratio(meta.spend, desk.interested);
    const product: Product = {
      searches, cpcUsd, competition, valueAed: theme.firstTreatmentValueAed, costInterested,
      interestedRate: ratio(desk.interested, meta.chats), bookingRate: ratio(desk.booked, desk.interested), breakEven,
      ...recommendProduct({ searches, competition, costInterested, breakEven, value: theme.firstTreatmentValueAed, interested: desk.interested }),
    };
    const terms = new Set(marketRows.map((k) => normalized(k.keyword)));
    const gbp = input.gmb?.filter((r) => text(r.month) >= range.from.slice(0, 7) && text(r.month) <= range.to.slice(0, 7) && (terms.has(normalized(r.keyword)) || classifyTheme(r.keyword) === theme.key)) ?? null;
    const ranked = input.ranked?.rows.filter((r) => classifyTheme(r.keyword) === theme.key);
    const stages: Stage[] = [
      { key: 'chats', label: 'Chats', count: meta.chats, population: 'meta-ad-day' },
      { key: 'net', label: 'Net conversations', count: meta.net, population: 'meta-ad-day' },
      { key: 'logged', label: 'Desk logged', count: desk.logged, population: 'tracker' },
      { key: 'reached', label: 'Reached', count: desk.reached, population: 'tracker' },
      { key: 'booked', label: 'Desk booked', count: desk.booked, population: 'tracker' },
      { key: 'clinicBooked', label: 'Clinic booked', count: clinic.booked, population: 'clinic-files' },
      { key: 'attended', label: 'Clinic attended', count: clinic.attended, population: 'clinic-files' },
    ];
    const previews: CreativePreview[] = creatives.filter((c) => classifyTheme(c.ad_name, c.body, c.title) === theme.key).map((c) => {
      const metrics = c.platform === 'meta'
        ? metaMetrics(windowAds?.filter((r) => text(r.ad_id) === text(c.ad_id)) ?? null)
        : null;
      const daily = input.creativeMetrics?.filter((r) => r.platform === c.platform && r.ad_id === c.ad_id && inWindow(isoDate(r.day), range));
      const spend = metrics ? metrics.spend : daily ? sum(daily.map((r) => numeric(r.spend))) : null;
      return { platform: text(c.platform), adId: text(c.ad_id), name: text(c.ad_name), thumbnailUrl: /^https:\/\//i.test(text(c.thumbnail_url)) ? text(c.thumbnail_url) : null,
        body: text(c.body).slice(0, 120), title: text(c.title), cta: text(c.cta), spend, chats: metrics?.chats ?? null, costChat: metrics?.costChat ?? null };
    }).sort((a, b) => (b.chats ?? -1) - (a.chats ?? -1) || a.adId.localeCompare(b.adId));
    return { key: theme.key, label: theme.label, keywords: marketRows, creatives: previews, meta, desk, clinic, product, stages, steps: stageSteps(stages), leak: largestLeak(stages), marketShare: ratio(searches, totalSearches), spendShare: ratio(meta.spend, totalSpend), gbp: gbp ? sum(gbp.map((r) => numeric(r.impressions))) : null, gbpThreshold: gbp?.some((r) => r.is_threshold === true) ?? false, rankedSearches: ranked?.length ? sum(ranked.map((r) => r.volume)) : null };
  });

  const weeks: string[] = [];
  // A bounded report window avoids accidental multi-year tables; coverage is explicit.
  const cohortEnd = range.to;
  for (let week = weekOf(META_LAUNCH_DATE); week <= cohortEnd && weeks.length < 260; week = addDays(week, 7)) weeks.push(week);
  if (weeks.length === 260 && addDays(weeks[259], 7) <= cohortEnd) gaps.push('Weekly history is capped at 260 weeks; later cohorts are not shown.');
  const bounds = (week: string) => ({ from: week < META_LAUNCH_DATE ? META_LAUNCH_DATE : week, to: addDays(week, 6) > cohortEnd ? cohortEnd : addDays(week, 6) });
  const weekly: MetaWeek[] = [];
  const cohorts: Cohort[] = [];
  const discipline: Discipline[] = [];
  for (const week of weeks) {
    const window = bounds(week);
    const partial = window.from !== week || window.to !== addDays(week, 6);
    const weekAds = ads?.filter((r) => inWindow(isoDate(r.date), window)) ?? null;
    const weekFacts = facts?.filter((r) => inWindow(r.date, window)) ?? null;
    const desk = deskTotals(weekFacts);
    const weekAppts = input.appointments?.filter((r) => inWindow(isoDate(r.appt_date), window)) ?? null;
    cohorts.push({ ...desk, week: window.from, end: window.to, partial, chats: metaMetrics(weekAds).chats, clinicAttended: clinicTotals(weekAppts).attended });
    const refs = weekFacts?.filter((r) => r.callRef) ?? [];
    const callDay = (row: Row) => {
      const timestamp = Date.parse(text(row.created_at));
      return Number.isFinite(timestamp) ? new Date(timestamp + 4 * 3600_000).toISOString().slice(0, 10) : '';
    };
    const calls = new Set(input.calls?.filter((r) => callDay(r) >= window.from && callDay(r) <= range.to).map((r) => text(r.lead_ref)) ?? []);
    discipline.push({ week: window.from, logged: desk.logged, first: weekFacts?.filter((r) => r.followUps[0]).length ?? null, second: weekFacts?.filter((r) => r.followUps[1]).length ?? null, third: weekFacts?.filter((r) => r.followUps[2]).length ?? null, callLogged: input.calls && refs.length ? refs.filter((r) => calls.has(r.callRef!)).length : null, callLinkable: refs.length, nextAction: weekFacts?.filter((r) => r.nextAction).length ?? null, noFollow: desk.noFollow });
    if (window.to < range.from || window.from > range.to) continue;
    for (const theme of DEMAND_THEMES) {
      const selectedWindow = { from: window.from < range.from ? range.from : window.from, to: window.to };
      const selectedPartial = partial || selectedWindow.from !== week;
      const metrics = metaMetrics(weekAds?.filter((r) => themeOfAd(r) === theme.key && inWindow(isoDate(r.date), selectedWindow)) ?? null);
      const previous = weekly.filter((r) => r.theme === theme.key && !r.partial).at(-1);
      let signal = 'Insufficient complete weeks';
      if (!selectedPartial && previous && metrics.costChat != null && previous.costChat != null && metrics.spend != null && previous.spend != null && metrics.chats != null && previous.chats != null) {
        signal = metrics.spend > previous.spend && metrics.costChat <= previous.costChat ? 'Demand supported'
          : metrics.costChat > previous.costChat && metrics.chats <= previous.chats ? 'Possible saturation' : 'Mixed';
      }
      weekly.push({ ...metrics, week: selectedWindow.from, end: window.to, theme: theme.key, label: theme.label, partial: selectedPartial, signal });
    }
  }

  const launchMap = new Map<string, { rows: Row[]; theme: string; campaign: string; adset: string }>();
  const history = ads?.filter((r) => text(r.date) >= META_LAUNCH_DATE && text(r.date) <= range.to && ((numeric(r.spend) ?? 0) > 0 || (numeric(r.impressions) ?? 0) > 0)) ?? [];
  const lastActive = history.map((r) => text(r.date)).sort().at(-1);
  for (const row of history) {
    const theme = themeOfAd(row);
    const key = JSON.stringify([theme, row.account_id, row.campaign_id ?? row.campaign_name, record(row.data).adset_id ?? row.adset_name]);
    const group = launchMap.get(key) ?? { rows: [], theme, campaign: text(row.campaign_name) || 'Unnamed campaign', adset: text(row.adset_name) || 'Unnamed ad set' };
    group.rows.push(row); launchMap.set(key, group);
  }
  const launches: Launch[] = [...launchMap.values()].map((group) => {
    const dates = group.rows.map((r) => text(r.date)).sort();
    const last = dates.at(-1)!;
    return { theme: group.theme, label: DEMAND_THEMES.find((t) => t.key === group.theme)!.label, campaign: group.campaign, adset: group.adset, first: dates[0], last, spend: metaMetrics(group.rows).spend, recency: last < (lastActive ?? last) ? 'No activity in latest feed (pause inferred)' : 'Latest feed activity' };
  }).sort((a, b) => a.theme.localeCompare(b.theme) || a.first.localeCompare(b.first));
  if (lastActive && lastActive < range.to) gaps.push(`Meta activity ends ${lastActive}; an older last-active date cannot prove a campaign was paused.`);

  const worst = themes.filter((r) => r.leak).sort((a, b) => b.leak!.drop - a.leak!.drop)[0];
  const mismatch = themes.filter((r) => r.marketShare != null && r.spendShare != null).sort((a, b) => (b.marketShare! - b.spendShare!) - (a.marketShare! - a.spendShare!))[0];
  const totalDesk = deskTotals(tracker);
  const findings = [
    worst ? `${worst.label}: largest comparable drop is ${worst.leak!.from} → ${worst.leak!.to} (${Math.round(worst.leak!.drop * 100)}%).` : 'No comparable stage drop can be established from the available counts.',
    mismatch ? `${mismatch.label}: ${Math.round(mismatch.marketShare! * 100)}% of keyword-set searches vs ${Math.round(mismatch.spendShare! * 100)}% of Meta spend; directional allocation comparison.` : 'Market demand versus spend cannot be compared until both sources have coverage.',
    totalDesk.logged == null ? 'Desk follow-up coverage is unavailable.' : `${totalDesk.noFollow} of ${totalDesk.logged} Meta tracker enquiries have no follow-up cell recorded; current statuses are not historical outcomes.`,
  ];
  const benchmark = KPI_MOTIONS.find((r) => r.key === 'paid-social')?.kpis.find((r) => r.key === 'so.conv')?.benchmark;
  return { range, themes, weekly, cohorts, discipline, launches, findings, gaps: [...new Set(gaps)], marketDate: input.market?.fetchedAt ?? null, rankedMarket: input.ranked?.market ?? null, canonicalCount, bookingBenchmark: benchmark ? { lo: benchmark.lo, hi: benchmark.hi, label: benchmark.label } : null };
}

export const emptyDemandInput = (): DemandInput => ({ ads: null, tracker: null, canonical: null, appointments: null, calls: null, gmb: null, market: null, ranked: null, creatives: null, creativeMetrics: null });
