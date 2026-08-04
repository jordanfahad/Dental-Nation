import type { Metadata } from 'next';

/**
 * Standalone layout for the investor viewer (spec §1).
 *
 * Deliberately NOT the ops-dashboard shell: no nav, no tabs, no admin chrome.
 * A board member or investor opening this should not be able to tell there is
 * an internal dashboard behind it — this reads as a prepared document, not a
 * tool someone let them borrow.
 *
 * `noindex` is non-negotiable: these links are forwarded privately and must
 * never reach a search engine.
 */
export const metadata: Metadata = {
  title: 'Dental Nation — How the growth machine works',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
