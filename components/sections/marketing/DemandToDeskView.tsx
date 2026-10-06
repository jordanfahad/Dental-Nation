import React from 'react';
import Image from 'next/image';
import { demandLearnings, competitionLabel } from '../../../lib/analytics/demandLearnings';
import { META_LAUNCH_DATE } from '../../../config/demand-themes';
import { ratio, type Count, type DemandReport, type MetaWeek, type ThemeReport } from '../../../lib/analytics/demandToDesk';

const number = (n: Count) => n == null ? 'Unknown' : Math.round(n).toLocaleString('en-US');
const decimal = (n: Count) => n == null ? 'Unknown' : n.toFixed(1);
const percent = (n: Count) => n == null ? 'Unknown' : `${Math.round(n * 100)}%`;
const money = (n: Count) => n == null ? 'Unknown' : `AED ${number(n)}`;
const share = (n: Count, total: Count) => `${number(n)} / ${number(total)} · ${percent(ratio(n, total))}`;
const short = (date: string) => date.slice(5);
const safeCampaign = (value: string) => value.replace(/\+?[\d][\d\s()-]{7,}\d/g, '[number omitted]');

function Searches({ row }: { row: ThemeReport }) {
  const count = row.keywords.length;
  return <>
    <strong>{row.product.searches === 0 ? `Under 10 a month (${count} keywords checked)` : row.product.searches == null ? 'Unavailable' : number(row.product.searches)}</strong>
    <details className="demand-keywords"><summary>{count} keywords</summary>
      <table><thead><tr><th>Keyword</th><th>Searches / month</th><th>CPC (USD)</th><th>Competition</th></tr></thead>
        <tbody>{row.keywords.map((k) => <tr key={`${k.language}:${k.keyword}`}><th scope="row" dir="auto">{k.keyword}</th><td>{number(k.searches)}</td><td>{k.cpcUsd?.toFixed(2) ?? 'Unknown'}</td><td>{competitionLabel(k.competition)}</td></tr>)}</tbody>
      </table>
    </details>
    <small>{row.gbp === 0 ? "Below Google's reporting floor" : row.gbp == null ? 'GBP unavailable' : `${row.gbpThreshold ? '< ' : ''}${number(row.gbp)} GBP`}</small>
  </>;
}

function Creatives({ row }: { row: ThemeReport }) {
  return <div className="demand-creatives" aria-label={`${row.label} creatives`}>
    {row.creatives.length ? row.creatives.map((ad) => <figure key={`${ad.platform}:${ad.adId}`}>
      {ad.thumbnailUrl ? <Image unoptimized src={ad.thumbnailUrl} width={180} height={120} alt={safeCampaign(ad.name)} referrerPolicy="no-referrer" /> : <strong>{safeCampaign(ad.title || ad.name)}</strong>}
      <figcaption><small>{ad.platform === 'meta' ? 'Meta' : 'Google Ads'} · {safeCampaign(ad.name)}</small><p>{safeCampaign(ad.body)}</p>
        <small>{money(ad.spend)} spend · {ad.platform === 'google' ? 'Chats not tracked' : `${number(ad.chats)} chats · ${money(ad.costChat)} / chat`}</small>
      </figcaption>
    </figure>) : <p>No creative preview in the synced source.</p>}
  </div>;
}

function StageCell({ row, stage }: { row: ThemeReport; stage: string }) {
  const index = row.stages.findIndex((s) => s.key === stage);
  const step = row.steps[index - 1];
  return <td><strong>{number(row.stages[index].count)}</strong>{step && <small title={step.comparable ? `${step.from} to ${step.to}` : 'Unlinked source comparison; not a conversion rate'}>{percent(step.rate)}{step.comparable ? '' : ' †'}</small>}</td>;
}
function MetaRows({ rows }: { rows: MetaWeek[] }) {
  return <>{rows.map((row) => <tr key={`${row.theme}:${row.week}`}>
    <th scope="row">{row.label}<small>{short(row.week)}–{short(row.end)}{row.partial ? ' · partial' : ''}</small></th>
    <td>{number(row.impressions)}<small>{number(row.reach)} reach*</small></td>
    <td>{decimal(row.frequency)}<small>{money(row.cpm)} CPM</small></td>
    <td>{money(row.costChat)}<small>{money(row.costNet)} / net · {percent(row.chatRate)} chat / reach*</small></td>
    <td>{row.signal}</td>
  </tr>)}</>;
}

