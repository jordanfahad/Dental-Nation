/**
 * Shell of the /next DN-032 preview (mockups 01 and 06): the preview strip,
 * the navy brand header with the six-item navigation, and the footer.
 * Overview, Channels, Clinics and Programmes are real pages and link to each
 * other; each page passes `active` so the nav highlights it. Reports and
 * Admin are <details> buttons that point to the detailed dashboard, so
 * nothing links to a 404. Server component, no JavaScript needed.
 */

export type PreviewSection = 'Overview' | 'Channels' | 'Clinics' | 'Programmes';

/** The four real pages of the preview, in nav order. */
const SECTIONS: { name: PreviewSection; href: string }[] = [
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

export function PreviewShell({ children, active = 'Overview' }: { children: React.ReactNode; active?: PreviewSection }) {
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
          <a className="flex items-center gap-3 text-lg font-bold tracking-[-0.5px] text-white no-underline sm:text-xl" href="/next">
            <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-dn-mint text-[15px] text-dn-navy">DN</span>
            Dental Nation
          </a>
          <a className="text-xs text-[#d9e6eb] underline" href="/?tab=executive">Detailed dashboard</a>
        </div>
        <nav className="relative hidden gap-7 sm:flex" aria-label="Main navigation">
          {SECTIONS.map((s) =>
            s.name === active ? (
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
          <summary className="cursor-pointer py-1 text-xs font-semibold">Navigate · {active}</summary>
          <nav className="relative mt-2 grid grid-cols-3 gap-1.5" aria-label="Mobile navigation">
            {SECTIONS.map((s) =>
              s.name === active ? (
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
