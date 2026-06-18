import type { Component, Project } from "@/lib/impact/types";

/** Catalog of components + existing projects, given to the model so it aligns to / dedupes against what exists (§5). */
export function buildCatalog(components: Component[], projects: Project[]): string {
  const comps = components.map((c) => `  - ${c.id}: ${c.name}`).join("\n");
  const projs = projects.length
    ? projects
        .map(
          (p) =>
            `  - ${p.id} | "${p.name}" | component=${p.component_id ?? "none"} | status=${p.status}`
        )
        .join("\n")
    : "  (none yet)";
  return `COMPONENTS (use these ids for component_id):\n${comps}\n\nEXISTING PROJECTS (align/dedupe against these — reference by project_id):\n${projs}`;
}