/** Only aggregate report values reach the view; raw lead/appointment rows never do. */
export function DemandToDeskView({ report }: { report: DemandReport }) {
  const learning = demandLearnings(report.themes, report.range.to);
  const latestWeek = report.weekly.at(-1)?.week;
  const recent = report.weekly.filter((w) => w.week === latestWeek);
  const first = report.cohorts[0], latest = report.cohorts.at(-1);
  const followup = report.discipline.slice(-4);
  const hasRows = report.themes.some((row) => row.meta.rows || (row.desk.logged ?? 0) || (row.clinic.booked ?? 0));
  return <article className="demand-report" aria-labelledby="demand-title">
    <header className="demand-masthead">
      <div><p className="demand-kicker">Dental Nation · Marketing</p><h2 id="demand-title">Demand to desk</h2>
        <p>{report.range.from} → {report.range.to} · Treatment themes from market interest to clinic attendance</p></div>
      <span className="demand-stamp">COUNTS · MEASURED + MODELLED</span>
    </header>
    <form method="get" className="demand-controls demand-screen-only">
      <input type="hidden" name="tab" value="marketing" /><input type="hidden" name="mtab" value="demand" /><input type="hidden" name="preset" value="custom" />
      <label>From <input type="date" name="from" defaultValue={report.range.from} required /></label>
      <label>To <input type="date" name="to" defaultValue={report.range.to} required /></label>
      <button type="submit">Update range</button><a href="?tab=marketing&mtab=demand">Last full month</a><span>Print: A4 landscape</span>
    </form>
    {!hasRows && <p className="demand-empty" role="status">No synced activity is available in this period. Unknown means the source is unavailable; zero means no matching rows in an available source.</p>}
    <ol className="demand-findings">{report.findings.map((finding) => <li key={finding}>{finding}</li>)}</ol>
    <p className="demand-note">Market = modelled UAE monthly searches for the configured keyword set, not unique people or Dubai-only demand. GBP = measured profile impressions for whole selected months. Ad totals sum ad/day counts, not unique people across the period. † compares unlinked populations; only comparable stage drops are highlighted.</p>

    <section aria-labelledby="demand-funnel-title"><h3 id="demand-funnel-title">Theme × stage <span>Current tracker outcomes · clinic counts are new DN files, all channels</span></h3>
      <div className="demand-scroll"><table className="demand-funnel"><thead><tr>
        <th scope="col">Treatment theme</th><th scope="col">Searches / GBP</th><th scope="col">Meta spend</th><th scope="col">Chats</th><th scope="col">Net</th><th scope="col">Desk logged</th><th scope="col">Reached</th><th scope="col">Desk booked</th><th scope="col">Clinic booked</th><th scope="col">Attended</th><th scope="col">Largest comparable drop</th><th scope="col">Search / spend share</th>
      </tr></thead><tbody>{report.themes.map((row) => <tr key={row.key}>
        <th scope="row">{row.label}</th><td><Searches row={row} /></td><td>{money(row.meta.spend)}</td>
        {row.stages.map((stage) => <StageCell key={stage.key} row={row} stage={stage.key} />)}
        <td className={row.leak ? 'demand-leak' : ''}>{row.leak ? <>{row.leak.from} → {row.leak.to}<small>{percent(row.leak.drop)} drop</small></> : 'Unknown'}</td>
        <td>{percent(row.marketShare)} / {percent(row.spendShare)}</td>
      </tr>)}</tbody></table></div>
    </section>

    <section aria-labelledby="demand-learnings-title">
      <h3 id="demand-learnings-title">What we learned and what we do next</h3>
      <aside className="demand-decision-box"><h4>Three decisions for Mr Akbar</h4><ol>{learning.choices.map((choice) => <li key={choice}>{choice}</li>)}</ol></aside>
      <p className="demand-note">Suggested actions for review by the named owner. Meta spend and tracker bookings are separate populations; cost per booking is a comparison, not proof of attribution. By when is measured from the report end.</p>
      <div className="demand-scroll"><table className="demand-learnings"><thead><tr><th>Theme</th><th>What the market wants</th><th>What we ran</th><th>What happened at the desk</th><th>What we learned</th><th>What we do next</th><th>Owner</th><th>By when</th></tr></thead>
        <tbody>{learning.rows.map(({ theme: row, learned, action, owner, due }) => <tr key={row.key}>
          <th scope="row">{row.label}</th><td>{row.product.searches === 0 ? `Under 10 a month (${row.keywords.length} keywords checked)` : `${number(row.product.searches)} searches/month`}<small>{row.product.cpcUsd == null ? 'CPC unknown' : `USD ${row.product.cpcUsd.toFixed(2)} / click`} · {competitionLabel(row.product.competition)} competition</small></td>
          <td>{money(row.meta.spend)} Meta spend<small>{number(row.meta.chats)} chats · {money(row.meta.costChat)} / chat</small><details><summary>Creatives ({row.creatives.length})</summary><Creatives row={row} /></details></td>
          <td>{number(row.desk.logged)} leads → {number(row.desk.reached)} reached → {number(row.desk.interested)} interested → {number(row.desk.booked)} booked → {number(row.desk.converted)} attended / converted</td>
          <td>{learned}</td><td>{action}</td><td>{owner}</td><td>{due}</td>
        </tr>)}</tbody>
      </table></div>
      {!learning.rows.length && <p>No theme has measured demand or spend in the available sources.</p>}
      <p className="demand-note">Creative copy is the latest synced version; spend and chats use the selected dates. Thumbnails load directly from their stored URLs. Google chat counts are unavailable.</p>
    </section>

    <div className="demand-grid">
      <section aria-labelledby="demand-meta-title"><h3 id="demand-meta-title">Demand on Meta <span>Latest available week in the selected range</span></h3>
        <div className="demand-scroll"><table><thead><tr><th scope="col">Theme / week</th><th scope="col">Impressions / reach</th><th scope="col">Frequency / CPM</th><th scope="col">Chat economics</th><th scope="col">Trend signal</th></tr></thead><tbody><MetaRows rows={recent} /></tbody></table></div>
        {!recent.length && <p className="demand-note">No weekly data in this range.</p>}
        <p className="demand-note">* Reach is the sum of ad/day reach and can repeat people; frequency and chat/reach are directional. Demand supported = spend rises while cost/chat stays flat or falls; possible saturation = cost/chat rises with flat/falling chats. Only complete weeks are compared.</p>
        <p className="demand-note">Targets: cost/chat: no target set; cost/net: no target set. Desk booking benchmark {report.bookingBenchmark?.label ?? 'Unknown'} (planning range from KPI benchmarks, not a theme-specific target). Generic CPL and membership acquisition targets use different denominators.</p>
      </section>
      <section>
        <h3>Lead quality since {META_LAUNCH_DATE}</h3>
        <div className="demand-cohorts">{[['First cohort', first], ['Latest cohort', latest]].map(([label, value]) => {
          const row = typeof value === 'object' ? value : undefined;
          return <div key={String(label)}><strong>{String(label)}</strong><p>{row ? `${row.week} → ${row.end}${row.partial ? ' · partial week' : ''}` : 'Unknown'}</p><p>{row ? `${number(row.chats)} chats † → ${number(row.interested)} interested → ${number(row.booked)} booked → ${number(row.converted)} converted / arrived` : 'No cohorts'}</p><small>{row ? `${number(row.clinicAttended)} clinic attendees in that service week (unlinked)` : 'Unknown'}</small></div>;
        })}</div>
        <p className="demand-note">Acquisition-week cohorts show the tracker’s current status, not status as of the selected end date. Recent cohorts have had less time to mature. Positive later milestones imply earlier milestones; latest non-empty follow-up wins over older notes.</p>
      </section>
      <section>
        <h3>Follow-up discipline <span>Latest four acquisition weeks · counts / cohort and share</span></h3>
        <div className="demand-scroll"><table><thead><tr><th scope="col">Week</th><th scope="col">First / second / third</th><th scope="col">Call logged*</th><th scope="col">Next action</th><th scope="col">No follow-up</th></tr></thead><tbody>{followup.map((row) => <tr key={row.week}><th scope="row">{short(row.week)}<small>{number(row.logged)} leads</small></th><td>{number(row.first)} / {number(row.second)} / {number(row.third)}<small>{percent(ratio(row.first, row.logged))} / {percent(ratio(row.second, row.logged))} / {percent(ratio(row.third, row.logged))}</small></td><td>{share(row.callLogged, row.callLinkable)}<small>linked refs only</small></td><td>{share(row.nextAction, row.logged)}</td><td>{share(row.noFollow, row.logged)}</td></tr>)}</tbody></table></div>
      </section>
    </div>

    <section className="demand-print-only" aria-label="Launch summary"><h3>Launch history <span>All observed activity since launch through the selected end date; full campaign / ad-set register on screen</span></h3>
      <div className="demand-launch-summary">{report.themes.map((theme) => {
        const rows = report.launches.filter((r) => r.theme === theme.key);
        const spend = rows.some((r) => r.spend == null) ? null : rows.reduce((total, r) => total + r.spend!, 0);
        return <div key={theme.key}><strong>{theme.label}</strong><small>{rows.length ? `${rows.length} groups · ${money(spend)} · ${rows.map((r) => r.first).sort()[0]} → ${rows.map((r) => r.last).sort().at(-1)}` : 'No observed launch'}</small></div>;
      })}</div>
    </section>

    <details className="demand-screen-only" open><summary>All weekly Meta metrics and cohort history</summary>
      <div className="demand-scroll"><table><thead><tr><th scope="col">Theme / week</th><th scope="col">Impressions / reach</th><th scope="col">Frequency / CPM</th><th scope="col">Chat economics</th><th scope="col">Trend signal</th></tr></thead><tbody><MetaRows rows={report.weekly} /></tbody></table></div>
      <div className="demand-scroll"><table><thead><tr><th scope="col">Cohort</th><th scope="col">Chats †</th><th scope="col">Interested</th><th scope="col">Booked</th><th scope="col">Converted / arrived</th><th scope="col">Clinic attendance †</th><th scope="col">1st / 2nd / 3rd follow-up</th><th scope="col">Call / linked</th><th scope="col">Next / none</th></tr></thead><tbody>{report.cohorts.map((row, index) => {
        const f = report.discipline[index];
        return <tr key={row.week}><th scope="row">{row.week}–{row.end}{row.partial ? ' · partial' : ''}</th><td>{number(row.chats)}</td><td>{number(row.interested)}</td><td>{number(row.booked)}</td><td>{number(row.converted)}</td><td>{number(row.clinicAttended)}</td><td>{share(f.first, f.logged)}<small>{share(f.second, f.logged)} · {share(f.third, f.logged)}</small></td><td>{share(f.callLogged, f.callLinkable)}</td><td>{share(f.nextAction, f.logged)}<small>{share(f.noFollow, f.logged)} no follow-up</small></td></tr>;
      })}</tbody></table></div>
    </details>

    <details className="demand-screen-only" open><summary>Launch register and desk barriers</summary>
      <div className="demand-scroll"><table><thead><tr><th scope="col">Theme</th><th scope="col">Campaign / ad set</th><th scope="col">First active</th><th scope="col">Last active</th><th scope="col">Spend</th><th scope="col">Activity</th></tr></thead><tbody>{report.launches.map((row, i) => <tr key={i}><th scope="row">{row.label}</th><td>{safeCampaign(row.campaign)}<small>{safeCampaign(row.adset)}</small></td><td>{row.first}</td><td>{row.last}</td><td>{money(row.spend)}</td><td>{row.recency}</td></tr>)}</tbody></table></div>
      {!report.launches.length && <p>No observed launches in the stored history.</p>}
      <div className="demand-scroll"><table><thead><tr><th scope="col">Theme</th><th scope="col">No answer</th><th scope="col">Language</th><th scope="col">Price</th><th scope="col">Not interested</th><th scope="col">International</th><th scope="col">Out of area</th><th scope="col">Clinic cancel / no-show</th><th scope="col">Ranked keyword sample</th></tr></thead><tbody>{report.themes.map((row) => <tr key={row.key}><th scope="row">{row.label}</th><td>{number(row.desk.noAnswer)}</td>{['language', 'price', 'notInterested', 'international', 'outOfArea'].map((key) => <td key={key}>{row.desk.logged == null ? 'Unknown' : number(row.desk.barriers[key])}</td>)}<td>{number(row.clinic.cancelled)} / {number(row.clinic.noShow)}</td><td>{number(row.rankedSearches)}<small>{report.rankedMarket ?? 'Market unknown'}</small></td></tr>)}</tbody></table></div>
    </details>
    <footer className="demand-footnote">
      <p>Market snapshot: {report.marketDate?.slice(0, 10) ?? 'unavailable'} · Canonical Meta leads: {number(report.canonicalCount)} (reconciliation only; never added to tracker counts). Print includes latest-week Meta, four-week follow-up and grouped launch summaries; full detail remains on screen.</p>
      {report.gaps.length > 0 && <p><strong>Coverage:</strong> {report.gaps.join(' ')}</p>}
      <p>Theme and status matching is rule based, including Arabic and common typos. No patient names, contact details or raw notes are displayed. Clinic files are distinct within each theme; totals across themes may overlap.</p>
    </footer>
  </article>;
}
