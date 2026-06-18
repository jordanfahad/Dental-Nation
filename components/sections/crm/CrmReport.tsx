import { getCrmReport } from '@/lib/crm/report';
import type { CrmRange } from '@/lib/crm/types';
import { currentRole } from '@/lib/auth/role';
import { ZavisUpload } from '@/components/crm/ZavisUpload';
import { CrmHeader } from './CrmHeader';
import { CrmScorecards } from './CrmScorecards';
import { CrmFunnel } from './CrmFunnel';
import { CrmBreakdowns } from './CrmBreakdowns';
import { CrmTrend } from './CrmTrend';
import { CrmConversations } from './CrmConversations';
import { CrmPractoRevenue } from './CrmPractoRevenue';
import { CrmEmptyState } from './CrmEmptyState';

/**
 * CRM — Zavis tab. Async server component: reads the CRM report directly via
 * getSupabaseAdmin() (degrades to honest empty/data-gap states when the DB is
 * unreachable) and renders an answer-first, McKinsey-style page. Admins also see
 * the Zavis CSV re-ingest control at the top.
 *
 * Honesty (CLAUDE.md): every unsourced metric renders an explicit owned data gap
 * — never a fabricated 0. When the whole report is empty we show a calm
 * "not yet ingested" state that points at the upload control.
 */
export async function CrmReport({ range }: { range?: CrmRange }) {
  const [report, role] = await Promise.all([getCrmReport(range), currentRole()]);
  const isAdmin = role === 'admin';
  const empty = report.source === 'empty';

  return (
    <div className="space-y-5">
      {isAdmin ? <ZavisUpload /> : null}

      {empty ? (
        <CrmEmptyState canUpload={isAdmin} />
      ) : (
        <>
          <CrmHeader report={report} />
          <CrmScorecards report={report} />
          <CrmFunnel report={report} />
          <CrmBreakdowns report={report} />
          <CrmTrend report={report} />
          <CrmConversations report={report} />
        </>
      )}

      {/* Practo Insta clinic-PMS revenue — its own population (finalized bills),
          rendered regardless of the appointment-data state. Self-handles empty. */}
      <CrmPractoRevenue range={range} />
    </div>
  );
}
