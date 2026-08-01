/**
 * Marketing OS view definitions — a PLAIN module (intentionally NOT 'use
 * client'), so the server component can resolve the active view while the
 * client sub-nav imports the same list. Exporting this from MosSubNav.tsx
 * ('use client') hands the server a client-reference proxy instead of the
 * array — MOS_VIEWS.some() then crashes at runtime (mirrors tabs.ts/subtabs.ts).
 */
export const MOS_VIEWS = [
  { key: '', label: 'Overview' },
  { key: 'organic', label: '1 · Organic Engine' },
  { key: 'smile-club', label: '2 · Smile Club' },
  { key: 'creative', label: '3 · Creative' },
  { key: 'crm', label: '4 · CRM & Segments' },
  { key: 'infra', label: '5 · Infrastructure' },
  { key: 'approvals', label: 'Approval Queue' },
  { key: 'risk', label: 'Risk Register' },
] as const;
