import type { ReactNode } from 'react';

/**
 * Minimal server-side markdown renderer for the internal know-how documents
 * (content/*.md). Supports exactly what those documents use — headings,
 * tables, fenced code blocks, lists (one nesting level), bold, inline code,
 * links, horizontal rules — with the dashboard's typography. Deliberately no
 * external dependency and no raw-HTML passthrough.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  // tokenize: `code`, **bold**, [label](url)
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) {
      out.push(<code key={`${keyBase}-c${i}`} className="rounded bg-panel px-1 py-0.5 text-[11.5px]">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith('**')) {
      out.push(<strong key={`${keyBase}-b${i}`} className="font-semibold text-ink">{tok.slice(2, -2)}</strong>);
    } else {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (mm) {
        out.push(
          <a key={`${keyBase}-a${i}`} href={mm[2]} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-2 hover:underline">
            {mm[1]}
          </a>,
        );
      }
    }
    last = m.index + tok.length;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split('\n');
  const blocks: ReactNode[] = [];
  let k = 0;
  let i = 0;

  const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const isSep = (l: string) => /^\s*\|?\s*:?-{2,}/.test(l) && /-/.test(l) && /^[\s|:\-]+$/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { i += 1; continue; }

    // fenced code
    if (line.trimStart().startsWith('```')) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) { buf.push(lines[i]); i += 1; }
      i += 1;
      blocks.push(
        <pre key={k++} className="my-3 overflow-x-auto rounded-card border border-line bg-panel/40 p-3 text-[11px] leading-relaxed text-ink-soft">
          {buf.join('\n')}
        </pre>,
      );
      continue;
    }

    // horizontal rule
    if (/^---+\s*$/.test(line.trim())) { blocks.push(<hr key={k++} className="my-6 border-line" />); i += 1; continue; }

    // headings
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2];
      const cls =
        level === 1 ? 'mt-2 text-[22px] font-semibold tracking-tight text-ink'
        : level === 2 ? 'mt-8 border-b border-line pb-1.5 text-[17px] font-semibold text-ink'
        : level === 3 ? 'mt-6 text-[14.5px] font-semibold text-ink'
        : 'mt-4 text-[13px] font-semibold text-ink';
      blocks.push(<div key={k++} className={cls}>{inline(text, `h${k}`)}</div>);
      i += 1;
      continue;
    }

    // table
    if (isTableRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const parse = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const header = parse(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) { rows.push(parse(lines[i])); i += 1; }
      blocks.push(
        <div key={k++} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                {header.map((c, ci) => <th key={ci} className="py-1.5 pr-3 text-left font-medium">{inline(c, `th${k}-${ci}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-line/60 align-top">
                  {r.map((c, ci) => <td key={ci} className="py-1.5 pr-3 text-ink-soft">{inline(c, `td${k}-${ri}-${ci}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // lists (unordered/ordered, one nesting level by indentation)
    const li = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      const items: { indent: number; text: string }[] = [];
      while (i < lines.length) {
        const m2 = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (!m2) break;
        items.push({ indent: m2[1].length, text: m2[3] });
        i += 1;
      }
      blocks.push(
        <ul key={k++} className="my-2 space-y-1">
          {items.map((it, ii) => (
            <li key={ii} className={`flex gap-2 text-[12.5px] leading-relaxed text-ink-soft ${it.indent >= 2 ? 'ml-6' : ''}`}>
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
              <span>{inline(it.text, `li${k}-${ii}`)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // paragraph (gather until blank)
    const buf: string[] = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,4})\s/.test(lines[i]) && !lines[i].trimStart().startsWith('```') && !isTableRow(lines[i]) && !/^(\s*)([-*]|\d+\.)\s+/.test(lines[i]) && !/^---+\s*$/.test(lines[i].trim())) {
      buf.push(lines[i]);
      i += 1;
    }
    blocks.push(<p key={k++} className="my-2 text-[12.5px] leading-relaxed text-ink-soft">{inline(buf.join(' '), `p${k}`)}</p>);
  }

  return <div>{blocks}</div>;
}
