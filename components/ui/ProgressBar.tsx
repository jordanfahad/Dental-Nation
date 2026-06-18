import { clampPct } from "@/lib/impact/format";

export function ProgressBar({
  value,
  color,
  className = "",
}: {
  value?: number | null;
  color?: string;
  className?: string;
}) {
  const v = clampPct(value);
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-panel-2 ${className}`}>
      <div
        className="h-full rounded-full"
        style={{ width: `${v}%`, backgroundColor: color ?? "var(--accent)" }}
      />
    </div>
  );
}
