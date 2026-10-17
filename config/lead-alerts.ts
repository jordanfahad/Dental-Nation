export type LeadAlertMode = 'off' | 'batched' | 'instant';

// Owner decisions remain open. No environment fallback or inherited recipients.
export const LEAD_ALERT_MODE: LeadAlertMode = 'off';
export const LEAD_ALERT_RECIPIENT: string | null = null;
export const LEAD_ALERT_BATCH_MINUTES = 120;
export const LEAD_ALERT_WINDOW = { start: '09:00', end: '21:00', timeZone: 'Asia/Dubai' } as const;
