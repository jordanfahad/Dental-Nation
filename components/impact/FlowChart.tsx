import type { FlowchartSpec, FlowNode, FlowTone } from "@/lib/impact/types";

// McKinsey-style node tones — restrained navy + mint, hairline borders.
const TONE: Record<FlowTone, string> = {
  start: "border-dn-mint bg-[#EBF4EC] text-dn-navy",
  accent: "border-dn-soft bg-[#EAF2F4] text-dn-navy",
  process: "border-dn-line bg-white text-dn-navy",
  decision: "border-dn-amber bg-white text-dn-navy",
  end: "border-dn-navy bg-dn-navy text-dn-off",
};

function Node({ node }: { node: FlowNode }) {
  const tone = TONE[(node.tone as FlowTone) ?? "process"] ?? TONE.process;
  return (
    <div className={`max-w-[230px] rounded-xl border-2 px-4 py-3 text-center shadow-[0_6px_16px_rgba(36,66,96,.07)] ${tone}`}>
      <div className="text-[13px] font-bold leading-snug">{node.label}</div>
      {node.sublabel && <div className="mt-1 text-[10.5px] font-medium leading-snug opacity-75">{node.sublabel}</div>}
    </div>
  );
}

/** Connector into a layer: a centered spine, plus a distributing rail when the
 *  layer it feeds has multiple nodes (clean fan-out, like a consulting deck). */
function Connector({ cols }: { cols: number }) {
  const inset = `${50 / cols}%`;
  return (
    <div aria-hidden className="select-none">
      <div className="mx-auto h-5 w-px bg-dn-soft" />
      {cols > 1 ? (
        <div className="relative h-5">
          <div className="absolute top-0 h-px bg-dn-soft" style={{ left: inset, right: inset }} />
          <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
            {Array.from({ length: cols }).map((_, i) => (
              <div key={i} className="mx-auto w-px bg-dn-soft" />
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-auto -mt-px h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-dn-soft" />
      )}
    </div>
  );
}

export function FlowChart({ spec }: { spec: FlowchartSpec }) {
  const layers = spec?.layers ?? [];
  if (!layers.length) return null;
  return (
    <div className="overflow-x-auto">
      <div className="mx-auto flex min-w-[640px] max-w-2xl flex-col">
        {layers.map((layer, i) => {
          const cols = Math.max(layer.nodes.length, 1);
          return (
            <div key={i}>
              {i > 0 && <Connector cols={cols} />}
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
                {layer.nodes.map((node, j) => (
                  <div key={j} className="flex justify-center">
                    <Node node={node} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
