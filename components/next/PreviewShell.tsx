/**
 * Shell of the /next DN-032 preview (mockups 01 and 06): the preview strip,
 * the navy brand header with the navigation, and the footer.
 *
 * Navigation (Ms Shadi, 14 Nov 2026: one home per project, no overlap):
 * Projects (home), then one tab per project (Clinic Activation, DN Ortho,
 * Google Business Profile, Smile Club, each /next/projects/<key>), the
 * Content Calendar, and Group reports (Overview, Channels, Clinics,
 * Programmes: group-wide figures, shown as a second row when one is open).
 * The older Clinic Activation and DN Ortho report pages (/next/activation,
 * /next/ortho) still work for the email links but are not in the menu.
 * Each page passes `active` so the nav highlights it. Reports and
 * Admin are <details> buttons that point to the detailed dashboard, so
 * nothing links to a 404. The page links carry the current date range
 * (rangeParams), so switching page keeps the dates. Server component, no
 * JavaScript needed.
 */

export type PreviewSection =
  | 'Projects' | 'Clinic Activation' | 'DN Ortho' | 'Google Business Profile' | 'Smile Club' | 'Content Calendar'
  | 'Overview' | 'Channels' | 'Clinics' | 'Programmes';
type NavItem = PreviewSection | 'Group reports';

/** The real pages of the preview, in nav order. */
const SECTIONS: { name: NavItem; href: string }[] = [
  { name: 'Projects', href: '/next/projects' },
  { name: 'Clinic Activation', href: '/next/projects/clinic-activation' },
  { name: 'DN Ortho', href: '/next/projects/ortho' },
  { name: 'Google Business Profile', href: '/next/projects/gbp' },
  { name: 'Smile Club', href: '/next/projects/smile-club' },
  { name: 'Content Calendar', href: '/next/calendar' },
  { name: 'Group reports', href: '/next' },
];
/** Group-wide reports, not tied to one project: a second nav row when one is open. */
const GROUP_REPORTS: { name: PreviewSection; href: string }[] = [
  { name: 'Overview', href: '/next' },
  { name: 'Channels', href: '/next/channels' },
  { name: 'Clinics', href: '/next/clinics' },
  { name: 'Programmes', href: '/next/programmes' },
];

const COMING_SOON = ['Reports', 'Admin'];

function ComingSoonItem({ name, dark }: { name: string; dark?: boolean }) {
  // The popover is anchored to the nav (the nearest positioned ancestor), not
  // to this item's cell: anchored to a right-column cell it would overflow a
  // phone viewport and give the page sideways scroll.
  return (
    <details>
      <summary
        className={`cursor-pointer list-none rounded font-medium [&::-webkit-details-marker]:hidden ${
          dark
            ? 'border border-[#547089] px-2 py-2 text-center text-[11px] text-white'
            : 'border-b-[3px] border-transparent pb-[15px] pt-3 text-[#e2eaf0]'
        }`}
      >
        {name}
      </summary>
      <div
        className={`absolute top-full z-20 mt-1 rounded-md border border-dn-line bg-white p-3 text-xs text-dn-ink shadow-lg ${
          dark ? 'inset-x-0' : 'left-0 w-56'
        }`}
      >
        <strong className="text-dn-navy">{name}</strong> is still in the detailed dashboard.{' '}
        <a className="font-semibold text-dn-navy underline" href="/?tab=executive">Open the detailed dashboard</a>
      </div>
    </details>
  );
}

