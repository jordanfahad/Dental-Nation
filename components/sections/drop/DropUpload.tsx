'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * One drop zone (Finance / Operations). Per file: ask /api/drop for a signed
 * upload URL, PUT the bytes straight to Storage, then confirm so the row
 * appears in the received-files table. Sequential on purpose — clear per-file
 * progress beats parallel speed for a handful of spreadsheets.
 */
export function DropUpload({
  area,
  title,
  owner,
  hint,
}: {
  area: 'finance' | 'operations';
  title: string;
  owner: string;
  hint: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFiles(files: File[]) {
    if (!files.length || busy) return;
    setError(null);
    setDone(null);
    let sent = 0;
    try {
      for (const file of files) {
        setBusy(`Uploading ${file.name} (${sent + 1}/${files.length})…`);
        const meta = { area, filename: file.name, size: file.size, mime: file.type || '' };
        const signRes = await fetch('/api/drop', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ op: 'sign', ...meta }),
        });
        const signed = (await signRes.json()) as { signedUrl?: string; path?: string; error?: string };
        if (!signRes.ok || !signed.signedUrl || !signed.path) throw new Error(signed.error ?? 'Could not start upload.');

        const put = await fetch(signed.signedUrl, {
          method: 'PUT',
          headers: { 'content-type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
          body: file,
        });
        if (!put.ok) throw new Error(`Upload of ${file.name} failed (${put.status}).`);

        const confirmRes = await fetch('/api/drop', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ op: 'confirm', ...meta, path: signed.path, note }),
        });
        const conf = (await confirmRes.json()) as { ok?: boolean; error?: string };
        if (!confirmRes.ok || !conf.ok) throw new Error(conf.error ?? `Could not register ${file.name}.`);
        sent += 1;
      }
      setDone(sent === 1 ? '1 file received — thank you.' : `${sent} files received — thank you.`);
      setNote('');
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : 'Upload failed.'}${sent > 0 ? ` (${sent} file${sent === 1 ? '' : 's'} already went through.)` : ''}`,
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-card border border-line bg-panel/30 p-4">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-[11px] text-ink-faint">{owner}</p>
      <p className="mt-2 text-[11.5px] leading-snug text-ink-soft">{hint}</p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void uploadFiles(Array.from(e.dataTransfer.files));
        }}
        className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-card border border-dashed px-4 py-6 text-center transition ${
          dragOver ? 'border-accent bg-accent/5' : 'border-line bg-card hover:border-accent/60'
        }`}
      >
        <span className="text-[12.5px] font-medium text-ink">
          {busy ?? 'Drop files here, or click to choose'}
        </span>
        <span className="mt-1 text-[10.5px] text-ink-faint">
          Excel, CSV, PDF, exports — anything up to 50 MB per file
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          disabled={Boolean(busy)}
          onChange={(e) => void uploadFiles(Array.from(e.target.files ?? []))}
        />
      </label>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note — what the files cover (e.g. P&L Jan–Aug, by clinic)"
        className="mt-2 w-full rounded-md border border-line bg-card px-3 py-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        disabled={Boolean(busy)}
      />

      {done ? <p className="mt-2 text-[11.5px] font-medium text-good">{done}</p> : null}
      {error ? <p className="mt-2 text-[11.5px] font-medium text-stop">{error}</p> : null}
    </div>
  );
}
