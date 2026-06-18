import Anthropic from "@anthropic-ai/sdk";
import type { ExtractionResult } from "@/lib/impact/types";

// Spec §5: claude-sonnet-4-6 — the right cost/quality tier for document extraction.
const MODEL = "claude-sonnet-4-6";

export function extractionSystemPrompt(catalog: string): string {
  return `You are an extraction assistant for the Dental Nation "Growth Manager Impact Dashboard".
The growth manager (Fahad) owns six functions ("components"). You are given an input — a pasted
status update, a report, or a document — and must propose how it maps onto the EXISTING projects,
or propose NEW projects, plus any tasks. Your output is a PROPOSAL for human review; it is never
auto-applied.

${catalog}

RULES
- Align an update to an existing project (by project_id) whenever the input clearly refers to it.
- Only propose a NEW project when nothing in the catalog matches; explain why in "rationale".
- "component_id" MUST be one of the component ids listed above.
- status ∈ not_started | in_progress | blocked | on_hold | completed
- ownership ∈ owner | collaborator
- Dates are "YYYY-MM-DD" or omitted.
- "confidence" is a number 0.0–1.0.
- "impact_summary" must capture the OUTCOME / business result, not the activity.
- Put anything you cannot confidently place into "unmapped" (do not guess).

OUTPUT
Respond with STRICT JSON ONLY — no prose, no markdown code fences. Exactly this shape:
{
  "matched_projects": [
    { "project_id": "...", "proposed_updates": { "status": "...", "progress_pct": 0, "impact_summary": "...", "target_date": "YYYY-MM-DD" }, "evidence": "short quote from the input", "confidence": 0.0 }
  ],
  "new_projects": [
    { "component_id": "...", "name": "...", "description": "...", "suggested_status": "in_progress", "suggested_target_date": "YYYY-MM-DD", "ownership": "owner", "rationale": "why this is new", "confidence": 0.0 }
  ],
  "new_tasks": [
    { "project_ref": "existing project_id OR new project name", "name": "...", "status": "open", "effort_hours": null, "due_date": "YYYY-MM-DD" }
  ],
  "unmapped": [ "items you could not confidently place" ],
  "notes": "anything the reviewer should know"
}`;
}

export async function runExtraction(opts: {
  catalog: string;
  text?: string;
  pdfBase64?: string;
}): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return empty(
      "ANTHROPIC_API_KEY is not set, so automatic extraction was skipped. The raw input was stored — you can still create projects/tasks manually below or via the New project / New task forms."
    );
  }

  const client = new Anthropic({ apiKey });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [];
  if (opts.pdfBase64) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: opts.pdfBase64 },
    });
  }
  content.push({
    type: "text",
    text: opts.text && opts.text.trim() ? opts.text : "Extract structured proposals from the attached document.",
  });

  let raw = "";
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: extractionSystemPrompt(opts.catalog),
      messages: [{ role: "user", content }],
    });
    raw = msg.content
      .filter((b) => b.type === "text")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b) => (b as any).text as string)
      .join("\n")
      .trim();
    return parseExtraction(raw);
  } catch (e) {
    return empty(
      `The extraction request failed: ${e instanceof Error ? e.message : String(e)}. The raw input was stored; you can create projects/tasks manually.`,
      raw || undefined
    );
  }
}

/** Defensive JSON parse — strip fences, slice the outermost object, fall back to an error state (§5). */
export function parseExtraction(raw: string): ExtractionResult {
  let txt = raw.trim();
  txt = txt.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = txt.indexOf("{");
  const end = txt.lastIndexOf("}");
  if (start >= 0 && end > start) txt = txt.slice(start, end + 1);
  try {
    const obj = JSON.parse(txt);
    return {
      matched_projects: Array.isArray(obj.matched_projects) ? obj.matched_projects : [],
      new_projects: Array.isArray(obj.new_projects) ? obj.new_projects : [],
      new_tasks: Array.isArray(obj.new_tasks) ? obj.new_tasks : [],
      unmapped: Array.isArray(obj.unmapped) ? obj.unmapped.map(String) : [],
      notes: typeof obj.notes === "string" ? obj.notes : undefined,
    };
  } catch {
    return empty(
      "The model's output could not be parsed as JSON. Its raw output is shown below for reference — review it and create projects/tasks manually if needed.",
      raw
    );
  }
}

function empty(error: string, raw?: string): ExtractionResult {
  return { matched_projects: [], new_projects: [], new_tasks: [], unmapped: [], parse_error: error, raw_output: raw };
}
