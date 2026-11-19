/**
 * Exit handover page body (/next/handover). Static content from
 * config/exit-handover.ts; no data read, so nothing here can leak patient
 * records or credentials. Server component, no client JavaScript.
 */
import { EXIT_HANDOVER as H, exitPendingCount, type HandoverItem, type Slot } from '@/config/exit-handover';

const card = 'my-4 min-w-0 scroll-mt-4 rounded-[10px] border border-dn-line bg-white p-4 sm:p-5';
const kicker = 'm-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy';
const h2 = 'm-0 mb-3 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg';
const th = 'bg-[#f4f7f5] px-3 py-2.5 text-left align-bottom text-[10px] font-semibold tracking-[0.025em] text-[#657275]';
const td = 'border-b border-[#e8eeea] px-3 py-2.5 align-top';

function SlotText({ s }: { s: Slot }) {
  return s.pending ? (
    <span>
      {s.value}{' '}
      <span className="ml-1 inline-block rounded-full border border-[#e7c66b] bg-[#fff6dc] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] text-[#8a6100]">to confirm</span>
    </span>
  ) : <span>{s.value}</span>;
}

function Items({ items }: { items: readonly HandoverItem[] }) {
  return (
    <ul className="m-0 list-none space-y-3 p-0">
      {items.map((i) => (
        <li key={i.title} className="rounded-md border border-dn-line bg-[#fbfaf7] p-3">
          <p className="m-0 text-[13.5px] font-bold text-dn-navy">{i.title}</p>
          <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-dn-ink">{i.body}</p>
          {i.owner ? <p className="m-0 mt-1.5 text-[12px] text-[#4d5b5f]"><span className="font-semibold">Owner: </span><SlotText s={i.owner} /></p> : null}
        </li>
      ))}
    </ul>
  );
}

function Section({ id, n, label, title, children }: { id: string; n: number; label: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className={card}>
      <p className={kicker}>{n}. {label}</p>
      <h2 className={h2}>{title}</h2>
      {children}
    </section>
  );
}

export function ExitHandoverView() {
  const pending = exitPendingCount();
  const c = H.cover;
  return (
    <div>
      <header className="rounded-[10px] bg-dn-navy p-5 text-white sm:p-6">
        <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-[#cfe0e7]">Internal · as of {c.asOf}</p>
        <h1 className="m-0 mt-1 text-xl font-bold tracking-[-0.5px] sm:text-2xl">{c.title}</h1>
        <p className="m-0 mt-1 text-sm text-[#d9e6eb]">{c.author} · {c.audience}</p>
        <p className="m-0 mt-1 text-sm text-[#d9e6eb]">Last day: {c.lastDay.value}{c.lastDay.pending ? ' (to confirm)' : ''}</p>
        <p className="m-0 mt-3 max-w-[820px] text-[13px] leading-relaxed text-white">{c.summary}</p>
        <p className="m-0 mt-3 text-xs text-[#ffe6a6]">{pending} item{pending === 1 ? '' : 's'} still to confirm, marked in amber below.</p>
      </header>

      <nav className="mt-4 flex flex-wrap gap-2 text-xs" aria-label="Handover sections">
        {[['links', 'Where to look'], ['automation', 'What runs by itself'], ['emails', '9am emails'], ['ownership', 'Who owns what'], ['open', 'Open items'], ['access', 'Access'], ['plan', 'Until my last day']].map(([id, l]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-dn-line bg-white px-3 py-1 font-semibold text-dn-navy no-underline">{l}</a>
        ))}
      </nav>

      <Section id="links" n={1} label="Where to look" title="The screens that replace asking for a report">
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
          {H.links.map((l) => (
            <li key={l.href} className="rounded-md border border-dn-line p-3">
              <a href={l.href} className="text-[13.5px] font-bold text-dn-navy underline">{l.label}</a>
              <p className="m-0 mt-1 text-[12.5px] text-dn-ink">{l.what}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="automation" n={2} label="What runs by itself" title="Automation: no one needs to do these">
        <Items items={H.automation} />
      </Section>

      <Section id="emails" n={3} label="9am emails" title="Who receives what">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[12.5px] text-dn-ink">
            <thead><tr><th className={th}>Report</th><th className={th}>To</th><th className={th}>When</th></tr></thead>
            <tbody>
              {H.emails.map((e) => (
                <tr key={e.report}><td className={`${td} font-semibold`}>{e.report}</td><td className={td}>{e.to}</td><td className={`${td} whitespace-nowrap`}>{e.when}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="m-0 mt-3 text-[12.5px] text-dn-ink">{H.emailsNote}</p>
      </Section>

      <Section id="ownership" n={4} label="Who owns what" title="Work that needs a person after I leave">
        <Items items={H.ownership} />
      </Section>

      <Section id="open" n={5} label="Open items" title="Where things stand">
        <Items items={H.openItems} />
      </Section>

      <Section id="access" n={6} label="Access" title="Who holds access (no passwords on this page)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[12.5px] text-dn-ink">
            <thead><tr><th className={th}>System</th><th className={th}>Held by</th></tr></thead>
            <tbody>
              {H.accessMap.map((a) => (
                <tr key={a.system}><td className={`${td} font-semibold`}>{a.system}</td><td className={td}><SlotText s={a.holders} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="plan" n={7} label="Until my last day" title="What I will finish before I go">
        <ol className="m-0 space-y-1.5 pl-5 text-[12.5px] text-dn-ink">
          {H.plan.map((p) => <li key={p}>{p}</li>)}
        </ol>
      </Section>
    </div>
  );
}
