// Formatting helpers for the Impact tab — tabular, terse, executive.

export function formatDate(d?: string | null): string {
  if (!d) return "—";
  const date = new Date(d.length <= 10 ? d + "T00:00:00" : d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthYear(d?: string | null): string {
  if (!d) return "—";
  const date = new Date(d.length <= 10 ? d + "T00:00:00" : d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatNumber(n?: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US");
}

export function formatHours(n?: number | null): string {
  if (n === null || n === undefined) return "—";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded)
    ? rounded.toLocaleString("en-US")
    : rounded.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function clampPct(n?: number | null): number {
  if (n === null || n === undefined || isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function daysUntil(target?: string | null, from: Date = new Date()): number | null {
  if (!target) return null;
  const t = new Date(target.length <= 10 ? target + "T00:00:00" : target);
  if (isNaN(t.getTime())) return null;
  const ms = startOfDay(t) - startOfDay(from);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Human relative target description, e.g. "in 12 days" / "3 days overdue" / "today". */
export function relativeTarget(target?: string | null): { label: string; tone: "ok" | "warn" | "bad" | "muted" } {
  const d = daysUntil(target);
  if (d === null) return { label: "No target", tone: "muted" };
  if (d === 0) return { label: "Due today", tone: "warn" };
  if (d < 0) return { label: `${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} overdue`, tone: "bad" };
  if (d <= 14) return { label: `Due in ${d} day${d === 1 ? "" : "s"}`, tone: "warn" };
  return { label: `Due in ${d} days`, tone: "ok" };
}

export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "—";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(iso);
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${units[i]}`;
}
