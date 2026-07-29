import Link from 'next/link';
import { PaidSearchRows } from './PaidSearchRows';
import { PaidSocialRows } from './PaidSocialRows';
import { AiChatRows } from './AiChatRows';
import { FunnelGroupFilter, type GroupFunnel } from './FunnelGroupFilter';
import { GrowthClinicFilter } from './GrowthClinicFilter';
import { resolveGrowthClinic, type GrowthClinicKey } from '@/config/clinics';
import { getChannelPerformance, type ChannelPerf, type GrowthReport } from '@/lib/growth/channelPerformance';
import { getChannelTrace } from '@/lib/growth/channelTrace';
import { CHANNEL_GROUPS, CHANNEL_BY_KEY } from '@/config/growth-channels';
import { WATERFALL_RULES } from '@/lib/growth/attribution';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { HBarChart, TOKENS, type BarDatum } from '@/components/charts/Charts';

/**
 * Growth Platform — the CEO's channel-performance view: every acquisition
 * channel (paid → organic → referral → collaboration), each mapped down ONE
 * funnel — visibility → enquiry → booked (Practo) → showed up → treated →
 * revenue — with attribution confidence shown, never hidden.
 *
 * Reads like a McKinsey one-pager on purpose: answer first (KPI band), then
 * the group funnel, then the channel P&L table, then HOW attribution works
 * (the ordered waterfall, verbatim from the engine), then honest caveats.
 * Server component; pure CSS visuals so it prints into the board pack.
 */

