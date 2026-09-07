import { Card, SectionHeader } from '@/components/ui/Card';
import { currentUser } from '@/lib/auth/role';
import { listDrops, type DropFile } from '@/lib/drop/data';
import { DropUpload } from './DropUpload';

/**
 * Data Drop tab — the in-dashboard replacement for an external Dropbox.
 * Two lanes feed the Mega Board Report: Finance (Jawad) and Operations
 * (Dr Luvi). Files land in the private evidence bucket; every drop is listed
 * below with a Received / Processed status so contributors can see their
 * handover was picked up. Downloads are admin-only (finance files are
 * sensitive); everyone signed in can upload and see the register.
 */

const AREA_LABEL: Record<DropFile['area'], string> = {
  finance: 'Finance',
  operations: 'Operations',
};

const fmtSize = (b: number) =>
  b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Dubai',
  });

export async function DataDrop() {
  const [user, drops] = await Promise.all([currentUser(), listDrops()]);
  const admin = user?.role === 'admin';

  return (
    <div className="mt-5 space-y-5">
      <Card>
        <SectionHeader
          eyebrow="Data Drop"
          title="File handover for the Mega Board Report"
          right={<span className="text-[11px] text-ink-faint">stored privately · never public</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <p className="mb-4 text-[12.5px] leading-snug text-ink-soft">
            Drop your source files here instead of email or an external drive. Everything lands in the
            dashboard&apos;s own private storage, the growth team is notified through this register, and each file is
            marked <span className="font-medium text-ink">Processed</span> once its numbers are wired into the report.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <DropUpload
              area="finance"
              title="Finance"
              owner="Jawad — Head of Finance"
              hint="Zoho Finance exports, P&L by clinic, revenue and cost breakdowns, budgets — whatever the finance section should be built from."
            />
            <DropUpload
              area="operations"
              title="Operations"
              owner="Dr Luvi — Head of Operations"
              hint="EMR / operational reports, capacity and utilisation data, clinical governance inputs for the operations section."
            />
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Data Drop"
          title="Received files"
          right={<span className="text-[11px] text-ink-faint">{drops.length} file{drops.length === 1 ? '' : 's'}</span>}
        />
        <div className="px-5 pb-5 pt-4">
          {drops.length === 0 ? (
            <p className="rounded-card border border-dashed border-line bg-panel/40 px-4 py-6 text-center text-[12.5px] text-ink-soft">
              Nothing dropped yet — the first upload will appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3 text-left font-medium">Area</th>
                    <th className="py-2 pr-3 text-left font-medium">File</th>
                    <th className="py-2 pr-3 text-left font-medium">Note</th>
                    <th className="py-2 pr-3 text-left font-medium">Uploaded by</th>
                    <th className="py-2 pr-3 text-left font-medium">When (Dubai)</th>
                    <th className="py-2 pr-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {drops.map((d) => (
                    <tr key={d.id} className="border-b border-line/60 align-top">
                      <td className="py-2 pr-3 text-ink-soft">{AREA_LABEL[d.area]}</td>
                      <td className="py-2 pr-3">
                        {admin ? (
                          <a href={`/api/drop/${d.id}`} className="font-medium text-accent hover:underline">
                            {d.filename}
                          </a>
                        ) : (
                          <span className="font-medium text-ink">{d.filename}</span>
                        )}
                        <span className="ml-1.5 text-[10.5px] text-ink-faint">{fmtSize(d.sizeBytes)}</span>
                      </td>
                      <td className="py-2 pr-3 text-ink-soft">{d.note || '—'}</td>
                      <td className="py-2 pr-3 text-ink-soft">{d.uploadedBy || '—'}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-ink-soft">{fmtDate(d.uploadedAt)}</td>
                      <td className="py-2 pr-3">
                        {d.status === 'processed' ? (
                          <span className="inline-block rounded-full bg-good/10 px-2 py-0.5 text-[11px] font-medium text-good">
                            Processed
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-watch/10 px-2 py-0.5 text-[11px] font-medium text-watch">
                            Received
                          </span>
                        )}
                        {d.processedNote ? (
                          <div className="mt-0.5 text-[10.5px] text-ink-faint">{d.processedNote}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[10.5px] leading-snug text-ink-faint">
            Files are stored in the dashboard&apos;s private bucket and are downloadable by the admin team only.
            Uploads are limited to 50 MB per file — for anything larger, split the export or compress it.
          </p>
        </div>
      </Card>
    </div>
  );
}
