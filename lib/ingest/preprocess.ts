import { parse as parseHtml } from "node-html-parser";
import { looksLikeZoho, parseTabular } from "@/config/zoho-mapping";

export type Detected =
  | { kind: "text"; sourceType: "text"; text: string }
  | { kind: "pdf"; sourceType: "pdf"; pdfBase64: string; filename: string }
  | { kind: "table"; sourceType: "excel" | "csv"; text: string; filename: string }
  | { kind: "html"; sourceType: "html_report"; text: string; filename: string }
  | { kind: "zoho"; sourceType: "zoho"; headers: string[]; rows: string[][]; filename: string }
  | { kind: "error"; error: string };

const CAP = 100_000; // cap text sent to the model

export function preprocess(opts: {
  text?: string;
  file?: { name: string; buffer: Buffer; mime: string };
}): Detected {
  const { text, file } = opts;

  if (file) {
    const name = file.name.toLowerCase();
    const buf = file.buffer;

    if (name.endsWith(".pdf") || file.mime === "application/pdf") {
      return { kind: "pdf", sourceType: "pdf", pdfBase64: buf.toString("base64"), filename: file.name };
    }
    if (name.endsWith(".csv") || file.mime === "text/csv") {
      const { headers, rows } = parseTabular(buf.toString("utf8"), true);
      if (looksLikeZoho(headers))
        return { kind: "zoho", sourceType: "zoho", headers, rows, filename: file.name };
      return { kind: "table", sourceType: "csv", text: toMarkdownTable(headers, rows), filename: file.name };
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls") || file.mime.includes("spreadsheet") || file.mime.includes("excel")) {
      const { headers, rows } = parseTabular(buf, false);
      if (looksLikeZoho(headers))
        return { kind: "zoho", sourceType: "zoho", headers, rows, filename: file.name };
      return { kind: "table", sourceType: "excel", text: toMarkdownTable(headers, rows), filename: file.name };
    }
    if (name.endsWith(".html") || name.endsWith(".htm") || file.mime === "text/html") {
      const root = parseHtml(buf.toString("utf8"));
      const txt = (root.structuredText || root.text || "").trim();
      return { kind: "html", sourceType: "html_report", text: txt.slice(0, CAP), filename: file.name };
    }
    if (name.endsWith(".txt") || name.endsWith(".md") || file.mime.startsWith("text/")) {
      return { kind: "text", sourceType: "text", text: buf.toString("utf8").slice(0, CAP) };
    }
    return {
      kind: "error",
      error: `Unsupported file type for extraction: "${file.name}". Supported: PDF, Excel/CSV, HTML, plain text. (For DOCX, attach it as evidence instead.)`,
    };
  }

  if (text && text.trim()) {
    return { kind: "text", sourceType: "text", text: text.trim().slice(0, CAP) };
  }
  return { kind: "error", error: "Nothing to ingest — provide pasted text or a file." };
}

function toMarkdownTable(headers: string[], rows: string[][]): string {
  if (!headers.length) return "(empty table)";
  const esc = (s: string) => (s ?? "").replace(/\|/g, "\\|");
  const head = `| ${headers.map(esc).join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows
    .slice(0, 200)
    .map((r) => `| ${headers.map((_, i) => esc(r[i] ?? "")).join(" | ")} |`)
    .join("\n");
  return `${head}\n${sep}\n${body}`;
}
