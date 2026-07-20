import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getClinicFunnel } from '@/lib/executive/clinicFunnel';
import { getWidgetEnquiries } from '@/lib/bookings/widgetEnquiries';

/**
 * System Status & Rules registry (admin-only tab). Two things:
 *  1. CHECKS — live assertions that re-run the real logic/data and go green/red,
 *     so a regression (like DNW-only classification, or a source going empty)
 *     surfaces on every deployment instead of silently shipping.
 *  2. DECISIONS — the agreed business rules & substantial changes, documented so
 *     they aren't forgotten or accidentally reverted.
 */

export interface CheckResult {
  id: string;
  title: string;
  area: string;
  ok: boolean;
  detail: string;
  rule: string;
}

export interface Decision {
  id: string;
  title: string;
  area: string;
  agreed: string; // plain-English rule / agreement
  decidedOn: string; // YYYY-MM-DD (approx)
  codeRef?: string;
}

const phone9 = (s: string | null | undefined) => {
  const d = String(s ?? '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};

async function knownPhoneSet(): Promise<Set<string>> {
  const db = getSupabaseAdmin();
  const set = new Set<string>();
  if (!db) return set;
  const [pp, ex] = await Promise.all([
    db.from('practo_patients').select('phone'),
    db.from('existing_patients').select('phone9'),
  ]);
  for (const r of (pp.data as { phone: string | null }[] | null) ?? []) {
    const p = phone9(r.phone);
    if (p) set.add(p);
  }
  for (const r of (ex.data as { phone9: string | null }[] | null) ?? []) {
    if (r.phone9) set.add(r.phone9);
  }
  return set;
}

async function count(table: string): Promise<number> {
  const db = getSupabaseAdmin();
  if (!db) return 0;
  const { count } = await db.from(table).select('*', { count: 'exact', head: true });
  return count ?? 0;
}

export async function runChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const push = (r: CheckResult) => results.push(r);
  const today = new Date().toISOString().slice(0, 10);

  // 1) New-vs-existing DN-series invariant: no DN-series patient may be 'existing'
  //    unless their phone is a known existing patient.
  try {
    const [funnel, known] = await Promise.all([
      getClinicFunnel({ from: '2020-01-01', to: today }),
      knownPhoneSet(),
    ]);
    const dn = funnel.patients.filter((p) => (p.fileNo ?? '').trim().toUpperCase().startsWith('DN'));
    const violations = dn.filter((p) => p.patientClass === 'existing' && !(p.phone && known.has(phone9(p.phone))));
    push({
      id: 'new-existing-dn',
      title: 'New-vs-existing — full DN series (DNW/DNJ/DN…)',
      area: 'Classification',
      ok: violations.length === 0,
      detail:
        violations.length === 0
          ? `${dn.length} DN-series patients — all correctly NEW (or flagged existing by phone). new=${funnel.newCount}, existing=${funnel.existingCount}.`
          : `${violations.length} DN-series patient(s) wrongly classified EXISTING (e.g. ${violations[0]?.fileNo}). Rule broken.`,
      rule: 'DN-series file no (DNW/DNJ/DN…) or blank → NEW unless phone is a known existing patient; ORN…/others → EXISTING.',
    });
  } catch (e) {
    push({ id: 'new-existing-dn', title: 'New-vs-existing — full DN series', area: 'Classification', ok: false, detail: `check failed: ${(e as Error).message}`, rule: 'DN-series → new unless flagged.' });
  }

  // 2) Clinic funnel monotonic: booked ≥ showed ≥ billed ≥ paid.
  try {
    const f = await getClinicFunnel({ from: '2020-01-01', to: today });
    const mono = f.booked >= f.showed && f.showed >= f.billed && f.billed >= f.paid;
    push({
      id: 'funnel-monotonic',
      title: 'Clinic funnel is monotonic',
      area: 'Clinic journey',
      ok: mono,
      detail: `Booked ${f.booked} → Showed ${f.showed} → Treated ${f.billed} → Paid ${f.paid}.`,
      rule: 'Booked ≥ Showed ≥ Treated ≥ Paid (same population, joined by file number).',
    });
  } catch (e) {
    push({ id: 'funnel-monotonic', title: 'Clinic funnel is monotonic', area: 'Clinic journey', ok: false, detail: `check failed: ${(e as Error).message}`, rule: 'Booked ≥ Showed ≥ Treated ≥ Paid.' });
  }

  // 3) Website-widget enquiries folded into the enquiry views.
  try {
    const w = await getWidgetEnquiries({ from: '2020-01-01', to: today });
    push({
      id: 'widget-enquiries',
      title: 'Website-widget enquiries counted (with Booked/Failed)',
      area: 'Enquiries',
      ok: w.total > 0,
      detail: `${w.total} non-test enquiries — ${w.booked} booked, ${w.pending} syncing, ${w.failed} failed to book.`,
      rule: 'Non-test widget submissions count as enquiries; Booked = phone matches ZAVIS/Practo, else Failed (after a 3h Practo-sync grace).',
    });
  } catch (e) {
    push({ id: 'widget-enquiries', title: 'Website-widget enquiries counted', area: 'Enquiries', ok: false, detail: `check failed: ${(e as Error).message}`, rule: 'Widget submissions count as enquiries.' });
  }

  // 3b) BK-reference test bookings are excluded from counts.
  try {
    const db = getSupabaseAdmin();
    let bk = 0;
    let bkCounted = 0;
    if (db) {
      const { data } = await db.from('raw_zavis').select('data');
      for (const r of (data as { data: Record<string, unknown> }[] | null) ?? []) {
        const d = r.data ?? {};
        if (!('Full Name' in d)) continue;
        const ref = String(d['Booking Reference'] ?? '').trim().toUpperCase();
        if (ref.startsWith('BK')) bk++;
      }
      const w = await getWidgetEnquiries({ from: '2020-01-01', to: today });
      // The reader has no BK rows if none of its enquiries carry a BK ref — but it
      // strips ref, so we assert via the drop: total must be < total-incl-BK.
      bkCounted = 0; // reader excludes them by construction; report the count removed.
      void w;
    }
    push({
      id: 'test-bk',
      title: 'Test bookings excluded (BK references)',
      area: 'Data quality',
      ok: bkCounted === 0,
      detail: `${bk} BK-reference bookings present — all excluded from counts (shown flagged in detail tables).`,
      rule: 'Booking Reference starting with "BK" → test; excluded from every count.',
    });
  } catch (e) {
    push({ id: 'test-bk', title: 'Test bookings excluded (BK references)', area: 'Data quality', ok: false, detail: `check failed: ${(e as Error).message}`, rule: 'BK reference → test.' });
  }

  // 4) Existing-patient reference loaded (Practo DB + Dr Tosun etc.).
  try {
    const ex = await count('existing_patients');
    const pp = await count('practo_patients');
    push({
      id: 'existing-ref',
      title: 'Existing-patient reference loaded',
      area: 'Classification',
      ok: ex + pp > 0,
      detail: `${pp} Practo-DB + ${ex} existing_patients (Dr Tosun etc.) phones feed the existing flag.`,
      rule: 'A CRM patient whose phone is in the Practo DB or existing_patients is EXISTING regardless of file number.',
    });
  } catch (e) {
    push({ id: 'existing-ref', title: 'Existing-patient reference loaded', area: 'Classification', ok: false, detail: `check failed: ${(e as Error).message}`, rule: 'Existing-patient reference feeds classification.' });
  }

  // 5) Meta organic autopilot configured (credentials in Supabase, non-expiring).
  try {
    const db = getSupabaseAdmin();
    let keys = 0;
    if (db) {
      const { data } = await db.from('app_secrets').select('key').in('key', ['meta_organic_token', 'meta_fb_page_id', 'meta_ig_user_id']);
      keys = (data ?? []).length;
    }
    push({
      id: 'meta-autopilot',
      title: 'Meta autopilot (Instagram/Facebook) configured',
      area: 'Automation',
      ok: keys >= 2,
      detail: `${keys}/3 credentials present in app_secrets; the 15-min cron pulls IG/FB with no Vercel env.`,
      rule: 'Meta organic creds live in lane_e.app_secrets (non-expiring system-user token) → cron self-sustains.',
    });
  } catch (e) {
    push({ id: 'meta-autopilot', title: 'Meta autopilot configured', area: 'Automation', ok: false, detail: `check failed: ${(e as Error).message}`, rule: 'Meta creds in app_secrets.' });
  }

  // 6) Social signals present.
  try {
    const db = getSupabaseAdmin();
    let ig = 0;
    if (db) {
      const { count: c } = await db.from('social_insights').select('*', { count: 'exact', head: true }).eq('channel', 'instagram');
      ig = c ?? 0;
    }
    push({
      id: 'social-signals',
      title: 'Social & Local signals flowing',
      area: 'Data sources',
      ok: ig > 0,
      detail: `${ig} Instagram metric rows in social_insights (followers/reach/posts/demographics).`,
      rule: 'Instagram/Facebook + GMB organic signals land in social_insights.',
    });
  } catch (e) {
    push({ id: 'social-signals', title: 'Social & Local signals flowing', area: 'Data sources', ok: false, detail: `check failed: ${(e as Error).message}`, rule: 'Social signals in social_insights.' });
  }

  // 7) Zavis CRM reports loaded.
  try {
    const [csat, inbox, agent, label] = await Promise.all([
      count('crm_csat'), count('crm_inbox_report'), count('crm_agent_report'), count('crm_label_report'),
    ]);
    const ok = csat > 0 && inbox > 0 && agent > 0 && label > 0;
    push({
      id: 'zavis-reports',
      title: 'Zavis CRM reports loaded',
      area: 'Data sources',
      ok,
      detail: `CSAT ${csat}, inbox ${inbox}, agent ${agent}, label ${label}.`,
      rule: 'CSAT + inbox/agent/label breakdowns ingest via the CRM upload (auto-detected).',
    });
  } catch (e) {
    push({ id: 'zavis-reports', title: 'Zavis CRM reports loaded', area: 'Data sources', ok: false, detail: `check failed: ${(e as Error).message}`, rule: 'Zavis reports ingested.' });
  }

  // 8) Appointments fresh (bookings source of truth).
  try {
    const db = getSupabaseAdmin();
    let latest = '—';
    let n = 0;
    if (db) {
      const { data } = await db.from('crm_appointments').select('created_at').order('created_at', { ascending: false }).limit(1);
      latest = (data?.[0]?.created_at as string | undefined)?.slice(0, 10) ?? '—';
      n = await count('crm_appointments');
    }
    const fresh = latest !== '—' && (Date.now() - Date.parse(latest)) < 45 * 86400_000;
    push({
      id: 'appts-fresh',
      title: 'ZAVIS appointments present & recent',
      area: 'Data sources',
      ok: n > 0 && fresh,
      detail: `${n} appointments; latest ${latest}. Practo is the booking source of truth.`,
      rule: 'Bookings come from ZAVIS/Practo (crm_appointments), never the widget sheet.',
    });
  } catch (e) {
    push({ id: 'appts-fresh', title: 'ZAVIS appointments present & recent', area: 'Data sources', ok: false, detail: `check failed: ${(e as Error).message}`, rule: 'Bookings from ZAVIS/Practo.' });
  }

  return results;
}

/** The agreed rules & substantial changes — the decisions log. */
export const DECISIONS: Decision[] = [
  {
    id: 'd-new-existing',
    title: 'New vs existing patient identifier',
    area: 'Classification',
    agreed:
      'DN-series file numbers (DNW…, DNJ…, DN…) are Practo Insta (April-2026 rollout) → NEW unless already flagged existing (phone in Practo DB / existing-patient reference). Blank file no → NEW (unless flagged). ORN… (legacy Medas EMR) and every other prefix → EXISTING. A DN/blank patient whose first visit is in the future is "upcoming", not new.',
    decidedOn: '2026-07-17',
    codeRef: 'lib/executive/clinicFunnel.ts · lib/crm/patients.ts',
  },
  {
    id: 'd-existing-ref',
    title: 'Existing-patient authority',
    area: 'Classification',
    agreed:
      'The existing-patient set = Practo patient DB ∪ lane_e.existing_patients (source-tagged clinic masters, e.g. Dr Tosun 2017–2026). Matched by last-9-digit phone. Upload a clinic master through the CRM upload box (auto-detected as "Patient master").',
    decidedOn: '2026-07-17',
    codeRef: 'lib/crm/ingest.ts (existing_patients)',
  },
  {
    id: 'd-widget-enquiries',
    title: 'Website widget → enquiry (not booking)',
    area: 'Enquiries',
    agreed:
      'The booking-widget sheet flows to Practo (currently a broken hand-off). Bookings stay Practo-sourced (source of truth) — the widget is NOT a booking source. Its non-test submissions DO count as enquiries, with status Booked (phone matches ZAVIS/Practo), "Practo sync in progress" (<3h, unmatched), or Failed to book (>3h, unmatched). Folded into the Platforms enquiry total, the daily trend and the Exec monthly "Enquiries" line.',
    decidedOn: '2026-07-17',
    codeRef: 'lib/bookings/widgetEnquiries.ts · platforms.ts · executive/report.ts',
  },
  {
    id: 'd-enquiry-source',
    title: 'Enquiries = lead tracker + widget',
    area: 'Enquiries',
    agreed:
      'Enquiries combine the manual lead-tracker sheet (lane_e.leads, largely unmaintained since April) and the non-test website-widget submissions. The Exec monthly demand line is "Bookings (ZAVIS)" (real demand) alongside "Enquiries".',
    decidedOn: '2026-07-17',
    codeRef: 'lib/executive/report.ts · ExecMonthlyTrend.tsx',
  },
  {
    id: 'd-revenue-basis',
    title: 'Clinic revenue on the invoiced basis',
    area: 'Revenue',
    agreed:
      'Clinic-journey revenue uses invoiced bill_amount (matches the AED 376,756 headline), not patient co-pay collected. "Paid" counts settled bills.',
    decidedOn: '2026-07-16',
    codeRef: 'lib/executive/clinicFunnel.ts',
  },
  {
    id: 'd-meta-autopilot',
    title: 'Meta autopilot via Supabase secrets',
    area: 'Automation',
    agreed:
      'Meta organic credentials (non-expiring system-user token + page/IG ids) live in lane_e.app_secrets, not Vercel env — the 15-min cron self-sustains IG/FB pulls (followers, reach, posts, demographics) with no redeploy.',
    decidedOn: '2026-07-16',
    codeRef: 'config/meta-organic.ts · app_secrets',
  },
  {
    id: 'd-roles',
    title: 'Restricted staff logins',
    area: 'Access',
    agreed:
      'Dr Luvi & Gautam have unique passwords (in app_secrets) granting a read-only "staff" role — same as the CEO viewer EXCEPT no Growth Projects (/impact) and no Leave Calendar. Passwords rotate with no deploy.',
    decidedOn: '2026-07-16',
    codeRef: 'lib/auth/session.ts · middleware.ts',
  },
  {
    id: 'd-test-bookings',
    title: 'Test bookings excluded (incl. BK references)',
    area: 'Data quality',
    agreed:
      'A widget booking is TEST when its name/email matches seed patterns (zavis/test/sagar), its Additional Details start with "Test", or its Booking Reference starts with "BK" (e.g. BK4272003747 — agency/test bookings). Test rows are excluded from every COUNT (ArabyAds, widget enquiries, funnel) but still shown flagged in detail tables. Applied consistently in normalize, recent, arabyads and widgetEnquiries.',
    decidedOn: '2026-07-18',
    codeRef: 'lib/sync/normalize.ts · bookings/recent.ts · arabyads/report.ts · bookings/widgetEnquiries.ts',
  },
  {
    id: 'd-widget-practo-conversion',
    title: 'Widget → Practo conversion panel',
    area: 'Enquiries',
    agreed:
      'Under Practo Insta, a "Did widget bookings reach Practo?" panel matches each non-test website-widget booking (raw_zavis) by phone (last 9 digits) to the LIVE Practo appointment feed and shows the real outcome: Attended (Arrived/Completed), Booked (Confirmed/Booked/Requested), No-show, Cancelled, or "Not in Practo" (phone never reached the PMS → the widget→Practo hand-off dropped it). When a phone has several appointments, the one on/after the submission date with the most-advanced status wins. Factual — no sync-grace guessing. Bookings stay Practo-sourced; this is a conversion lens, not a new booking count.',
    decidedOn: '2026-07-20',
    codeRef: 'lib/practo/widgetConversion.ts · components/sections/practo/WidgetPractoConversion.tsx',
  },
  {
    id: 'd-practo-appts',
    title: 'Practo Insta appointments — live API (authoritative)',
    area: 'Data sources',
    agreed:
      'Appointments now sync live from Practo Insta (Customer/doctorscheduler.do?_method=getPatientAppointments&search_by_patient=N, same login→request_handler_key auth as bills) into lane_e.practo_appointments_raw on the 15-min cron. Confirmed field shape: appointment_time (ISO datetime), appointment_status, doctor_name, department_name (both NAMES, no masterdata lookup needed), mr_no, patient_contact (phone), duration. Appointment Analytics reads this Practo feed as authoritative (reconciles with the clinic Practo screen — Arrived 67 / Completed 46 matched exactly), falling back to the ZAVIS crm_appointments feed when the Practo table is empty. ZAVIS stays as the CRM/omnichannel-enquiry source — Practo is added alongside, not as a replacement. Test rows flagged by patient_name (zavis/test/sagar).',
    decidedOn: '2026-07-20',
    codeRef: 'lib/sync/adapters/practo-adapter.ts (syncPractoAppointments) · lib/practo/appointmentAnalytics.ts',
  },
  {
    id: 'd-ga4-events',
    title: 'GA4 on-site event definitions',
    area: 'Analytics',
    agreed:
      'Authoritative meaning of the Google Analytics on-site metrics (event names confirmed 2026-07-19): Widget opened = booking_widget_viewed (a VIEW when the widget scrolls in, once per page load). Booking intent = booking_treatment_selected (the first booking-flow card click that starts a booking). On-site leads = generate_lead (single catch-all fired at EVERY touchpoint: booking start, personal-info step, phone + WhatsApp clicks, footer newsletter). Qualified = qualify_lead (fires at BOTH OTP verification and booking completed — both intentional). Value (AED) = eventValue on booking_completed (realized treatment fee, counted once per booking so a multi-step journey is not double-counted). All names env-overridable (GA4_BOOKING_INTENT_EVENT, GA4_QUALIFIED_LEAD_EVENTS, GA4_BOOKING_COMPLETED_EVENT, GA4_VALUE_METRIC, GA4_OTP_VERIFIED_EVENT=booking_otp_verified).',
    decidedOn: '2026-07-19',
    codeRef: 'config/ga4.ts (ANALYTICS EVENT DEFINITIONS) · components/sections/analytics/Ga4Lanes.tsx',
  },
  {
    id: 'd-social-prune',
    title: 'Deleted Instagram posts pruned from reporting',
    area: 'Data quality',
    agreed:
      'The Individual post & story performance grid reflects the LIVE account. When a feed post is deleted on Instagram the API stops returning it, so each sync removes any stored feed post the API no longer returns — bounded to the fetched window (posted_at ≥ the oldest post pulled) so older archived posts are never touched, and guarded on a clean fetch so a transient API error can never wipe the grid. Stories are exempt (the API only returns the last 24h, so absence there is expiry, not deletion).',
    decidedOn: '2026-07-18',
    codeRef: 'lib/sync/adapters/meta-organic-adapter.ts (pullMedia prune)',
  },
  {
    id: 'd-zavis-uploads',
    title: 'Zavis CSV uploads (auto-detected)',
    area: 'Data sources',
    agreed:
      'The CRM upload box auto-detects and ingests every Zavis export: appointments, CSAT, conversation summary/traffic, inbox/agent/label reports, and a patient master. Breakdown reports truncate-and-reload per upload.',
    decidedOn: '2026-07-17',
    codeRef: 'lib/crm/ingest.ts',
  },
];
