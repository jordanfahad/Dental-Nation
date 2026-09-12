'use client';

/**
 * Interactive operating-model explorer (/Fahad-know-how/operating-model).
 * Implements the build spec in section 9 of the source document:
 * five tabs (Structure · Interactions · Cadence · Scenarios · Decisions),
 * clickable org-chart nodes opening the full department profile, a
 * step-through scenario player, and — the point of the page — a global
 * Retail ⇄ Dental toggle that relabels the entire model into Dental Nation
 * terms so the read-across can be seen live, not just read about.
 * All content comes from data/operating-model.ts.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  CADENCE, DEPTS, INTERACTIONS, PRINCIPLES, RACI, SCENARIOS, deptById,
  type Dept,
} from '@/data/operating-model';

const NAVY = '#244260';
const BLUE = '#5793A3';
const GOLD = '#E1C96E';
const CORAL = '#B45F53';
const OLIVE = '#767769';
const LINE = '#D8D8CC';

type Mode = 'retail' | 'dental';
type Tab = 'structure' | 'interactions' | 'cadence' | 'scenarios' | 'decisions';

const SHORT: Record<string, { retail: string; dental: string }> = {
  vp: { retail: 'VP', dental: 'CEO / COO' },
  buying: { retail: 'Buying', dental: 'Clinical' },
  planning: { retail: 'Planning', dental: 'Capacity' },
  marketing: { retail: 'Marketing', dental: 'Growth' },
  trading: { retail: 'Trading', dental: 'Rev Mgmt' },
  content: { retail: 'Content', dental: 'Education' },
  development: { retail: 'Development', dental: 'Systems' },
  finance: { retail: 'Finance', dental: 'Finance' },
  retail_ops: { retail: 'Retail Ops', dental: 'Clinic Ops' },
};

function fullName(id: string, mode: Mode) {
  const d = deptById(id);
  if (!d) return id;
  return mode === 'dental' ? d.dental.name : d.name;
}
function shortName(id: string, mode: Mode) {
  return SHORT[id] ? SHORT[id][mode] : id;
}
function subunitLabel(su: { name: string; owns: string }, mode: Mode) {
  // retail_ops subunits carry their dental twin after "→" inside owns
  if (mode === 'dental' && su.owns.includes('→')) {
    const [head, tail] = su.owns.split('→').map((s) => s.trim());
    return { name: tail, owns: head };
  }
  return { name: su.name, owns: su.owns.split('→')[0].trim() };
}

/* ── shared atoms ──────────────────────────────────────────────── */

