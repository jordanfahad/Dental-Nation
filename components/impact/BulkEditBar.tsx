"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Export every project/task to an editable .xlsx, or re-import an edited one.
 * Import POSTs the file, then sends the manager to the bulk-edit review screen
 * to confirm the diff — nothing is written until they approve it there.
 */
export function BulkEditBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = ""; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/impact/import", { method: "POST", body: fd });
      const json = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !json.jobId) {
        setErr(json.error ?? "Import failed.");
        setBusy(false);
        return;
      }
      router.push(`/impact/review/${json.jobId}`);
    } catch {
      setErr("Import failed — please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <a
        href="/api/impact/export"
        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline-strong px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-panel"
      >
        ↓ Export Excel
      </a>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline-strong px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-panel disabled:opacity-50"
      >
        {busy ? "Uploading…" : "↑ Import edits"}
      </button>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={onFile} />
      {err && <span className="max-w-xs text-xs text-bad">{err}</span>}
    </div>
  );
}
