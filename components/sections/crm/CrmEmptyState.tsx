import { Card } from '@/components/ui/Card';

/**
 * Calm whole-report empty state — shown when no CRM data is present (DB
 * unreachable here, or nothing ingested yet). Honest, not a fake dashboard.
 */
export function CrmEmptyState({ canUpload }: { canUpload: boolean }) {
  return (
    <Card>
      <div className="px-6 py-10 text-center">
        <p className="eyebrow">CRM — Zavis</p>
        <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-ink">
          CRM data not yet ingested
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-snug text-ink-soft">
          No Zavis appointments, conversations, or traffic are available for this view. This is an
          honest empty state — no figures are shown because none are sourced.
        </p>
        {canUpload ? (
          <p className="mt-3 text-[12.5px] text-ink-faint">
            Use the <span className="font-medium text-ink-soft">“Upload a fresh Zavis export”</span>{' '}
            panel above to ingest the latest CSV.
          </p>
        ) : (
          <p className="mt-3 text-[12.5px] text-ink-faint">
            An admin needs to upload a Zavis export. · owner: PAC
          </p>
        )}
      </div>
    </Card>
  );
}
