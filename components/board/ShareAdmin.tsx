'use client';

import { useActionState, useState } from 'react';
import { generateLink, toggleRevoke } from '@/app/reports/board/actions';
import type { ShareLink, ShareScope } from '@/lib/board/shareLinks';

/**
 * Share-link admin (spec §2, §3). One panel per scope, so the board link and
 * the handover link are visibly separate objects — the point being that
 * revoking one never touches the other.
 *
 * Revocation is instant: the public route re-validates the token on every
 * request, so there is no cached page to outlive the revoke.
 */
export function ShareAdmin({
  scope,
  links,
  origin,
  title,
  blurb,
}: {
  scope: ShareScope;
  links: ShareLink[];
  origin: string;
  title: string;
  blurb: string;
}) {
  const [state, action, pending] = useActionState(generateLink, null);
  const [label, setLabel] = useState('');

  const live = links.filter((l) => !l.revoked);

  return (
    <section className="no-print rounded-card border border-line bg-card px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        <span className="text-[11px] text-ink-faint">
          {live.length} live · {links.length} total
        </span>
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">{blurb}</p>

      <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="scope" value={scope} />
        <input
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={
            scope === 'growth'
              ? 'e.g. Board — Q3 2026'
              : scope === 'operations'
                ? 'e.g. Ms Shadi — leadership review'
                : scope === 'room'
                  ? 'e.g. Investor — Fund name'
                  : 'e.g. Mr. Akbar — Aug leave'
          }
          className="min-w-[200px] flex-1 rounded-md border border-line bg-card px-2.5 py-1.5 text-[12.5px] text-ink placeholder:text-ink-ghost"
        />
        {/* Operations links can carry EDIT rights — minted deliberately. */}
        {scope === 'operations' ? (
          <label className="flex min-h-[36px] items-center gap-1.5 rounded-md border border-line bg-card px-2.5 text-[11.5px] text-ink-soft">
            <input type="checkbox" name="can_edit" className="h-3.5 w-3.5" />
            Editor link — can modify the report
          </label>
        ) : null}
        {/* Board links choose their view; a handover link has only one page. */}
        {scope === 'growth' ? (
          <select
            name="view"
            defaultValue="command_deck"
            aria-label="Which view this link opens"
            className="min-h-[36px] rounded-md border border-line bg-card px-2.5 py-1.5 text-[12.5px] text-ink"
          >
            <option value="command_deck">Investor Report — Live Performance Dashboard</option>
            <option value="funnel">Growth report (story)</option>
          </select>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="min-h-[36px] rounded-md border border-accent bg-accent px-3 py-2 text-[12.5px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Generate link'}
        </button>
      </form>
      {state?.error ? <p className="mt-1.5 text-[11.5px] text-stop">{state.error}</p> : null}
      {state?.ok ? <p className="mt-1.5 text-[11.5px] text-good">Link created — copy it below.</p> : null}

      {links.length === 0 ? (
        <p className="mt-3 text-[11.5px] italic text-ink-faint">No links yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {links.map((l) => (
            <LinkRow key={l.id} link={l} url={`${origin}/share/${l.scope}/${l.token}`} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LinkRow({ link, url }: { link: ShareLink; url: string }) {
  const [, revokeAction, revokePending] = useActionState(toggleRevoke, null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  }

  return (
    <li
      className={`rounded-md border px-3 py-2.5 ${
        link.revoked ? 'border-line bg-panel/60' : 'border-line bg-card'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
            <span className="truncate">{link.label || 'Untitled link'}</span>
            {link.canEdit ? (
              <span className="shrink-0 rounded border border-watch/50 bg-watch-50 px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-wide text-watch">
                Editor
              </span>
            ) : null}
            {link.revoked ? (
              <span className="shrink-0 rounded border border-stop/40 bg-stop-50 px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-wide text-stop">
                Revoked
              </span>
            ) : (
              <span className="shrink-0 rounded border border-good/40 bg-good-50 px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-wide text-good">
                Live
              </span>
            )}
          </p>
          <p className="tnum mt-0.5 text-[10.5px] text-ink-faint">
            {link.scope === 'growth' ? (
              <span className="font-medium text-ink-soft">
                {link.view === 'command_deck' ? 'Investor Report' : 'Growth report'} ·{' '}
              </span>
            ) : null}
            {link.viewCount} view{link.viewCount === 1 ? '' : 's'}
            {link.lastViewedAt ? ` · last opened ${new Date(link.lastViewedAt).toLocaleDateString('en-GB')}` : ''}
            {link.createdBy ? ` · created by ${link.createdBy}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={copy}
            disabled={link.revoked}
            className="rounded-md border border-line px-2.5 py-1 text-[11.5px] text-ink-soft transition hover:bg-panel disabled:opacity-40"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`rounded-md border border-line px-2.5 py-1 text-[11.5px] text-ink-soft transition hover:bg-panel ${
              link.revoked ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            Open
          </a>
          <form action={revokeAction}>
            <input type="hidden" name="id" value={link.id} />
            <input type="hidden" name="revoked" value={link.revoked ? 'false' : 'true'} />
            <button
              type="submit"
              disabled={revokePending}
              className={`rounded-md border px-2.5 py-1 text-[11.5px] transition disabled:opacity-50 ${
                link.revoked
                  ? 'border-line text-ink-soft hover:bg-panel'
                  : 'border-stop/40 text-stop hover:bg-stop-50'
              }`}
            >
              {link.revoked ? 'Restore' : 'Revoke'}
            </button>
          </form>
        </div>
      </div>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="tnum mt-2 w-full rounded border border-line bg-panel/50 px-2 py-1 text-[11px] text-ink-faint"
      />
    </li>
  );
}