function DeptChip({ id, mode, onJump, active }: { id: string; mode: Mode; onJump?: (id: string) => void; active?: boolean }) {
  const d = deptById(id);
  const tone =
    !d ? { bg: 'white', bd: LINE, tx: OLIVE }
    : d.group === 'leadership' ? { bg: NAVY, bd: NAVY, tx: 'white' }
    : d.group === 'enabling' ? { bg: '#EEF4F6', bd: BLUE, tx: NAVY }
    : d.group === 'retail_ops' ? { bg: '#FDF9EC', bd: GOLD, tx: '#6d5a1d' }
    : { bg: 'white', bd: NAVY, tx: NAVY };
  return (
    <button
      type="button"
      onClick={onJump ? () => onJump(id) : undefined}
      className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold transition ${onJump ? 'cursor-pointer hover:opacity-75' : 'cursor-default'}`}
      style={{ backgroundColor: tone.bg, borderColor: active ? CORAL : tone.bd, color: tone.tx, boxShadow: active ? `0 0 0 2px ${CORAL}55` : undefined }}
    >
      {shortName(id, mode)}
    </button>
  );
}

function Tag({ children, color = BLUE }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="rounded border px-1.5 py-0.5 text-[9.5px] font-medium" style={{ borderColor: `${color}66`, color, backgroundColor: `${color}0d` }}>
      {children}
    </span>
  );
}

/* ── org chart node ────────────────────────────────────────────── */

function Node({ d, mode, selected, onSelect }: { d: Dept; mode: Mode; selected: boolean; onSelect: (id: string) => void }) {
  const tone =
    d.group === 'leadership' ? { bg: NAVY, tx: 'white', sub: '#ffffffb3', bd: NAVY }
    : d.group === 'enabling' ? { bg: '#EEF4F6', tx: NAVY, sub: OLIVE, bd: BLUE }
    : d.group === 'retail_ops' ? { bg: '#FDF9EC', tx: '#6d5a1d', sub: OLIVE, bd: GOLD }
    : { bg: 'white', tx: NAVY, sub: OLIVE, bd: NAVY };
  const owns = mode === 'dental' ? d.dental.owns : d.owns.slice(0, 2).join(' · ');
  return (
    <button
      type="button"
      onClick={() => onSelect(d.id)}
      className={`w-full rounded-lg border-2 px-3 py-2 text-left transition hover:-translate-y-0.5 ${d.dotted ? 'border-dashed' : ''}`}
      style={{
        backgroundColor: tone.bg,
        borderColor: selected ? CORAL : tone.bd,
        boxShadow: selected ? `0 0 0 3px ${CORAL}44` : '0 1px 2px rgba(36,66,96,.08)',
      }}
    >
      <p className="text-[12px] font-bold leading-tight" style={{ color: tone.tx }}>{mode === 'dental' ? d.dental.name : d.name}</p>
      <p className="mt-0.5 line-clamp-2 text-[9.5px] leading-tight" style={{ color: tone.sub }}>{owns}</p>
    </button>
  );
}

/* ── department profile sheet ──────────────────────────────────── */

function Profile({ id, mode, onJump }: { id: string; mode: Mode; onJump: (id: string) => void }) {
  const d = deptById(id);
  if (!d) return null;
  return (
    <div className="mt-3 rounded-xl border-2 bg-white p-4" style={{ borderColor: NAVY }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[15px] font-bold" style={{ color: NAVY }}>{mode === 'dental' ? d.dental.name : d.name}</p>
          <p className="text-[10.5px]" style={{ color: OLIVE }}>
            {mode === 'dental' ? <>retail reference: <span className="font-semibold">{d.name}</span></> : <>Dental Nation twin: <span className="font-semibold">{d.dental.name}</span></>}
            {d.dotted ? ' · dotted line to Group Retail' : ''}
          </p>
        </div>
        <Tag color={CORAL}>{d.group === 'leadership' ? 'P&L owner' : d.group === 'enabling' ? 'enabling function' : d.group === 'retail_ops' ? 'stores / clinics' : 'commercial function'}</Tag>
      </div>
      <p className="mt-2 rounded-lg px-3 py-2 text-[12px] font-medium leading-snug" style={{ backgroundColor: '#EEF4F6', color: NAVY }}>{d.mandate}</p>
      {mode === 'dental' && (
        <p className="mt-1.5 text-[11px] leading-snug" style={{ color: '#6d5a1d' }}>
          <span className="font-bold">In Dental Nation this owns:</span> {d.dental.owns}
        </p>
      )}
      {d.subunits && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {d.subunits.map((su) => {
            const s = subunitLabel(su, mode);
            return (
              <span key={su.name} className="rounded border px-2 py-1 text-[10px]" style={{ borderColor: LINE, color: OLIVE }}>
                <span className="font-bold" style={{ color: NAVY }}>{s.name}</span> · {s.owns}
              </span>
            );
          })}
        </div>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>Receives ← click to visit the sender</p>
          <div className="mt-1 space-y-1">
            {d.inputs.map((x) => (
              <div key={x.item} className="flex flex-wrap items-center gap-1.5 text-[11px]" style={{ color: '#3a4148' }}>
                <DeptChip id={x.from} mode={mode} onJump={onJump} /> <span>{x.item}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: CORAL }}>Sends → click to visit the receiver</p>
          <div className="mt-1 space-y-1">
            {d.outputs.map((x) => (
              <div key={x.item} className="flex flex-wrap items-center gap-1.5 text-[11px]" style={{ color: '#3a4148' }}>
                <span>{x.item}</span> <DeptChip id={x.to} mode={mode} onJump={onJump} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>Measured on</p>
        <div className="mt-1 flex flex-wrap gap-1">{d.kpis.map((k) => <Tag key={k} color={NAVY}>{k}</Tag>)}</div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {([['Talks to daily', d.talks.daily], ['Weekly', d.talks.weekly], ['Monthly', d.talks.monthly]] as [string, string[]][]).map(([label, ids]) => (
          <div key={label}>
            <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: OLIVE }}>{label}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {ids.length ? ids.map((x) => <DeptChip key={x} id={x} mode={mode} onJump={onJump} />) : <span className="text-[10px]" style={{ color: OLIVE }}>—</span>}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-lg border-l-4 px-3 py-2 text-[11px] leading-snug" style={{ borderColor: CORAL, backgroundColor: '#FBF3F1', color: '#3a4148' }}>
        <span className="font-bold" style={{ color: CORAL }}>Escalation rule · </span>{d.escalation}
      </p>
    </div>
  );
}

/* ── structure tab ─────────────────────────────────────────────── */

function StructureTab({ mode, sel, setSel }: { mode: Mode; sel: string | null; setSel: (id: string | null) => void }) {
  const row = (ids: string[]) => ids.map((id) => deptById(id)!);
  return (
    <div>
      <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
        Click any box to open its full profile — mandate, what it receives and sends, KPIs, meeting rhythm and its escalation rule.
        The chips inside a profile jump you around the organisation the way work actually flows.
      </p>
      <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
        <div className="mx-auto max-w-[360px]">
          <Node d={deptById('vp')!} mode={mode} selected={sel === 'vp'} onSelect={(i) => setSel(sel === i ? null : i)} />
        </div>
        <div className="mx-auto h-4 w-px" style={{ backgroundColor: NAVY }} />
        <div className="mx-auto h-px w-[94%]" style={{ backgroundColor: NAVY }} />
        <p className="mb-1 mt-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>Commercial engine — revenue vs margin held by different people</p>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {row(['buying', 'planning', 'marketing', 'trading']).map((d) => (
            <Node key={d.id} d={d} mode={mode} selected={sel === d.id} onSelect={(i) => setSel(sel === i ? null : i)} />
          ))}
        </div>
        <p className="mb-1 mt-3 text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>Enabling functions — nothing sells without them</p>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {row(['content', 'development', 'finance']).map((d) => (
            <Node key={d.id} d={d} mode={mode} selected={sel === d.id} onSelect={(i) => setSel(sel === i ? null : i)} />
          ))}
        </div>
        <p className="mb-1 mt-3 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6d5a1d' }}>
          {mode === 'dental' ? 'The clinics — a channel and a delivery node, inside the model' : 'The stores — a channel and a fulfilment node, dotted line to Group Retail'}
        </p>
        <Node d={deptById('retail_ops')!} mode={mode} selected={sel === 'retail_ops'} onSelect={(i) => setSel(sel === i ? null : i)} />
      </div>
      {sel && <Profile id={sel} mode={mode} onJump={(i) => setSel(i)} />}
      {!sel && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {PRINCIPLES.map((p, i) => (
            <div key={p.title} className="rounded-lg border bg-white px-3 py-2" style={{ borderColor: i === 1 ? CORAL : LINE }}>
              <p className="text-[11px] font-bold" style={{ color: i === 1 ? CORAL : NAVY }}>{i + 1}. {p.title}</p>
              <p className="text-[10.5px] leading-snug" style={{ color: OLIVE }}>{p.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── interactions tab ──────────────────────────────────────────── */

function InteractionsTab({ mode }: { mode: Mode }) {
  const [dept, setDept] = useState<string>('');
  const rows = useMemo(
    () => (dept ? INTERACTIONS.filter((r) => r.from === dept || r.to === dept) : INTERACTIONS),
    [dept],
  );
  return (
    <div>
      <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
        Every hand-off in the model has a named artefact and a cadence — nothing moves on a verbal promise. Filter by department to see
        everything one team owes and is owed.
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setDept('')} className="rounded-full border px-2.5 py-1 text-[10.5px] font-semibold" style={dept === '' ? { backgroundColor: NAVY, borderColor: NAVY, color: 'white' } : { borderColor: LINE, color: OLIVE }}>
          All ({INTERACTIONS.length})
        </button>
        {DEPTS.map((d) => (
          <button key={d.id} type="button" onClick={() => setDept(dept === d.id ? '' : d.id)} className="rounded-full border px-2.5 py-1 text-[10.5px] font-semibold" style={dept === d.id ? { backgroundColor: NAVY, borderColor: NAVY, color: 'white' } : { borderColor: LINE, color: OLIVE }}>
            {shortName(d.id, mode)}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
              <th className="px-3 py-2 font-bold">From</th><th className="px-3 py-2 font-bold">To</th>
              <th className="px-3 py-2 font-bold">What moves</th><th className="px-3 py-2 font-bold">Artefact</th><th className="px-3 py-2 font-bold">Cadence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                <td className="px-3 py-1.5"><DeptChip id={r.from} mode={mode} active={dept === r.from} /></td>
                <td className="px-3 py-1.5"><DeptChip id={r.to} mode={mode} active={dept === r.to} /></td>
                <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>{r.what}</td>
                <td className="px-3 py-1.5 font-medium" style={{ color: NAVY }}>{r.artefact}</td>
                <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: OLIVE }}>{r.cadence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── cadence tab ───────────────────────────────────────────────── */

function CadenceTab({ mode }: { mode: Mode }) {
  const [open, setOpen] = useState<string>('Trade meeting (60 min)');
  return (
    <div>
      <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
        Fixed forums, named owners, written decisions. The Monday trade meeting is THE meeting — one report, every head in the room,
        decisions logged. Click a forum to see who attends, what pack it runs on and what gets decided.
      </p>
      <div className="grid gap-2 md:grid-cols-3">
        {CADENCE.map((c) => {
          const isOpen = open === c.forum;
          return (
            <button
              key={`${c.when}-${c.forum}`} type="button" onClick={() => setOpen(isOpen ? '' : c.forum)}
              className="rounded-xl border-2 bg-white p-3 text-left transition hover:-translate-y-0.5"
              style={{ borderColor: c.key ? NAVY : isOpen ? BLUE : LINE, boxShadow: c.key ? `0 0 0 3px ${GOLD}55` : undefined }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[10px] font-bold tracking-wide" style={{ color: c.key ? CORAL : BLUE }}>{c.when}</p>
                {c.key && <Tag color={CORAL}>THE meeting</Tag>}
              </div>
              <p className="text-[12.5px] font-bold leading-tight" style={{ color: NAVY }}>{c.forum}</p>
              <p className="text-[9.5px]" style={{ color: OLIVE }}>owner: {c.owner}</p>
              {isOpen && (
                <div className="mt-2 space-y-1.5 border-t pt-2 text-[10.5px] leading-snug" style={{ borderColor: '#EEEFE1', color: '#3a4148' }}>
                  <p><span className="font-bold" style={{ color: BLUE }}>In the room · </span>{c.attendees}</p>
                  <p><span className="font-bold" style={{ color: BLUE }}>Runs on · </span>{c.pack}</p>
                  <p><span className="font-bold" style={{ color: CORAL }}>Decides · </span>{c.decisions}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FDF9EC', color: '#6d5a1d' }}>
        {mode === 'dental'
          ? 'Dental Nation translation: same skeleton — daily 9:00 flash on yesterday’s revenue and bookings, one Monday meeting on one report (chair utilisation, plan conversion, campaign results), Friday flash to the CEO. Anything undecided reaches the CEO within 24 hours with a one-page brief from each side.'
          : 'Anything undecided in its forum reaches the VP within 24 hours with a one-page brief from each side.'}
      </p>
    </div>
  );
}

/* ── scenario player ───────────────────────────────────────────── */

function ScenariosTab({ mode }: { mode: Mode }) {
  const [sid, setSid] = useState(SCENARIOS[0].id);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const sc = SCENARIOS.find((s) => s.id === sid)!;

  useEffect(() => { setIdx(0); setPlaying(false); }, [sid]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= sc.steps.length - 1) { setPlaying(false); return i; }
        return i + 1;
      });
    }, 2200);
    return () => clearInterval(t);
  }, [playing, sc.steps.length]);

  const active = sc.steps[idx];
  return (
    <div>
      <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
        Seven day-in-the-life scenarios. Press play (or step through) and watch the baton pass between departments —
        who acts, with what artefact, on what clock.
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SCENARIOS.map((s) => (
          <button key={s.id} type="button" onClick={() => setSid(s.id)} className="rounded-full border px-2.5 py-1 text-[10.5px] font-semibold" style={sid === s.id ? { backgroundColor: NAVY, borderColor: NAVY, color: 'white' } : { borderColor: LINE, color: OLIVE }}>
            {s.title}
          </button>
        ))}
      </div>
      <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
        <p className="text-[13px] font-bold" style={{ color: NAVY }}>{sc.title}</p>
        <p className="text-[11px] leading-snug" style={{ color: OLIVE }}>{sc.summary}</p>

        {/* baton strip */}
        <div className="mt-3 flex flex-wrap gap-1">
          {DEPTS.map((d) => (
            <DeptChip key={d.id} id={d.id} mode={mode} active={active.dept === d.id} />
          ))}
        </div>

        {/* controls + progress */}
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={() => { setPlaying(false); setIdx(Math.max(0, idx - 1)); }} className="rounded-md border px-3 py-1 text-[11px] font-bold" style={{ borderColor: NAVY, color: NAVY }}>← Prev</button>
          <button type="button" onClick={() => setPlaying(!playing)} className="rounded-md px-3 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: playing ? CORAL : NAVY }}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button type="button" onClick={() => { setPlaying(false); setIdx(Math.min(sc.steps.length - 1, idx + 1)); }} className="rounded-md border px-3 py-1 text-[11px] font-bold" style={{ borderColor: NAVY, color: NAVY }}>Next →</button>
          <div className="ml-2 h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: '#EEEFE1' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((idx + 1) / sc.steps.length) * 100}%`, backgroundColor: GOLD }} />
          </div>
          <span className="text-[10px] font-bold" style={{ color: OLIVE }}>{idx + 1}/{sc.steps.length}</span>
        </div>

        {/* steps */}
        <div className="mt-3 space-y-1.5">
          {sc.steps.map((st, i) => {
            const on = i === idx;
            const d = deptById(st.dept);
            const dot =
              d?.group === 'leadership' ? NAVY : d?.group === 'enabling' ? BLUE : d?.group === 'retail_ops' ? GOLD : CORAL;
            return (
              <button
                key={st.n} type="button" onClick={() => { setPlaying(false); setIdx(i); }}
                className="flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition"
                style={{
                  borderColor: on ? CORAL : '#EEEFE1',
                  backgroundColor: on ? '#FBF3F1' : 'white',
                  opacity: on ? 1 : 0.75,
                  transform: on ? 'scale(1.01)' : undefined,
                }}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold text-white" style={{ backgroundColor: dot }}>{st.n}</span>
                <span className="min-w-0 flex-1">
                  <span className="mr-1.5 text-[10.5px] font-bold" style={{ color: NAVY }}>{fullName(st.dept, mode)}</span>
                  <span className="text-[11px]" style={{ color: '#3a4148' }}>{st.action}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <Tag color={BLUE}>{st.artefact}</Tag>
                    <Tag color={OLIVE}>{st.timing}</Tag>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── decisions (RACI + read-across) tab ────────────────────────── */

const RACI_COLS = ['vp', 'buying', 'planning', 'marketing', 'trading', 'content', 'development', 'finance', 'retail_ops'];

function roleTone(v: string) {
  if (v.includes('A')) return { bg: GOLD, tx: '#5a4a10' };
  if (v.includes('R')) return { bg: NAVY, tx: 'white' };
  if (v.includes('esc')) return { bg: CORAL, tx: 'white' };
  if (v === 'C') return { bg: '#EEF4F6', tx: NAVY };
  return { bg: '#F1F1EA', tx: OLIVE };
}

function DecisionsTab({ mode }: { mode: Mode }) {
  return (
    <div>
      <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
        Who decides what — <span className="font-bold" style={{ color: '#5a4a10' }}>A</span> is accountable (one name, always),{' '}
        <span className="font-bold" style={{ color: NAVY }}>R</span> does the work, C is consulted, I is informed. Flip the toggle above
        and the same governance reads as a dental group.
      </p>
      <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
        <table className="w-full border-collapse text-[10.5px]">
          <thead>
            <tr style={{ backgroundColor: '#F7F7F0' }}>
              <th className="px-3 py-2 text-left text-[9.5px] font-bold uppercase tracking-wide" style={{ color: OLIVE }}>Decision</th>
              {RACI_COLS.map((c) => (
                <th key={c} className="px-2 py-2 text-center text-[9px] font-bold" style={{ color: NAVY }}>{shortName(c, mode)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RACI.map((r) => (
              <tr key={r.decision} className="border-t" style={{ borderColor: '#EEEFE1' }}>
                <td className="px-3 py-1.5 font-semibold" style={{ color: NAVY }}>{r.decision}</td>
                {RACI_COLS.map((c) => {
                  const v = r.roles[c];
                  if (!v) return <td key={c} className="px-2 py-1.5 text-center" style={{ color: '#C9C9BC' }}>·</td>;
                  const t = roleTone(v);
                  return (
                    <td key={c} className="px-2 py-1.5 text-center">
                      <span className="inline-block min-w-[24px] rounded px-1 py-0.5 text-[9.5px] font-bold" style={{ backgroundColor: t.bg, color: t.tx }}>{v}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mb-1 mt-5 text-[13px] font-bold" style={{ color: NAVY }}>The read-across — every retail function has a dental twin</h3>
      <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
        <div className="grid gap-1.5">
          {DEPTS.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 border-b pb-1.5 last:border-0" style={{ borderColor: '#EEEFE1' }}>
              <span className="w-[210px] shrink-0 text-[11.5px] font-medium" style={{ color: OLIVE }}>{d.name}</span>
              <span style={{ color: BLUE }}>→</span>
              <span className="text-[11.5px] font-bold" style={{ color: NAVY }}>{d.dental.name}</span>
              <span className="min-w-0 flex-1 text-[10px]" style={{ color: OLIVE }}>· {d.dental.owns}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FDF9EC', color: '#6d5a1d' }}>
          The two transfers that matter most: separate demand generation (Growth) from pricing &amp; offer governance
          (Revenue management), and run one weekly meeting on one report.
        </p>
      </div>
    </div>
  );
}

/* ── the app ───────────────────────────────────────────────────── */

const TABS: { id: Tab; label: string }[] = [
  { id: 'structure', label: 'Structure' },
  { id: 'interactions', label: 'Hand-offs' },
  { id: 'cadence', label: 'Cadence' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'decisions', label: 'Decisions & read-across' },
];

export function OperatingModelApp() {
  const [mode, setMode] = useState<Mode>('retail');
  const [tab, setTab] = useState<Tab>('structure');
  const [sel, setSel] = useState<string | null>(null);

  return (
    <div>
      {/* view-as toggle — the point of the page */}
      <div className="rounded-xl border-2 p-3" style={{ borderColor: GOLD, backgroundColor: '#FDF9EC' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold leading-snug" style={{ color: '#6d5a1d' }}>
            One operating model, two businesses. Flip the view and every department, hand-off and decision
            relabels into Dental Nation terms — that is the replication.
          </p>
          <div className="flex overflow-hidden rounded-lg border-2" style={{ borderColor: NAVY }}>
            <button
              type="button" onClick={() => setMode('retail')}
              className="px-3 py-1.5 text-[11px] font-bold transition"
              style={mode === 'retail' ? { backgroundColor: NAVY, color: 'white' } : { backgroundColor: 'white', color: NAVY }}
            >
              Retail reference
            </button>
            <button
              type="button" onClick={() => setMode('dental')}
              className="px-3 py-1.5 text-[11px] font-bold transition"
              style={mode === 'dental' ? { backgroundColor: NAVY, color: 'white' } : { backgroundColor: 'white', color: NAVY }}
            >
              🦷 Dental Nation
            </button>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="mt-3 flex flex-wrap gap-1.5 border-b pb-2" style={{ borderColor: LINE }}>
        {TABS.map((t) => (
          <button
            key={t.id} type="button" onClick={() => setTab(t.id)}
            className="rounded-full px-3 py-1.5 text-[11px] font-bold transition"
            style={tab === t.id ? { backgroundColor: NAVY, color: 'white' } : { backgroundColor: '#F1F1EA', color: OLIVE }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {tab === 'structure' && <StructureTab mode={mode} sel={sel} setSel={setSel} />}
        {tab === 'interactions' && <InteractionsTab mode={mode} />}
        {tab === 'cadence' && <CadenceTab mode={mode} />}
        {tab === 'scenarios' && <ScenariosTab mode={mode} />}
        {tab === 'decisions' && <DecisionsTab mode={mode} />}
      </div>
    </div>
  );
}
