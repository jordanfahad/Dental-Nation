export const WEBSITE_ENQUIRIES_TAB = 'Website Enquiries (auto)';
export const WEBSITE_SUMMARY_TAB = 'Website Summary';
export const WEBSITE_BACKFILL_FROM = '2026-10-01';
/** Machine status for a mirrored row that no longer counts as a website enquiry (kept, never deleted). */
export const WEBSITE_ORPHAN_STATUS = 'no longer counted as website';
export const WEBSITE_TABS = [WEBSITE_ENQUIRIES_TAB, WEBSITE_SUMMARY_TAB];
export const isWebsiteMirrorTab = (title: unknown) => WEBSITE_TABS.some((tab) => tab.toLowerCase() === String(title ?? '').trim().toLowerCase());

export const WEBSITE_HEADERS = [
  'Lead ID', 'Date', 'Time', 'Patient Name', 'Contact Number', 'Clinic / Branch',
  'Service / Lane requested', 'Source detail', 'Dashboard status', 'Billed AED (dashboard)',
  'Valid enquiry?', '1st Follow-up', '2nd Follow-up', '3rd Follow-up', 'Assigned To',
  'Outcome', 'Conversion', 'Revenue', 'Notes / Remarks',
] as const;
export const WEBSITE_VALIDITY = ['Yes', 'Spam', 'Vendor or sales', 'Job applicant', 'Duplicate', 'Existing patient admin', 'Wrong number'];
export const WEBSITE_OUTCOMES = ['Booked', 'Not interested', 'No answer', 'Call back', 'Price', 'Other'];
export const WEBSITE_CONVERSIONS = ['Converted', 'Not converted'];
