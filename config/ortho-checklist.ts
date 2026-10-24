/**
 * DN Ortho content and launch checklist, shown in the 09:00 DN Ortho email
 * (lib/alerts/orthoDaily.ts). Status comes from the project plan: there is no
 * dashboard page or data feed for it yet, so it is edited here by hand.
 * Change `updated` (Dubai day, YYYY-MM-DD) with every edit; the email shows it.
 * Plain status text only: no patient data, prices or contact details.
 */
export interface OrthoChecklistItem {
  item: string;
  status: string;
}

export interface OrthoChecklist {
  /** Dubai day the statuses below were last checked against the project plan. */
  updated: string;
  items: OrthoChecklistItem[];
}

export const ORTHO_CHECKLIST: OrthoChecklist = {
  updated: '2026-10-24',
  items: [
    {
      item: 'Video scripts (4 orthodontists; English plus Arabic or Turkish)',
      status: 'Sent to the team 22 Oct; Dr Yahya Tosun has agreed his',
    },
    { item: 'Dr Yahya Tosun shoot', status: 'Mon 26 or Tue 27 Oct, waiting for his confirmation' },
    { item: 'Carousels (3)', status: 'With Mohan for design' },
    { item: 'Google Search campaign', status: "Built and paused, waiting for Fahad's review" },
    { item: 'Landing page ortho.dentalnation.com', status: 'Preview live; WhatsApp tracking to set up' },
  ],
};
