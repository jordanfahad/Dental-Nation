import { AcknowledgeButton } from "./AcknowledgeButton";
import { AttachEvidence } from "@/components/forms/AttachEvidence";
import { formatDate } from "@/lib/impact/format";
import type { EvidenceFile, Project } from "@/lib/impact/types";

/**
 * "Growth Builds" — featured projects presented as CEO case studies: what it
 * does, how it benefits, estimated build effort (labelled), how it can be
 * enhanced, and how it impacts growth — with screenshots and a CEO Acknowledge
 * action. Sits at the top of the Overview tab. Renders nothing if no project is
 * featured.
 */
export function GrowthBuildsShowcase({
  builds,
  evidence,
  role,
}: {
  builds: Project[];
  evidence: EvidenceFile[];
  role: "admin" | "viewer" | null;
}) {
  if (!builds.length) return null;

  const imagesFor = (id: string) =>
    evidence.filter(
      (e) => e.project_id === id && e.visible_to_ceo && (e.mime ?? "").startsWith("image/"),
    );

  return (
    <section className="print-break">
      <div className="mb-4">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-dn-soft">
          Growth builds · for CEO review
        </div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-dn-navy">
          What I shipped — and how it drives growth
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-dn-ink/65">
          Products built in-house this period. Review each, then acknowledge.
        </p>
      </div>

      <div className="space-y-5">
        {builds.map((b) => {
          const imgs = imagesFor(b.id);
          const sc = b.showcase ?? {};
          return (
            <article
              key={b.id}
              className="overflow-hidden rounded-2xl border border-dn-line bg-white shadow-[0_10px_30px_rgba(36,66,96,.06)] print-avoid-break"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dn-line bg-dn-pale/40 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-dn-navy">{b.name}</h3>
                  {b.impact_summary && (
                    <p className="mt-1 max-w-2xl text-sm text-dn-ink/70">{b.impact_summary}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {sc.est_hours != null && (
                    <span className="rounded-full bg-dn-mint/40 px-2.5 py-1 text-xs font-semibold text-dn-navy">
                      ~{Math.round(sc.est_hours)} hrs <span className="font-normal text-dn-ink/55">est.</span>
                    </span>
                  )}
                  {b.link && (
                    <a
                      href={b.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-dn-navy px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-dn-navy2"
                    >
                      Open ↗
                    </a>
                  )}
                </div>
              </div>

              <div className="px-5 pt-5">
                {imgs.length ? (
                  <div className="flex items-center gap-3 overflow-x-auto pb-1">
                    {imgs.map((e) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={e.id}
                        src={`/api/evidence/${e.id}`}
                        alt={e.filename}
                        className="h-44 w-auto shrink-0 rounded-lg border border-dn-line object-cover"
                      />
                    ))}
                    {role === "admin" && (
                      <div className="shrink-0">
                        <AttachEvidence projectId={b.id} label="+ Add" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-dn-line bg-dn-pale/30 text-xs text-dn-ink/45">
                    <span>No screenshots yet</span>
                    {role === "admin" && <AttachEvidence projectId={b.id} label="+ Add screenshot" />}
                  </div>
                )}
              </div>

              <div className="grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-2">
                <Block label="What it does" body={sc.what} />
                <Block label="How it benefits" body={sc.benefits} />
                <Block label="How it can be enhanced" body={sc.enhance} />
                <Block label="Impact on growth" body={sc.growth_impact} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dn-line bg-dn-pale/30 px-5 py-3">
                {b.ceo_ack_at ? (
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-dn-green">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dn-green/15 text-[11px]">
                      ✓
                    </span>
                    Acknowledged{b.ceo_ack_by ? ` by ${b.ceo_ack_by}` : ""} · {formatDate(b.ceo_ack_at)}
                  </span>
                ) : (
                  <span className="text-sm text-dn-ink/55">Awaiting CEO acknowledgement</span>
                )}
                {role && !b.ceo_ack_at && <AcknowledgeButton projectId={b.id} />}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Block({ label, body }: { label: string; body?: string | null }) {
  if (!body) return null;
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-dn-soft">{label}</div>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-dn-ink/80">{body}</p>
    </div>
  );
}