export function PreviewShell({
  children, active = 'Overview', rangeParams = {},
}: {
  children: React.ReactNode;
  active?: PreviewSection;
  /** The current date range's params (from/to or preset), carried by the nav so switching page keeps the dates. */
  rangeParams?: Record<string, string>;
}) {
  const q = new URLSearchParams(rangeParams).toString();
  const withQ = (href: string) => (q ? `${href}?${q}` : href);
  const sections = SECTIONS.map((s) => ({ ...s, href: withQ(s.href) }));
  const inGroup = GROUP_REPORTS.some((g) => g.name === active);
  const current: NavItem = inGroup ? 'Group reports' : active;
  return (
    <div className="min-h-screen bg-dn-off font-sans text-sm text-dn-ink">
      <div className="flex justify-between gap-3 bg-dn-mint px-4 py-2 text-[11px] text-dn-navy sm:px-7 sm:text-xs">
        <span>
          <strong>NEW DESIGN</strong> · live figures · click any number for its proof
        </span>
        <a className="font-semibold text-dn-navy underline" href="/?tab=executive">Detailed dashboard</a>
      </div>
      <header className="bg-dn-navy px-4 text-white sm:px-8">
        <div className="flex h-[60px] items-center justify-between sm:h-[68px]">
          <a className="flex items-center gap-3 text-lg font-bold tracking-[-0.5px] text-white no-underline sm:text-xl" href="/next/projects">
            <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-dn-mint text-[15px] text-dn-navy">DN</span>
            Dental Nation
          </a>
          <a className="text-xs text-[#d9e6eb] underline" href="/?tab=executive">Detailed dashboard</a>
        </div>
        <nav className="relative hidden gap-4 whitespace-nowrap sm:flex lg:gap-7" aria-label="Main navigation">
          {sections.map((s) =>
            s.name === current ? (
              <a
                key={s.name}
                className="border-b-[3px] border-dn-mint pb-[15px] pt-3 font-semibold text-white no-underline"
                href={s.href}
                aria-current="page"
              >
                {s.name}
              </a>
            ) : (
              <a
                key={s.name}
                className="border-b-[3px] border-transparent pb-[15px] pt-3 font-medium text-[#e2eaf0] no-underline"
                href={s.href}
              >
                {s.name}
              </a>
            ),
          )}
          {COMING_SOON.map((name) => (
            <ComingSoonItem key={name} name={name} />
          ))}
        </nav>
        <details className="pb-3 sm:hidden">
          <summary className="cursor-pointer py-1 text-xs font-semibold">Navigate · {current}</summary>
          <nav className="relative mt-2 grid grid-cols-3 gap-1.5" aria-label="Mobile navigation">
            {sections.map((s) =>
              s.name === current ? (
                <a
                  key={s.name}
                  className="rounded border border-dn-mint bg-dn-mint px-2 py-2 text-center text-[11px] font-semibold text-dn-navy no-underline"
                  href={s.href}
                  aria-current="page"
                >
                  {s.name}
                </a>
              ) : (
                <a
                  key={s.name}
                  className="rounded border border-[#547089] px-2 py-2 text-center text-[11px] font-medium text-white no-underline"
                  href={s.href}
                >
                  {s.name}
                </a>
              ),
            )}
            {COMING_SOON.map((name) => (
              <ComingSoonItem key={name} name={name} dark />
            ))}
          </nav>
        </details>
      </header>
      {inGroup ? (
        <nav className="border-b border-dn-line bg-white px-4 sm:px-8" aria-label="Group reports">
          <div className="flex gap-4 overflow-x-auto whitespace-nowrap py-2 text-xs">
            <span className="font-semibold text-[#617075]">Group reports:</span>
            {GROUP_REPORTS.map((g) => (
              <a
                key={g.name}
                href={withQ(g.href)}
                aria-current={g.name === active ? 'page' : undefined}
                className={g.name === active ? 'font-bold text-dn-navy underline' : 'text-dn-navy no-underline hover:underline'}
              >
                {g.name}
              </a>
            ))}
          </div>
        </nav>
      ) : null}
      {children}
      <footer className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-8">
        <div className="flex flex-col justify-between gap-2 border-t border-dn-line pt-3 text-[10px] text-[#6c7b7c] sm:flex-row sm:gap-5">
          <span>Live figures. All amounts in AED. Business dates use Dubai time unless a source-day label is shown.</span>
          <span>DN-032 · Definition version 1 · Click a number for its proof</span>
        </div>
      </footer>
    </div>
  );
}
