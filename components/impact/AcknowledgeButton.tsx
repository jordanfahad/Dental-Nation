"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { acknowledgeShowcaseAction } from "@/app/(app)/impact/actions";

/**
 * CEO "Acknowledge" control on a Growth Build card. Posts the one viewer-allowed
 * write (acknowledgeShowcaseAction); on success the page refreshes and the card
 * shows the acknowledged state instead.
 */
export function AcknowledgeButton({ projectId }: { projectId: string }) {
  return (
    <ActionForm
      action={acknowledgeShowcaseAction}
      hidden={{ id: projectId }}
      submitLabel="Acknowledge"
      className="flex flex-wrap items-center gap-2 sm:!space-y-0"
    >
      <input
        name="ack_by"
        className="w-40 rounded-md border border-dn-line bg-white px-2 py-1.5 text-sm text-dn-ink placeholder:text-dn-ink/40"
        placeholder="Your name (optional)"
      />
    </ActionForm>
  );
}
