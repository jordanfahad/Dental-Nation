'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';

/**
 * Admin-only Zavis CSV re-ingest control. Drag/drop or pick a file, POST it to
 * /api/crm/upload (admin-gated), and surface the {type, rowsIngested} result or
 * the error. Styled to the existing Card/Button idiom. Rendered only for admins.
 */

const TYPE_LABEL: Record<string, string> = {
  appointments: 'Appointments',
  conversation_summary: 'Conversation summary',
  conversation_traffic: 'Conversation traffic',
};

type Result =
  | { ok: true; type: string; rowsIngested: number }
  | { ok: false; error: string };

export function ZavisUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const pick = (f: File | null) => {
    setFile(f);
    setResult(null);
  };

  const submit = async () => {
    if (!file || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/crm/upload', { method: 'POST', body: form });
      const json = await res.json();
      if (res.ok && json.ok) {
        setResult({ ok: true, type: json.type, rowsIngested: json.rowsIngested });
      } else {
        setResult({ ok: false, error: json.error ?? 'Upload failed.' });
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Network error.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card print-avoid-break no-print">
      <div className="px-5 pt-5">
        <p className="eyebrow">Admin · Re-ingest</p>
        <h2 className="mt-0.5 text-[15px] font-semibold tracking-tight text-ink">
          Upload a fresh Zavis export
        </h2>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
          Drop an appointments, conversation summary, or conversation traffic CSV. The type is
          detected automatically and rows are upserted (existing records update, not duplicate).
        </p>
      </div>

      <div className="px-5 pb-5 pt-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) pick(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-card border border-dashed px-4 py-6 text-center transition-colors',
            dragging ? 'border-accent bg-accent-50' : 'border-line bg-surface hover:border-accent-400',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
          <p className="text-[13px] font-medium text-ink">
            {file ? file.name : 'Drop a CSV here, or click to choose'}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            {file
              ? `${(file.size / 1024).toFixed(1)} KB`
              : 'Zavis appointments / conversation summary / traffic export'}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Button type="button" onClick={submit} disabled={!file || busy}>
            {busy ? 'Uploading…' : 'Upload & ingest'}
          </Button>
          {file ? (
            <button
              type="button"
              onClick={() => pick(null)}
              className="text-[12px] text-ink-faint hover:text-ink-soft"
              disabled={busy}
            >
              Clear
            </button>
          ) : null}
        </div>

        {result ? (
          result.ok ? (
            <div className="mt-3 rounded-md border border-good/30 bg-good/10 px-3 py-2 text-[12.5px] text-good">
              Ingested <span className="font-semibold tabular-nums">{result.rowsIngested}</span> row
              {result.rowsIngested === 1 ? '' : 's'} into{' '}
              <span className="font-semibold">{TYPE_LABEL[result.type] ?? result.type}</span>. Refresh
              to see the updated report.
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-stop/30 bg-stop/10 px-3 py-2 text-[12.5px] text-stop">
              {result.error}
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
