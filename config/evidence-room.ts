/**
 * The Investor Evidence Room — content from Mr Akbar's blueprint
 * ("Dental Nation Investor Evidence Room — Final Content Blueprint").
 *
 * This file is his copy, structured: the cover, the primary navigation, the
 * platform-overview narrative and the three-way comparison table. The landing
 * page renders it; the sections it links to are the LIVE reports the group
 * already runs — the room adds navigation, never a second copy of a number.
 */

export const ROOM = {
  cover: {
    kicker: 'Dental Nation Platform',
    title: 'From Independent Clinics to One Scalable Healthcare Operating Platform',
    sub: 'Built in Dubai. Structured for repeatable deployment across clinics, specialties and markets.',
    confidential: 'Strictly confidential — approved investor recipients only',
  },

  overviewTitle: 'Platform overview',
  overview:
    'Dental Nation has transformed real operating experience into a centralized, technology-enabled and repeatable healthcare operating platform. Its Dubai network serves as the live validation environment where clinical standards, patient journeys, shared services, technology, performance control, demand generation and expansion playbooks are developed, tested and refined before redeployment.',
  whyTitle: 'Why this is a platform',
  why:
    'Dental Nation does not only own or coordinate clinics. It provides a shared operating backbone that can be reused across M&A clinics, de novo developments, existing-clinic transformations and specialist centers — without rebuilding governance, systems, brand, patient journeys and management control each time.',

  comparisonTitle: 'Independent clinic vs. clinic chain vs. Dental Nation platform',
  comparisonSub:
    'The distinction is not ownership alone; it is whether the operating system can be transferred, measured and improved across multiple clinical assets.',
  comparisonHeaders: ['Dimension', 'Independent clinic', 'Traditional clinic chain', 'Dental Nation scalable platform'],
  comparison: [
    [
      'Operating model',
      'Each clinic operates through its own team, processes and decisions.',
      'Clinics share ownership, but many activities remain locally managed.',
      'All clinics operate through one shared backbone covering governance, services, technology, brand and performance control.',
    ],
    [
      'Clinical care',
      'Clinical standards and patient experience depend largely on the individual clinic or clinician.',
      'Selected standards are shared, but execution may vary by location.',
      'Network-wide governance, care pathways, referral protocols and a connected patient journey support consistent care.',
    ],
    [
      'Central services',
      'HR, finance, procurement, IT and administration are managed separately.',
      'Selected support functions are centralized, with varying coverage.',
      'Seven core functions are structured for centralized delivery across the network.',
    ],
    [
      'Technology and data',
      'Standalone systems, manual workflows and retrospective reporting.',
      'Common systems may exist, but integration and visibility remain limited.',
      'Connected systems, dashboards, automation and AI enable group-to-clinician visibility and faster decisions.',
    ],
    [
      'Growth model',
      'Every new clinic must be established largely from the beginning.',
      'Growth comes from adding more clinics to the existing chain.',
      'Repeatable playbooks support M&A, de novo development, clinic transformation and specialist centers.',
    ],
  ],

  /** The primary navigation — each card opens a live report under the same token. */
  sections: [
    {
      key: 'growth',
      title: 'Growth Department Live Dashboard',
      blurb:
        'The Growth Department Investor Report — live performance: revenue attribution, the patient journey funnel, channel economics, the P&L bridge and the forward pipeline. Every figure live from the group platform, refreshed every 15 minutes.',
      status: 'live' as const,
    },
    {
      key: 'operations',
      title: 'Operating Platform reports',
      blurb:
        'The Head of Operations report — the operating platform in full: branch traction, operating leverage, governance, the orchestration layer, procurement and shared services. Maintained live by the Operations Director.',
      status: 'live' as const,
    },
    {
      key: 'finance',
      title: 'Financial reports',
      blurb:
        'Consolidated financial reporting for the group. Clinic-level billed revenue is live today inside the Growth dashboard; the consolidated P&L pack is in preparation with the finance team.',
      status: 'preparing' as const,
    },
  ],
} as const;
