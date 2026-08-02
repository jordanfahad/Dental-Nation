/**
 * The demand generation plan — targets from the Revenue Rescue Plan
 * (Dental Nation execution plan, 23 March 2026).
 *
 * ⚠️ LANE LETTERING DIFFERS FROM PART 2. This plan uses B / D / C / J / E where
 * E = "Lifestyle"; the 13 Demand Lanes v2.0 architecture in Part 2 uses
 * E = "Corporate & Insurance" and puts aesthetics at G. Both are real
 * documents and both are quoted here as written, so the report labels this
 * section explicitly as the March plan's lane set rather than silently mixing
 * the two schemes. Worth reconciling before the two documents circulate
 * together.
 *
 * These are TARGETS, not results. Part 1's live exhibits are the measured
 * side; this is what the engine is being pointed at.
 */

export const DEMAND_PLAN = {
  source: 'Dental Nation Revenue Rescue Plan — execution plan, 23 March 2026',

  /** The cascade the whole plan hangs off. */
  cascade: {
    leads: '2,500',
    leadsUnit: 'qualified leads / month',
    patients: '500',
    patientsUnit: 'new patients / month',
    revenue: 'AED 500K',
    revenueUnit: 'revenue / month',
    perPatient: 'AED 1,000 average revenue per patient',
  },

  /** Channel allocation of the 2,500. Digital is Fahad's direct ownership. */
  channels: [
    {
      name: 'Digital',
      share: 70,
      leads: 1750,
      owner: 'Fahad + agency',
      detail: 'Google Ads, Meta and influencer working as three distinct engines rather than one budget.',
      sub: [
        { name: 'Google Ads', share: 40, leads: 700, role: 'Intent capture engine', detail: '“family dentist Dubai”, “emergency dentist”, “dental implants”, “Invisalign”' },
        { name: 'Meta Ads', share: 30, leads: 525, role: 'Demand creation engine', detail: 'Before/after, testimonials, education and offers across Instagram and Facebook' },
        { name: 'Influencer', share: 30, leads: 525, role: 'Social proof engine', detail: 'Local health and lifestyle micro-influencers (10K–50K), transformation stories' },
      ],
    },
    {
      name: 'Reactivation',
      share: 15,
      leads: 375,
      owner: 'Clinic managers + Lanie',
      detail: 'Dormant patients, referrals and word of mouth, inter-clinic and inter-department movement.',
      sub: [],
    },
    {
      name: 'B2B & referrals',
      share: 15,
      leads: 375,
      owner: 'Commercial lead',
      detail: 'Corporate, spa, salon and gym partnerships plus external GP referrals.',
      sub: [],
    },
  ],

  /** Segments — the March plan's lane set (see the warning above). */
  lanes: [
    { lane: 'B', name: 'Family', leads: 875, share: 35, revenue: 'AED 175K', primary: 'Dr. Tosun' },
    { lane: 'D', name: 'Emergency', leads: 500, share: 20, revenue: 'AED 100K', primary: 'AMC' },
    { lane: 'C', name: 'Implants', leads: 500, share: 20, revenue: 'AED 100K', primary: 'Al Wasl' },
    { lane: 'J', name: 'Orthodontics', leads: 500, share: 20, revenue: 'AED 100K', primary: 'All clinics' },
    { lane: 'E', name: 'Lifestyle', leads: 125, share: 5, revenue: 'AED 25K', primary: 'Smile Bar' },
  ],

  /** Clinic-level targets. */
  clinics: [
    { name: 'Dr. Tosun', share: 40, leads: 1000, patients: 200, revenue: 'AED 200K', primaryLane: 'B — Family' },
    { name: 'DN Al Wasl', share: 40, leads: 1000, patients: 200, revenue: 'AED 200K', primaryLane: 'C — Implants' },
    { name: 'AMC', share: 20, leads: 500, patients: 100, revenue: 'AED 100K', primaryLane: 'D — Emergency' },
  ],

  /** First milestones, as sequenced in the plan. */
  milestones: [
    { window: 'Week 1', what: 'Google Ads launch — immediate intent capture' },
    { window: 'Weeks 1–2', what: 'Meta Ads ramp and optimisation' },
    { window: 'Weeks 2–3', what: 'Influencer activation campaign' },
  ],

  /** Always-on lanes that run in parallel at every clinic. */
  alwaysOn: 'Orthodontics and Lifestyle run always-on at every clinic, in parallel with each clinic’s primary lane.',
} as const;
