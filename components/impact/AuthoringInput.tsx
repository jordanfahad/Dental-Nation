"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { inputCls } from "@/components/ui/field";

const ACCEPT = ".pdf,.xlsx,.xls,.csv,.html,.htm,.docx,.txt,.md";

/**
 * The §4 authoring input — exactly two ways in: a text box, and a drop zone.
 * Submitting either runs /api/ingest and lands on the review screen (the one
 * human gate). Nothing is written to projects/tasks here.
 */
export function AuthoringInput({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function submit() {
    setErr(null);
    if (!file && !text.trim()) {
      setErr("Paste some text or drop a file to ingest.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      if (text.trim()) fd.append("text", text.trim());
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Ingestion failed (${res.status})`);
      }
      const j = await res.json();
      onClose();
      router.push(`/impact/review/${j.jobId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ingestion failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1 block text-xs font-medium text-ink-2">Paste an update or report</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className={inputCls}
          placeholder="Paste a status note, a chunk of a SalesTrig / AutoSEO report, or any text…"
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragOver ? "border-accent bg-accent-weak" : "border-hairline-strong hover:bg-panel"
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="text-sm font-medium text-ink">{file.name}</div>
        ) : (
          <>
            <div className="text-sm font-medium text-ink">Drop a file, or click to browse</div>
            <div className="mt-1 text-xs text-ink-3">PDF · Excel/CSV · HTML report · Zoho export</div>
          </>
        )}
      </div>

      {err && <p className="rounded-md bg-bad-weak px-3 py-2 text-sm text-bad">{err}</p>}

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ink-3">
          Goes to a review screen — nothing changes until you approve.
        </p>
        <button
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          {busy ? "Analyzing…" : "Analyze & review"}
        </button>
      </div>
    </div>
  );
}
