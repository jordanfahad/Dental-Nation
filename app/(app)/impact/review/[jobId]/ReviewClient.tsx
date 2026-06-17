"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { applyReviewAction, rejectReviewAction } from "@/app/(app)/impact/review/actions";
import { inputCls } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import type { ActionState } from "@/lib/impact/action-types";
import type { Component, IngestionJob, Project } from "@/lib/impact/types";

const STATUS_OPTS = ["not_started", "in_progress", "blocked", "on_hold", "completed"];

interface NPState {
  include: boolean;
  component_id: string;
  name: string;
  description: string;
  status: string;
  ownership: string;
  target_date: string;
  rationale: string;
  confidence?: number;
  zoho_task_external_ids?: string[];
}
interface FieldAccept {
  accepted: boolean;
  value: string;
}
interface MState {
  include: boolean;
  project_id: string;
  fields: Record<string, FieldAccept>; // status | progress_pct | impact_summary | target_date
  zoho_task_external_ids?: string[];
}
interface TState {
  include: boolean;
  project_ref: string;
  name: string;
  status: string;
  effort_hours: string;
  due_date: string;
}

export function ReviewClient({
  job,
  components,
  projects,
}: {
  job: IngestionJob;
  components: Component[];
  projects: Project[];
}) {
  const ex = job.extracted;
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const [newProjects, setNewProjects] = useState<NPState[]>(
    (ex.new_projects ?? []).map((p) => ({
      include: true,
      component_id: p.component_id ?? "",
      name: p.name ?? "",
      description: p.description ?? "",
      status: p.suggested_status ?? "in_progress",
      ownership: p.ownership ?? "owner",
      target_date: p.suggested_target_date ?? "",
      rationale: p.rationale ?? "",
      confidence: p.confidence,
      zoho_task_external_ids: p.zoho_task_external_ids,
    }))
  );

  const [matched, setMatched] = useState<MState[]>(
    (ex.matched_projects ?? []).map((m) => {
      const fields: Record<string, FieldAccept> = {};
      const u = m.proposed_updates ?? {};
      if (u.status) fields.status = { accepted: true, value: String(u.status) };
      if (u.progress_pct !== undefined) fields.progress_pct = { accepted: true, value: String(u.progress_pct) };
      if (u.impact_summary) fields.impact_summary = { accepted: true, value: String(u.impact_summary) };
      if (u.target_date) fields.target_date = { accepted: true, value: String(u.target_date) };
      return {
        include: true,
        project_id: m.project_id,
        fields,
        zoho_task_external_ids: m.zoho_task_external_ids,
      };
    })
  );

  const [newTasks, setNewTasks] = useState<TState[]>(
    (ex.new_tasks ?? []).map((t) => ({
      include: true,
      project_ref: t.project_ref ?? "",
      name: t.name ?? "",
      status: t.status ?? "open",
      effort_hours: t.effort_hours != null ? String(t.effort_hours) : "",
      due_date: t.due_date ?? "",
    }))
  );

  const [unmapped, setUnmapped] = useState<string[]>(ex.unmapped ?? []);

  const [applyState, applyAction, applying] = useActionState<ActionState, FormData>(applyReviewAction, null);
  const [rejectState, rejectAction, rejecting] = useActionState<ActionState, FormData>(rejectReviewAction, null);

  const alreadyReviewed = job.status !== "pending_review";

  const payload = useMemo(() => {
    return JSON.stringify({
      newProjects: newProjects.map((p) => ({
        include: p.include,
        component_id: p.component_id || null,
        name: p.name,
        description: p.description || null,
        status: p.status,
        ownership: p.ownership,
        target_date: p.target_date || null,
        zoho_task_external_ids: p.zoho_task_external_ids,
      })),
      matched: matched.map((m) => {
        const updates: Record<string, unknown> = {};
        for (const [k, fa] of Object.entries(m.fields)) {
          if (!fa.accepted) continue;
          if (k === "progress_pct") updates[k] = Number(fa.value);
          else updates[k] = fa.value;
        }
        return {
          include: m.include,
          project_id: m.project_id,
          updates,
          zoho_task_external_ids: m.zoho_task_external_ids,
        };
      }),
      newTasks: newTasks.map((t) => ({
        include: t.include,
        project_ref: t.project_ref,
        name: t.name,
        status: t.status || null,
        effort_hours: t.effort_hours ? Number(t.effort_hours) : null,
        due_date: t.due_date || null,
      })),
    });
  }, [newProjects, matched, newTasks]);

  const includedCount =
    newProjects.filter((p) => p.include).length +
    matched.filter((m) => m.include).length +
    newTasks.filter((t) => t.include).length;

  return (
    <div className="mt-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-3">Review &amp; approve</div>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Proposed changes</h1>
      <p className="mt-1 text-sm text-ink-2">
        From <span className="font-medium text-ink">{job.source_type}</span> ·{" "}
        {job.source_ref ?? "—"}. Nothing is written until you approve. Reject leaves the board
        untouched.
      </p>

      {alreadyReviewed && (
        <div className="mt-4 rounded-lg bg-panel px-4 py-3 text-sm text-ink-2">
          This job is already <span className="font-medium text-ink">{job.status}</span>.{" "}
          <Link href="/impact" className="text-accent hover:text-accent-strong">
            Back to the dashboard
          </Link>
          .
        </div>
      )}

      {ex.notes && (
        <div className="mt-4 rounded-lg border border-hairline bg-panel px-4 py-3 text-sm text-ink-2">
          {ex.notes}
        </div>
      )}

      {ex.parse_error && (
        <div className="mt-4 rounded-lg border border-bad/30 bg-bad-weak px-4 py-3 text-sm text-bad">
          <p className="font-medium">Extraction issue</p>
          <p className="mt-1">{ex.parse_error}</p>
          {ex.raw_output && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-ink-2">Show raw model output</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded bg-paper p-2 text-[11px] text-ink-2">
                {ex.raw_output}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* New projects */}
      {newProjects.length > 0 && (
        <Section title="New projects" subtitle="Proposed — set the timeline & ownership, then include or exclude.">
          <div className="space-y-3">
            {newProjects.map((p, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl border p-4",
                  p.include ? "border-hairline bg-paper" : "border-hairline bg-panel opacity-60"
                )}
              >
                <div className="mb-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={p.include}
                      onChange={(e) => upd(setNewProjects, i, { include: e.target.checked })}
                    />
                    Include this project
                  </label>
                  {p.confidence != null && (
                    <span className="text-xs text-ink-3">confidence {Math.round(p.confidence * 100)}%</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Labeled label="Name">
                    <input
                      className={inputCls}
                      value={p.name}
                      onChange={(e) => upd(setNewProjects, i, { name: e.target.value })}
                    />
                  </Labeled>
                  <Labeled label="Function">
                    <select
                      className={inputCls}
                      value={p.component_id}
                      onChange={(e) => upd(setNewProjects, i, { component_id: e.target.value })}
                    >
                      <option value="">— Unassigned —</option>
                      {components.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Labeled>
                  <Labeled label="Status">
                    <select
                      className={inputCls}
                      value={p.status}
                      onChange={(e) => upd(setNewProjects, i, { status: e.target.value })}
                    >
                      {STATUS_OPTS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </Labeled>
                  <Labeled label="Ownership">
                    <select
                      className={inputCls}
                      value={p.ownership}
                      onChange={(e) => upd(setNewProjects, i, { ownership: e.target.value })}
                    >
                      <option value="owner">Owner</option>
                      <option value="collaborator">Collaborator</option>
                    </select>
                  </Labeled>
                  <Labeled label="Target date">
                    <input
                      type="date"
                      className={inputCls}
                      value={p.target_date}
                      onChange={(e) => upd(setNewProjects, i, { target_date: e.target.value })}
                    />
                  </Labeled>
                  {p.zoho_task_external_ids?.length ? (
                    <Labeled label="Zoho tasks">
                      <div className="px-1 py-2 text-xs text-ink-3">
                        {p.zoho_task_external_ids.length} task(s) will be assigned here
                      </div>
                    </Labeled>
                  ) : null}
                </div>
                {p.rationale && <p className="mt-2 text-xs italic text-ink-3">{p.rationale}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Matched updates */}
      {matched.length > 0 && (
        <Section title="Updates to existing projects" subtitle="Accept or reject each field individually.">
          <div className="space-y-3">
            {matched.map((m, i) => {
              const proj = projectById.get(m.project_id);
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border p-4",
                    m.include ? "border-hairline bg-paper" : "border-hairline bg-panel opacity-60"
                  )}
                >
                  <label className="flex items-center gap-2 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={m.include}
                      onChange={(e) => upd(setMatched, i, { include: e.target.checked })}
                    />
                    {proj?.name ?? m.project_id}
                  </label>
                  {m.zoho_task_external_ids?.length ? (
                    <p className="mt-1 text-xs text-ink-3">
                      {m.zoho_task_external_ids.length} Zoho task(s) will be assigned to this project.
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-2">
                    {Object.keys(m.fields).length === 0 && (
                      <p className="text-xs text-ink-3">No field changes — assignment only.</p>
                    )}
                    {Object.entries(m.fields).map(([field, fa]) => {
                      const current = proj ? (proj as unknown as Record<string, unknown>)[field] : undefined;
                      return (
                        <label key={field} className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={fa.accepted}
                            className="mt-1"
                            onChange={(e) =>
                              setMatched((prev) => {
                                const next = [...prev];
                                next[i] = {
                                  ...next[i],
                                  fields: { ...next[i].fields, [field]: { ...fa, accepted: e.target.checked } },
                                };
                                return next;
                              })
                            }
                          />
                          <span className="text-ink-2">
                            <span className="font-medium text-ink">{field.replace("_", " ")}:</span>{" "}
                            <span className="text-ink-3 line-through">{String(current ?? "—")}</span>{" "}
                            <span aria-hidden>→</span>{" "}
                            <span className="text-ink">{fa.value}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* New tasks */}
      {newTasks.length > 0 && (
        <Section title="New tasks">
          <div className="space-y-2">
            {newTasks.map((t, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-lg border p-3",
                  t.include ? "border-hairline bg-paper" : "border-hairline bg-panel opacity-60"
                )}
              >
                <input
                  type="checkbox"
                  checked={t.include}
                  onChange={(e) => upd(setNewTasks, i, { include: e.target.checked })}
                />
                <input
                  className={cn(inputCls, "flex-1")}
                  value={t.name}
                  onChange={(e) => upd(setNewTasks, i, { name: e.target.value })}
                />
                <input
                  className={cn(inputCls, "w-44")}
                  value={t.project_ref}
                  placeholder="project (id or new name)"
                  onChange={(e) => upd(setNewTasks, i, { project_ref: e.target.value })}
                />
                <input
                  type="date"
                  className={cn(inputCls, "w-40")}
                  value={t.due_date}
                  onChange={(e) => upd(setNewTasks, i, { due_date: e.target.value })}
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Unmapped */}
      {unmapped.length > 0 && (
        <Section title="Unmapped" subtitle="Nothing here is dropped silently — convert to a project or leave it.">
          <ul className="space-y-2">
            {unmapped.map((u, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-hairline p-3 text-sm">
                <span className="text-ink-2">{u}</span>
                <button
                  onClick={() => {
                    setNewProjects((prev) => [
                      ...prev,
                      {
                        include: true,
                        component_id: "",
                        name: u.slice(0, 80),
                        description: "Converted from an unmapped item",
                        status: "not_started",
                        ownership: "owner",
                        target_date: "",
                        rationale: "",
                      },
                    ]);
                    setUnmapped((prev) => prev.filter((_, j) => j !== i));
                  }}
                  className="shrink-0 rounded-md border border-hairline-strong px-2 py-1 text-xs text-ink-2 hover:bg-panel"
                >
                  Add as project
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(applyState?.error || rejectState?.error) && (
        <p className="mt-4 rounded-md bg-bad-weak px-3 py-2 text-sm text-bad">
          {applyState?.error || rejectState?.error}
        </p>
      )}

      {/* Actions — the gate */}
      {!alreadyReviewed && (
        <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t border-hairline bg-paper/95 py-4 backdrop-blur">
          <form action={rejectAction}>
            <input type="hidden" name="jobId" value={job.id} />
            <button
              type="submit"
              disabled={rejecting || applying}
              className="rounded-lg border border-hairline-strong px-3.5 py-2 text-sm font-medium text-ink-2 hover:bg-panel disabled:opacity-50"
            >
              {rejecting ? "Rejecting…" : "Reject (writes nothing)"}
            </button>
          </form>
          <form action={applyAction}>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="payload" value={payload} />
            <button
              type="submit"
              disabled={applying || rejecting || includedCount === 0}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
            >
              {applying ? "Applying…" : `Approve selected (${includedCount})`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function upd<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, i: number, patch: Partial<T>) {
  setter((prev) => {
    const next = [...prev];
    next[i] = { ...next[i], ...patch };
    return next;
  });
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mb-3 mt-0.5 text-xs text-ink-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}