const aed = (n: number): string => `AED ${Math.round(n).toLocaleString('en-US')}`;
const aedShort = (n: number): string => {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(1)}k`;
  return `AED ${Math.round(n)}`;
};
const int = (n: number): string => Math.round(n).toLocaleString('en-US');
const pct = (n: number | null): string => (n == null ? '—' : `${Math.round(n * 100)}%`);

const GROUP_ACCENT: Record<string, string> = {
  paid: '#B45309',
  organic: '#1F3A5F',
  referral: '#2E7D32',
  collab: '#7C3AED',
  retention: '#64748B',
};

function EvidenceBar({ tagged, inferred }: { tagged: number; inferred: number }) {
  const total = tagged + inferred;
  if (total === 0) return null;
  const t = (tagged / total) * 100;
  return (
    <span className="mt-1 flex h-1.5 w-full max-w-[72px] overflow-hidden rounded-full bg-na/20" title={`${tagged} hard-traced · ${inferred} inferred`}>
      <span className="h-full bg-good" style={{ width: `${t}%` }} />
      <span className="h-full bg-watch/70" style={{ width: `${100 - t}%` }} />
    </span>
  );
}

/* One channel row of the P&L table. */
function ChannelRow({ p, traceQs }: { p: ChannelPerf; traceQs: string }) {
  const muted = p.untracked || (p.booked === 0 && p.enquiries === 0 && p.revenue === 0);
  return (
    <tr className={`border-t border-line/70 ${muted ? 'opacity-60' : ''}`}>
      <td className="py-2.5 pl-3 pr-2 align-top">
        <Link
          href={`/?tab=group&gtab=growth&gchan=${p.key}${traceQs}`}
          className="block text-[12.5px] font-medium leading-tight text-ink underline-offset-2 hover:text-accent hover:underline"
          title="See the patients behind this number"
        >
          {p.label}
        </Link>
        <span className="mt-0.5 block max-w-[230px] text-[10.5px] leading-snug text-ink-faint">{p.detail}</span>
        {p.untracked ? (
          <span className="mt-1 inline-block rounded-full border border-dashed border-watch/50 px-2 py-0.5 text-[10px] font-medium text-watch">
            not tracked yet
          </span>
        ) : null}
      </td>
      <td className="px-2 py-2.5 text-right align-top">
        <span className={`text-[12.5px] tabular-nums ${p.impressions == null ? 'text-ink-faint' : 'font-medium text-ink'}`}>
          {p.impressions == null ? '—' : int(p.impressions)}
        </span>
        {p.reachNote ? (
          <span className="block max-w-[150px] text-[10px] leading-snug text-ink-faint">{p.reachNote}</span>
        ) : null}
      </td>
      <Num v={int(p.enquiries)} dim={p.enquiries === 0} />
      <td className="px-2 py-2.5 text-right align-top">
        <span className={`text-[12.5px] font-semibold tabular-nums ${p.booked === 0 ? 'text-ink-faint' : 'text-ink'}`}>{int(p.booked)}</span>
        <span className="block text-[10px] text-ink-faint">{p.bookedPatients > 0 ? `${int(p.bookedPatients)} patients` : ''}</span>
        {p.estExtraBookings ? (
          <span className="block text-[10px] font-medium text-watch">+{int(p.estExtraBookings)} est. from calls</span>
        ) : null}
        <span className="flex justify-end"><EvidenceBar tagged={p.taggedBooked} inferred={p.inferredBooked} /></span>
      </td>
      <Num v={int(p.showed)} dim={p.showed === 0} est={p.estShowed ? `+${int(p.estShowed)} est.` : undefined} />
      <Num v={int(p.treated)} dim={p.treated === 0} est={p.estTreated ? `+${int(p.estTreated)} est.` : undefined} />
      <td className="px-2 py-2.5 text-right align-top">
        <span className={`text-[12.5px] font-semibold tabular-nums ${p.revenue === 0 ? 'text-ink-faint' : 'text-ink'}`}>
          {p.revenue > 0 ? aedShort(p.revenue) : '—'}
        </span>
        {p.estRevenue ? <span className="block text-[10px] font-medium text-watch">+{aedShort(p.estRevenue)} est.</span> : null}
      </td>
      <td className="py-2.5 pl-2 pr-3 text-right align-top">
        {p.spend != null ? (
          <>
            <span className="text-[12px] font-medium tabular-nums text-ink">{aedShort(p.spend)}</span>
            <span className="block text-[10px] leading-snug text-ink-faint">
              {p.costPerEnquiry != null ? `enquiry ${aed(p.costPerEnquiry)}` : ''}
              {p.costPerBooked != null ? ` · booking ${aed(p.costPerBooked)}` : ''}
            </span>
            <span className="block text-[10px] leading-snug text-ink-faint">
              {p.costPerShowed != null ? `show ${aed(p.costPerShowed)}` : ''}
              {p.costPerPatient != null ? ` · treated ${aed(p.costPerPatient)}` : ''}
              {p.roas != null ? ` · ROAS ${p.roas.toFixed(1)}×` : ''}
            </span>
            {p.estCostPerPatient != null ? (
              <span className="block text-[10px] font-medium leading-snug text-watch">
                CPA {aed(p.estCostPerPatient)}
                {p.estRoas != null ? ` · ROAS ${p.estRoas.toFixed(1)}×` : ''} incl. est. call bookings
              </span>
            ) : null}
            {p.spendThrough ? <span className="block text-[10px] text-watch">spend synced to {p.spendThrough}</span> : null}
          </>
        ) : (
          <span className="text-[11px] text-ink-faint">—</span>
        )}
      </td>
    </tr>
  );
}

function Num({ v, dim = false, est }: { v: string | null; dim?: boolean; est?: string }) {
  return (
    <td className="px-2 py-2.5 text-right align-top">
      <span className={`text-[12.5px] tabular-nums ${v == null || dim ? 'text-ink-faint' : 'font-medium text-ink'}`}>{v ?? '—'}</span>
      {est ? <span className="block text-[10px] font-medium text-watch">{est}</span> : null}
    </td>
  );
}

function ConfidenceCard({ report }: { report: GrowthReport }) {
  const { tagged, inferred, defaulted } = report.confidence;
  const total = tagged + inferred + defaulted;
  const seg = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <Card>
      <SectionHeader
        eyebrow="How to read this"
        title="Attribution — how each patient is routed"
        tag="G2"
      />
      <div className="px-5 pb-5 pt-3">
        {total > 0 ? (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-na/15">
              <span className="h-full bg-good" style={{ width: `${seg(tagged)}%` }} title={`Hard-traced: ${tagged}`} />
              <span className="h-full bg-watch/80" style={{ width: `${seg(inferred)}%` }} title={`Inferred: ${inferred}`} />
              <span className="h-full bg-na/60" style={{ width: `${seg(defaulted)}%` }} title={`Defaulted: ${defaulted}`} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-good" />Hard evidence — {int(tagged)} ({pct(total ? tagged / total : null)})</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-watch/80" />Inferred by logic — {int(inferred)} ({pct(total ? inferred / total : null)})</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-na/60" />Default (Direct / Walk-in) — {int(defaulted)} ({pct(total ? defaulted / total : null)})</span>
            </div>
          </>
        ) : null}
        <ol className="mt-4 space-y-1.5">
          {WATERFALL_RULES.map((r, i) => (
            <li key={r.id} className="flex items-start gap-2.5 text-[12px] leading-snug text-ink-soft">
              <span className="mt-px inline-flex h-[18px] w-7 shrink-0 items-center justify-center rounded bg-accent/5 text-[10px] font-semibold text-accent">
                {i + 1}
              </span>
              <span>
                {r.text}{' '}
                <span className={`text-[10px] font-medium ${r.evidence === 'tagged' ? 'text-good' : 'text-watch'}`}>
                  {r.evidence === 'tagged' ? 'hard evidence' : 'inferred'}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <Takeaway>
          Rules run top to bottom; the first match wins. Hard traces (a campaign tag, a matching phone number)
          always beat inference; only a patient with no trace at all falls to Direct / Walk-in — the default we agreed.
          Tagging bookings better (e.g. writing “smile club” or “influencer” on the booking) moves patients up this ladder automatically.
        </Takeaway>
      </div>
    </Card>
  );
}

/**
 * Google Ads phone path. MEASURED numbers (taps, from the Ads API click-type
 * segmentation) are visually separated from benchmark ESTIMATES, because in
 * the UAE Google cannot count call conversions at all — estimates are the
 * honest maximum until a tracking number measures the clinic's own rates.
 */
function PhonePathCard({ pp }: { pp: NonNullable<GrowthReport['phonePath']> }) {
  const stat = (label: string, value: string, est = false) => (
    <div className={`rounded-card border px-4 py-3 ${est ? 'border-dashed border-watch/60 bg-watch/5' : 'border-line bg-card'}`}>
      <p className="text-[11px] uppercase tracking-wide text-ink-faint">
        {label}
        {est ? <span className="ml-1 font-semibold text-watch">est.</span> : null}
      </p>
      <p className="mt-0.5 text-[20px] font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
  return (
    <Card>
      <SectionHeader
        tag="G4"
        eyebrow="Google Ads — phone path · Markov-chain model"
        title="Call-button taps, and what the model says they're worth"
      />
      <div className="px-5 pb-5 pt-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stat('Call-button taps', int(pp.callTaps))}
          {stat('Direction taps', int(pp.directionTaps))}
          {stat('Patient calls', int(pp.estPatientCalls), true)}
          {stat('Bookings from calls', int(pp.estBookingsReconciled), true)}
        </div>

        {/* The discount chain, stated so nobody mistakes the estimate for a count. */}
        <p className="mt-3 rounded-card border border-dashed border-line px-3 py-2 text-[11.5px] leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">How the Markov-chain model works</span> — each measured tap walks a chain of transition probabilities: {int(pp.callTaps)} taps
          → net of dead/accidental taps ≈ {int(pp.estValidTaps)} real attempts
          → answered ≈ {int(pp.estAnswered)}
          → net of suppliers/job seekers/sales calls ≈ {int(pp.estPatientCalls)} patient enquiries
          → booked ≈ {int(pp.estBookings)}.{' '}
          {pp.estBookings > pp.untracedPool ? (
            <>Capped at <span className="font-medium text-ink">{int(pp.untracedPool)}</span> — the estimate may only claim
            Dental Nation Al Wasl patients who arrived with no channel trace (the ads ran only there), and that pool
            is {int(pp.untracedPool)} in this window.</>
          ) : (
            <>These {int(pp.estBookingsReconciled)} are claimed from the {int(pp.untracedPool)} untraced Dental Nation
            Al Wasl patients (Direct / Walk-in + unattributed; the ads ran only there) — never from patients already
            credited to another channel, and never from another clinic. The same pool feeds every view, so All-clinics
            and DN-only always show the same ≈ figures.</>
          )}
        </p>

        {pp.byCampaign.length > 0 ? (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-ink-faint">Call taps by campaign (measured)</p>
            <ul className="space-y-1">
              {pp.byCampaign.map((c) => (
                <li key={c.campaign} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="truncate text-ink-soft">{c.campaign}</span>
                  <span className="font-medium tabular-nums text-ink">{int(c.callTaps)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Takeaway>
          Taps are measured by Google per campaign per day; direction taps likely convert to walk-ins the same way.
          Dashed figures come from the <span className="font-medium">Markov-chain model</span> (benchmark transition probabilities from healthcare call-tracking studies) — Google cannot count real call
          conversions in the UAE (no forwarding numbers; both call conversion actions read zero all-time). A
          dedicated tracking number replaces these estimates with the clinic&apos;s own measured rates.
        </Takeaway>
      </div>
    </Card>
  );
}

/** Where "trace the leads" lives for each channel outside this view. */
const CROSS_LINKS: Record<string, { label: string; href: string }> = {
  'paid-search': { label: 'Open Google Ads Performance', href: '/?tab=marketing&mtab=google' },
  'paid-social': { label: 'Open Meta Ads Performance', href: '/?tab=marketing&mtab=meta' },
  affiliate: { label: 'Open Marketing (ArabyAds)', href: '/?tab=marketing' },
  website: { label: 'Open Website Bookings', href: '/?tab=bookings' },
  gmb: { label: 'Open Social & Local', href: '/?tab=social' },
  'social-organic': { label: 'Open Social & Local', href: '/?tab=social' },
  whatsapp: { label: 'Open CRM — Zavis', href: '/?tab=crm' },
  'ai-concierge': { label: 'Open CRM — Zavis', href: '/?tab=crm' },
  retention: { label: 'Open Practo Insta', href: '/?tab=practo' },
};

/** Drill-down: the actual patients behind one channel's numbers. */
async function ChannelTraceView({ channelKey, range, clinic }: { channelKey: string; range?: { from?: string; to?: string }; clinic: GrowthClinicKey }) {
  const def = CHANNEL_BY_KEY.get(channelKey);
  const trace = await getChannelTrace(channelKey, range ?? {}, clinic === 'amc' ? 'all' : clinic);
  const back = `/?tab=group&gtab=growth${range?.from ? `&from=${range.from}` : ''}${range?.to ? `&to=${range.to}` : ''}${clinic !== 'all' ? `&gclinic=${clinic}` : ''}`;
  const cross = CROSS_LINKS[channelKey];
  return (
    <Card>
      <SectionHeader
        tag="G•"
        eyebrow="Channel drill-down"
        title={`${def?.label ?? channelKey} — the patients behind the number`}
        right={
          <span className="flex items-center gap-3">
            {cross ? (
              <Link href={cross.href} className="text-[12px] font-medium text-accent hover:underline">
                {cross.label} →
              </Link>
            ) : null}
            <Link href={back} className="text-[12px] font-medium text-ink-soft hover:underline">
              ← All channels
            </Link>
          </span>
        }
      />
      <div className="px-5 pb-5 pt-3">
        <p className="mb-3 text-[12px] text-ink-soft">
          {trace.total} booked appointment{trace.total === 1 ? '' : 's'} attributed to this channel in the selected window
          {trace.truncated ? ` (showing latest 300)` : ''}. Each row states the exact rule that attributed it.
        </p>
        {channelKey === 'ai-chat' ? (
          <p className="mb-3 rounded-card border border-dashed border-watch/60 bg-watch/5 px-3 py-2 text-[11.5px] leading-snug text-ink-soft">
            AI-assistant referral <span className="font-medium">sessions</span> are measured in GA4, but the booking
            widget doesn&apos;t capture the referrer — so a booking that started in ChatGPT is indistinguishable from
            Organic SEO today and appears under that row. Capturing the referrer in the widget is the fix; until then
            this list stays empty by design rather than guessing.
          </p>
        ) : null}
        {channelKey === 'paid-search' ? (
          <p className="mb-3 rounded-card border border-dashed border-watch/60 bg-watch/5 px-3 py-2 text-[11.5px] leading-snug text-ink-soft">
            This list shows only <span className="font-medium">hard-traced</span> patients. The estimated call bookings on
            the P&L row are claimed from the orphan pool — real patients with no channel trace, listed under{' '}
            <Link href={`/?tab=group&gtab=growth&gchan=direct-walkin${range?.from ? `&from=${range.from}` : ''}${range?.to ? `&to=${range.to}` : ''}`} className="font-medium text-accent hover:underline">
              Direct / Walk-in
            </Link>
            . Their Practo outcomes are real; only which channel each came from is estimated.
          </p>
        ) : null}
        {trace.patients.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-[12.5px] text-ink-soft">
            No booked appointments attribute to this channel in this window.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pl-3 pr-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Patient</th>
                  <th className="px-2 py-2 font-medium">Phone</th>
                  <th className="px-2 py-2 font-medium">File</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Doctor</th>
                  <th className="py-2 pl-2 pr-3 font-medium">Why this channel</th>
                </tr>
              </thead>
              <tbody>
                {trace.patients.map((p, i) => (
                  <tr key={`${p.mrNo}|${p.date}|${i}`} className="border-t border-line/70 align-top">
                    <td className="whitespace-nowrap py-2 pl-3 pr-2 text-[12px] tabular-nums text-ink">{p.date ?? '—'}</td>
                    <td className="px-2 py-2 text-[12.5px] font-medium text-ink">{p.patientName}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-[12px] tabular-nums text-ink-soft">{p.phone || '—'}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-[12px] text-ink-soft">{p.mrNo || '—'}</td>
                    <td className="px-2 py-2 text-[12px] text-ink-soft">{p.status || '—'}</td>
                    <td className="px-2 py-2 text-[12px] text-ink-soft">{p.doctor || '—'}</td>
                    <td className="py-2 pl-2 pr-3">
                      <span
                        className={`mr-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold ${
                          p.evidence === 'tagged' ? 'bg-good/10 text-good' : 'bg-watch/10 text-watch'
                        }`}
                      >
                        {p.ruleId} · {p.evidence}
                      </span>
                      <span className="text-[11px] leading-snug text-ink-soft">{p.ruleText}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

export async function GrowthPlatform({ range, gchan, gclinic }: { range?: { from?: string; to?: string }; gchan?: string; gclinic?: string } = {}) {
  const clinic = resolveGrowthClinic(gclinic);
  if (gchan && CHANNEL_BY_KEY.has(gchan)) {
    return <ChannelTraceView channelKey={gchan} range={range} clinic={clinic} />;
  }

  // AMC has no channel feed at all — no PMS sync, no site, and no paid ads
  // (campaigns ran only for Dental Nation Al Wasl). Say that instead of
  // rendering a page of hollow zeros.
  if (clinic === 'amc') {
    return (
      <div className="space-y-4">
        <GrowthClinicFilter active={clinic} />
        <Card>
          <SectionHeader tag="G" eyebrow="⭐ Growth Platform — the Dental Nation star" title="AMC — channel tracking not connected" />
          <div className="px-5 pb-5 pt-3">
            <p className="max-w-[640px] text-[12.5px] leading-relaxed text-ink-soft">
              AMC (Al Maher Medical Centre) has no channel data source yet — its PMS isn&apos;t synced, it doesn&apos;t
              share the Dental Nation website, and <span className="font-medium text-ink">no paid campaigns ran for
              AMC</span> (Google Ads and Meta ran only for Dental Nation Al Wasl). Its revenue lives in the{' '}
              <Link href="/?tab=group&gtab=al-maher" className="font-medium text-accent hover:underline">
                Group Revenue → AMC
              </Link>{' '}
              view (gross billed, ≈99.8% insurance). Connecting its PMS feed is what lights this view up.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const traceQs = `${range?.from ? `&from=${range.from}` : ''}${range?.to ? `&to=${range.to}` : ''}${clinic !== 'all' ? `&gclinic=${clinic}` : ''}`;
  const report = await getChannelPerformance(range ?? {}, clinic);
  const t = report.totals;

  const psEstEnq = report.channels.find((c) => c.key === 'paid-search')?.estEnquiries ?? 0;
  const kpis: KpiItem[] = [
    {
      label: 'Enquiries',
      value: int(t.enquiries),
      hint: `measured only, deduped by phone across widget + tracker + AI agent${psEstEnq > 0 ? ` · the Paid Search row adds ≈${int(psEstEnq)} Markov-modelled phone enquiries not counted here` : ''}`,
    },
    { label: 'Booked (Practo)', value: int(t.booked), hint: 'appointments in window' },
    { label: 'Show-up rate', value: pct(t.showRate), hint: 'arrived ÷ decided appointments' },
    { label: 'Treated (billed)', value: int(t.treated), hint: 'distinct billed patients' },
    { label: 'Attributed revenue', value: t.revenue > 0 ? aedShort(t.revenue) : '—', hint: 'joined patient → channel' },
  ];

  // Group subtotals for the at-a-glance bar (revenue by group). EVERY group
  // renders — a zero bar is information, not clutter (the CEO asked to see
  // Paid alongside the rest). Paid folds in the estimated phone-path revenue
  // and is marked ≈ when it does.
  const groupRevenue: BarDatum[] = CHANNEL_GROUPS.map((g) => {
    const rows = report.channels.filter((c) => c.group === g.key);
    const measured = rows.reduce((a, c) => a + c.revenue, 0);
    const est = rows.reduce((a, c) => a + (c.estRevenue ?? 0), 0);
    return {
      label: est > 0 ? `${g.label} ≈ (incl. est.)` : g.label,
      value: Math.round(measured + est),
      color: GROUP_ACCENT[g.key] ?? TOKENS.accent,
    };
  });

  // Per-group funnel totals for the sub-filter pills (measured figures only).
  const groupFunnels: GroupFunnel[] = [
    {
      key: 'all', label: 'All channels',
      enquiries: t.enquiries, booked: t.booked, showed: t.showed, treated: t.treated, revenue: t.revenue,
    },
    ...CHANNEL_GROUPS.map((g) => {
      const rows = report.channels.filter((c) => c.group === g.key);
      const sum = (f: (c: ChannelPerf) => number) => rows.reduce((a, c) => a + f(c), 0);
      return {
        key: g.key, label: g.label,
        enquiries: sum((c) => c.enquiries), booked: sum((c) => c.booked),
        showed: sum((c) => c.showed), treated: sum((c) => c.treated),
        revenue: Math.round(sum((c) => c.revenue)),
      };
    }),
  ];

  return (
    <div className="space-y-4">
      <GrowthClinicFilter active={clinic} />
      <p className="rounded-card border border-line bg-panel/40 px-3 py-2 text-[11.5px] leading-snug text-ink-soft">
        <span className="font-medium text-ink">Data coverage:</span> the Practo feed this view is built on starts in{' '}
        <span className="font-medium text-ink">2026</span> — appointments from January (substantive from March) and
        billing/revenue from <span className="font-medium text-ink">21 April 2026</span>. Showed / Treated / Revenue
        before those dates cannot appear here, whatever the window. Figures marked ≈ or “est.” include the estimated
        Markov-chain phone-path model; solid figures are measured.
      </p>
      <Card>
        <SectionHeader
          tag="G"
          eyebrow="⭐ Growth Platform — the Dental Nation star"
          title="Channel performance — enquiry to revenue"
        />
        <div className="px-5 pb-5 pt-3">
          <KpiBand items={kpis} />
          <div className="mt-5 grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">The one funnel every channel maps into</p>
              <FunnelGroupFilter groups={groupFunnels} />
              <Takeaway>
                Revenue attributed to channels in this window: <span className="font-semibold text-ink">{aed(t.revenue)}</span>
                {report.unattributedRevenue > 0 ? (
                  <> · a further {aedShort(report.unattributedRevenue)} from {report.unattributedPatients} billed patients has no channel trace (counted honestly as unattributed, not sprinkled across channels).</>
                ) : null}
              </Takeaway>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Revenue by channel group</p>
              {groupRevenue.length > 0 ? (
                <HBarChart data={groupRevenue} valueFormat="aed" />
              ) : (
                <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-[12px] text-ink-soft">
                  No billed revenue joins to a channel in this window.
                </p>
              )}
              {report.ga4 ? (
                <p className="mt-3 rounded-card border border-line bg-panel/40 px-3 py-2 text-[11px] leading-snug text-ink-soft">
                  <span className="font-medium">Visibility context:</span> {int(report.ga4.sessions)} website sessions from{' '}
                  <span className="font-medium">{int(report.ga4.users)} unique visitors</span>{' '}
                  {report.ga4.periodStart}–{report.ga4.periodEnd} (GA4, latest sync) — top sources{' '}
                  {report.ga4.channels.slice(0, 3).map((c) => `${c.channel} ${int(c.sessions)}`).join(' · ')}.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          tag="G1"
          eyebrow="Channel P&L"
          title="Every channel, one row — visibility to revenue"
        />
        <div className="overflow-x-auto px-5 pb-4 pt-2">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pl-3 pr-2 text-left font-medium">Channel</th>
                <th className="px-2 py-2 text-right font-medium">Reach</th>
                <th className="px-2 py-2 text-right font-medium">Enquiries</th>
                <th className="px-2 py-2 text-right font-medium">Booked</th>
                <th className="px-2 py-2 text-right font-medium">Showed</th>
                <th className="px-2 py-2 text-right font-medium">Treated</th>
                <th className="px-2 py-2 text-right font-medium">Revenue</th>
                <th className="py-2 pl-2 pr-3 text-right font-medium">Spend · economics</th>
              </tr>
            </thead>
            {CHANNEL_GROUPS.map((g) => {
              const rows = report.channels.filter((c) => c.group === g.key);
              if (rows.length === 0) return null;
              return (
                <tbody key={g.key}>
                  <tr>
                    <td colSpan={8} className="pb-1 pl-3 pt-4">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_ACCENT[g.key] }} />
                        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-ink">{g.label}</span>
                        <span className="text-[10.5px] text-ink-faint">{g.funnelRole}</span>
                      </span>
                    </td>
                  </tr>
                  {rows.map((p) =>
                    p.key === 'paid-search'
                      ? <PaidSearchRows key={p.key} p={p} traceQs={traceQs} />
                      : p.key === 'paid-social'
                        ? <PaidSocialRows key={p.key} p={p} split={report.metaSplit} traceQs={traceQs} />
                        : p.key === 'ai-chat'
                          ? <AiChatRows key={p.key} p={p} split={report.organicSplit} />
                          : <ChannelRow key={p.key} p={p} traceQs={traceQs} />,
                  )}
                </tbody>
              );
            })}
          </table>
          <p className="mt-2 px-3 text-[10.5px] leading-snug text-ink-faint">
            The small green/amber bar under “Booked” shows how much of that channel’s attribution rests on hard
            evidence (green) vs inference (amber). “Treated” = distinct patients with a finalized bill in the window.
            Summing a column here can exceed the scorecard above by design: the Paid Search row folds in the
            ≈ Markov-chain phone figures (marked), while the scorecard and funnel count measured events only.
          </p>
          <div className="mx-3 mt-3 rounded-card border border-line bg-panel/40 px-3 py-2.5 text-[10.5px] leading-relaxed text-ink-soft">
            <p className="font-semibold uppercase tracking-wide text-ink">How every cost figure here is computed (net = deduped &amp; attributed)</p>
            <p className="mt-1">
              <span className="font-medium text-ink">Cost per net enquiry (CPL)</span> = spend ÷ enquiries deduped by phone
              across all sources and attributed to the channel · <span className="font-medium text-ink">cost per net booking</span> = spend ÷
              booked Practo appointments · <span className="font-medium text-ink">cost per net show</span> = spend ÷ arrived + completed ·{' '}
              <span className="font-medium text-ink">cost per treated patient</span> = spend ÷ distinct billed patients ·{' '}
              <span className="font-medium text-ink">ROAS</span> = attributed billed revenue ÷ spend. Figures marked ≈ additionally include the
              estimated Google Ads phone path (labelled est., reconciled against untraced Dental Nation Al Wasl patients only).
            </p>
            <p className="mt-1">
              These net figures are the house numbers. The Meta / Google performance pages show the platforms’{' '}
              <span className="font-medium text-ink">own reported leads and conversions</span> — useful for optimising campaigns,
              but not deduped against the tracker and never added to this funnel; they are labelled “platform-reported” wherever
              they appear. The Executive KPI “cost per lead” is the <span className="font-medium text-ink">blended</span> figure
              (all spend ÷ all tracked leads, every channel) — by construction it sits between the per-channel net CPLs here.
            </p>
          </div>
        </div>
      </Card>

      <ConfidenceCard report={report} />

      {report.phonePath ? <PhonePathCard pp={report.phonePath} /> : null}

      {report.notes.length > 0 ? (
        <Card>
          <SectionHeader eyebrow="Data honesty" title="Coverage notes" tag="G3" />
          <ul className="space-y-1.5 px-5 pb-5 pt-3">
            {report.notes.map((n) => (
              <li key={n} className="flex items-start gap-2 text-[12px] leading-snug text-ink-soft">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-watch" />
                {n}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
