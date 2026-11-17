/**
 * Project page panels added for Ms Shadi (17 Nov 2026):
 * - ClinicFilter + ClinicProgressTable: her GBP plan clinic by clinic (activities
 *   done and outstanding, Google reviews against the plan's 30-day targets).
 * - MembershipPanel: Smile Club paying members from the membership admin
 *   (member ID, plan, partner code and dates only; never names or contacts).
 * Server components, no client JavaScript.
 */
import type { ClinicProgress, MembershipSnapshot, ProjectClinic } from '@/lib/projects/snapshot';

const th = 'bg-[#f4f7f5] px-3 py-2.5 align-bottom text-[10px] font-semibold tracking-[0.025em] text-[#657275] text-left';
const td = 'border-b border-[#e8eeea] px-3 py-2.5 align-top';
const num = 'text-right tabular-nums whitespace-nowrap';
const kicker = 'm-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy';
const fmt = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: 0 });
const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));

export const CLINIC_LABEL: Record<ProjectClinic, string> = { 'dental-nation': 'Al Wasl', 'dr-tosun': 'Dr Tosun', 'al-maher': 'Al Maher' };

/** Links that filter the page to one clinic (or all). */
export function ClinicFilter({ path, current }: { path: string; current: ProjectClinic | null }) {
  const opts: { key: ProjectClinic | null; label: string }[] = [
    { key: null, label: 'All clinics' },
    ...(Object.keys(CLINIC_LABEL) as ProjectClinic[]).map((k) => ({ key: k, label: CLINIC_LABEL[k] })),
  ];
  return (
    <nav className="my-3 flex flex-wrap gap-2" aria-label="Filter by clinic">
      {opts.map((o) => {
        const active = o.key === current;
        return (
          <a
            key={o.label}
            href={o.key ? `${path}?clinic=${o.key}#activities` : path}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full border px-3 py-1 text-xs font-semibold no-underline ${active ? 'border-dn-navy bg-dn-navy text-white' : 'border-dn-line bg-white text-dn-navy'}`}
          >
            {o.label}
          </a>
        );
      })}
    </nav>
  );
}

export function ClinicProgressTable({ clinics, path, current }: { clinics: ClinicProgress[]; path: string; current: ProjectClinic | null }) {
  return (
    <section id="clinics" className="my-4 min-w-0 scroll-mt-4 rounded-[10px] border border-dn-line bg-white p-4 sm:p-5">
      <p className={kicker}>Ms Shadi&apos;s GBP plan · clinic by clinic</p>
      <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Progress per clinic</h2>
      <p className="m-0 mb-3 text-xs text-[#617075]">
        Activities from the clinic tabs of the GBP Plan sheet. Reviews are Google&apos;s own count now, against the plan&apos;s start and 30-day target.
        Pick a clinic to see only its activities.
      </p>
      <ClinicFilter path={path} current={current} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[12.5px] text-dn-ink">
          <thead>
            <tr>
              <th className={th}>Clinic</th><th className={th}>Activities</th>
              <th className={`${th} text-right`}>Reviews at start</th><th className={`${th} text-right`}>Reviews now</th>
              <th className={`${th} text-right`}>30-day target</th><th className={th}>Progress to target</th>
              <th className={`${th} text-right`}>New-patient target</th>
            </tr>
          </thead>
          <tbody>
            {clinics.map((c) => {
              const gained = c.reviewsNow == null ? null : c.reviewsNow - c.reviewsBaseline;
              const need = c.reviewsTarget - c.reviewsBaseline;
              const pct = gained == null || need <= 0 ? null : Math.max(0, Math.min(100, Math.round((gained / need) * 100)));
              return (
                <tr key={c.clinic}>
                  <td className={td}>
                    <a className="font-semibold text-dn-navy underline" href={`${path}?clinic=${c.clinic}#activities`}>{c.name}</a>
                  </td>
                  <td className={td}>
                    {c.counts.done} of {c.counts.total} done{c.counts.inProgress ? `, ${c.counts.inProgress} in progress` : ''}
                    {c.counts.overdue ? <span className="block font-bold text-[#b42318]">{c.counts.overdue} overdue</span> : null}
                  </td>
                  <td className={`${td} ${num}`}>{fmt(c.reviewsBaseline)}</td>
                  <td className={`${td} ${num} font-semibold`}>{c.reviewsNow == null ? <span className="text-[#8a9598]">not yet</span> : fmt(c.reviewsNow)}</td>
                  <td className={`${td} ${num}`}>{fmt(c.reviewsTarget)}</td>
                  <td className={td}>
                    {pct == null ? <span className="text-[#8a9598]">not yet</span> : (
                      <>
                        <span className="block h-2 w-full max-w-[160px] overflow-hidden rounded bg-[#eef1f2]">
                          <span className="block h-2 bg-dn-navy" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="text-[11px] text-[#647578]">{pct}% of the way ({gained != null && gained >= 0 ? `+${fmt(gained)}` : fmt(gained ?? 0)} of +{fmt(need)})</span>
                      </>
                    )}
                  </td>
                  <td className={`${td} ${num}`}>{fmt(c.patientTarget)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="m-0 mt-2 text-[11px] text-[#647578]">
        New patients from Google are not counted yet: the plan asks reception to record Google Maps as the source (Patient attribution activity).
      </p>
    </section>
  );
}

export function MembershipPanel({ m }: { m: MembershipSnapshot | null }) {
  return (
    <section id="members" className="my-4 min-w-0 scroll-mt-4 rounded-[10px] border border-dn-line bg-white p-4 sm:p-5">
      <p className={kicker}>Smile Club · membership admin</p>
      <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Paying members</h2>
      {!m ? (
        <p className="m-0 text-[12.5px] text-[#647578]">No read of the membership admin yet.</p>
      ) : (
        <>
          <p className="m-0 mb-3 text-xs text-[#617075]">
            From smileclub.dentalnation.com/admin, read {dayMonth(m.day)}. The admin has no export yet, so these figures are entered from a read of the page.
            The lead tracker counts only sign-ups the front office marks, so its conversion count is lower.
          </p>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Active paying members', m.activeMembers == null ? 'not yet' : fmt(m.activeMembers)],
              ['Monthly revenue', m.monthlyRevenueAed == null ? 'not yet' : `AED ${fmt(m.monthlyRevenueAed)}`],
              ['Incomplete applications', m.incompleteApplications == null ? 'not yet' : fmt(m.incompleteApplications)],
              ['Upcoming appointments', m.upcomingAppointments == null ? 'not yet' : fmt(m.upcomingAppointments)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-dn-line bg-[#f7f5ef] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#657275]">{label}</div>
                <div className="text-xl font-bold text-dn-navy">{value}</div>
              </div>
            ))}
          </div>
          {m.members.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[12.5px] text-dn-ink">
                <thead>
                  <tr>
                    <th className={th}>Member ID</th><th className={th}>Plan</th><th className={th}>Pays</th>
                    <th className={`${th} text-right`}>Amount</th><th className={th}>Partner code</th><th className={th}>Started</th><th className={th}>Renews</th>
                  </tr>
                </thead>
                <tbody>
                  {[...m.members].sort((a, b) => (a.started < b.started ? -1 : 1)).map((x) => (
                    <tr key={x.id}>
                      <td className={td}>{x.id}</td><td className={td}>{x.plan}</td><td className={td}>{x.pays}</td>
                      <td className={`${td} ${num}`}>AED {fmt(x.amount)}</td><td className={td}>{x.partner}</td>
                      <td className={`${td} whitespace-nowrap`}>{dayMonth(x.started)}</td><td className={`${td} whitespace-nowrap`}>{dayMonth(x.renews)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
