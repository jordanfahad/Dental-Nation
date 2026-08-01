'use client';

import { useState } from 'react';
import { ActionForm } from '@/components/forms/ActionForm';
import { saveSnapshot, addApproval, saveEffort, saveCost, decideApproval } from './actions';

/**
 * Phase-1 manual entry (admin only) — the spec's "weekly manual snapshot entry
 * via admin form": KPI snapshots, approval-queue items, effort hours, vendor
 * costs. Deliberately small and boring; Phases 2/3 replace the typing with
 * API feeds, not this surface.
 */

const input =
  'w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none';
const label = 'block text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint';

function Field({ name, title, type = 'text', placeholder, required, defaultValue }: {
  name: string; title: string; type?: string; placeholder?: string; required?: boolean; defaultValue?: string;
}) {
  return (
    <div>
      <label className={label} htmlFor={`mos-${name}`}>{title}</label>
      <input id={`mos-${name}`} name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} className={`mt-1 ${input}`} step={type === 'number' ? 'any' : undefined} />
    </div>
  );
}

export function WeeklyEntryForms({ kpiOptions }: { kpiOptions: { slug: string; label: string }[] }) {
  const [open, setOpen] = useState<string | null>('snapshot');
  const tab = (key: string, title: string) => (
    <button
      type="button"
      onClick={() => setOpen(open === key ? null : key)}
      className={`rounded-full border px-3 py-1 text-[11.5px] font-medium transition ${
        open === key ? 'border-accent bg-accent text-white' : 'border-line bg-card text-ink-soft hover:text-ink'
      }`}
    >
      {title}
    </button>
  );

  return (
    <div className="px-5 pb-5">
      <div className="flex flex-wrap gap-1.5">{tab('snapshot', 'KPI snapshot')}{tab('approval', 'Queue item')}{tab('effort', 'Effort week')}{tab('cost', 'Cost month')}</div>

      {open === 'snapshot' ? (
        <ActionForm action={saveSnapshot} submitLabel="Save snapshot" className="mt-4 max-w-[560px] space-y-3">
          <div>
            <label className={label} htmlFor="mos-kpi">KPI</label>
            <select id="mos-kpi" name="kpi_slug" className={`mt-1 ${input}`} required>
              {kpiOptions.map((k) => (
                <option key={k.slug} value={k.slug}>{k.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[10.5px] text-ink-faint">Percentages as decimals: 55% → 0.55.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field name="date" title="Date" type="date" required />
            <Field name="value" title="Value" type="number" required />
          </div>
          <Field name="note" title="Note / provenance" placeholder="e.g. from Zavis weekly report" />
        </ActionForm>
      ) : null}

      {open === 'approval' ? (
        <ActionForm action={addApproval} submitLabel="Add to queue" className="mt-4 max-w-[560px] space-y-3">
          <Field name="title" title="Item title" required placeholder="e.g. Protocols run — implant aftercare guide" />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label} htmlFor="mos-track">Track</label>
              <select id="mos-track" name="track" className={`mt-1 ${input}`}>
                <option value="seo">SEO (3bd)</option>
                <option value="clinical">Clinical (5bd)</option>
              </select>
            </div>
            <Field name="gate" title="Gate" placeholder="Gate 4 — Approve + schedule" />
            <Field name="submitted_at" title="Submitted" type="date" required />
          </div>
          <Field name="url" title="Item URL" placeholder="https://…" />
          <Field name="note" title="Note" />
        </ActionForm>
      ) : null}

      {open === 'effort' ? (
        <ActionForm action={saveEffort} submitLabel="Save week" className="mt-4 max-w-[560px] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field name="week_start" title="Week start (Mon)" type="date" required />
            <Field name="loaded_rate" title="Loaded rate (AED/h)" type="number" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field name="hours_meetings" title="Meeting hours" type="number" />
            <Field name="hours_reviews" title="Review hours" type="number" />
            <Field name="hours_qa" title="QA hours" type="number" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field name="rework_items" title="Items sent back" type="number" />
            <Field name="total_items" title="Items handled" type="number" />
          </div>
        </ActionForm>
      ) : null}

      {open === 'cost' ? (
        <ActionForm action={saveCost} submitLabel="Save month" className="mt-4 max-w-[560px] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field name="month" title="Month" type="date" required />
            <Field name="zavis_fee" title="Zavis fee (AED)" type="number" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field name="azure_cost" title="Azure (AED)" type="number" />
            <Field name="other" title="Other (AED)" type="number" />
          </div>
          <Field name="note" title="Note" />
        </ActionForm>
      ) : null}
    </div>
  );
}

/** Inline decision controls on one approval row (admin only). */
export function ApprovalDecide({ id, track, reviewer, status }: {
  id: number; track: 'seo' | 'clinical'; reviewer: string | null; status: string;
}) {
  const [decision, setDecision] = useState('');
  return (
    <ActionForm action={decideApproval} submitLabel="Apply" className="flex flex-wrap items-end gap-2 space-y-0" hidden={{ id: String(id) }}>
      <div>
        <label className={label} htmlFor={`dec-${id}`}>Decision</label>
        <select id={`dec-${id}`} name="decision" value={decision} onChange={(e) => setDecision(e.target.value)} className={`mt-1 ${input} w-[130px]`}>
          <option value="">— no change —</option>
          {status !== 'pending' ? <option value="pending">Reopen</option> : null}
          <option value="approved">Approve</option>
          <option value="rejected">Reject</option>
          <option value="published">Published</option>
        </select>
      </div>
      <div>
        <label className={label} htmlFor={`trk-${id}`}>Track</label>
        <select id={`trk-${id}`} name="track" defaultValue={track} className={`mt-1 ${input} w-[110px]`}>
          <option value="seo">SEO</option>
          <option value="clinical">Clinical</option>
        </select>
      </div>
      <div className="grow">
        <label className={label} htmlFor={`rev-${id}`}>Reviewer (named — required for clinical)</label>
        <input id={`rev-${id}`} name="reviewer" defaultValue={reviewer ?? ''} placeholder="Dr …" className={`mt-1 ${input}`} />
      </div>
    </ActionForm>
  );
}
