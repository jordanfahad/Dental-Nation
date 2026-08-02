import type { Metadata } from 'next';

/**
 * Public share routes (/share/growth/[token], /share/handover/[token]).
 *
 * NO auth cookie is required here — the token IS the credential, validated
 * server-side on every request. Three consequences this layout enforces:
 *
 *  1. `noindex, nofollow, noarchive` — a board link must never reach a search
 *     engine. The root layout already sets noindex; this restates it locally so
 *     the guarantee survives any future change to the root.
 *  2. Read-only by construction — no mutation is reachable from these routes.
 *  3. Mobile-first — board members open these on phones.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-surface">{children}</div>;
}
