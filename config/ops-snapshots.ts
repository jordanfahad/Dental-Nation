/**
 * Dated operational snapshots from the Head of Operations' 11 Sep 2026
 * handover — used by the DN Ortho and Daily Appointment Report portals.
 * These are SNAPSHOTS, labelled as such on every card: they update when the
 * next files land in the Data Drop (they are not live feeds). No
 * patient-level data is stored here — aggregates only.
 */

export const ORTHO_SNAPSHOT = {
  asOf: '23–25 Aug 2026 (daily tracker) · 29 Aug 2026 (Instagram insights)',
  tracker: {
    booked: 70,
    attended: 53,
    newPatients: 9,
    revenue: 21360,
    rows: [
      { date: '25 Aug', doctor: 'Dr. Yahya', branch: 'Dr Tosun', booked: 13, attended: 11, oldP: 4, newP: 7, revenue: 1500 },
      { date: '23 Aug', doctor: 'Dr. Hasna', branch: 'DN Al Wasl', booked: 36, attended: 30, oldP: 28, newP: 2, revenue: 14130 },
      { date: '23 Aug', doctor: 'Dr. Yasmin', branch: 'DN Al Wasl', booked: 19, attended: 10, oldP: 10, newP: 0, revenue: 3730 },
      { date: '23 Aug', doctor: 'Dr. Suzana', branch: 'Al Maher', booked: 2, attended: 2, oldP: 2, newP: 0, revenue: 2000 },
    ],
  },
  instagram: {
    views: 10059,
    uniqueViewers: 2832,
    interactions: 273,
    netFollowers: 12,
    followers: 2689,
    followerViewShare: 42.4,
  },
  unconverted: {
    pool: 105,
    contacted: 11,
    pending: 94,
    byBranch: [
      { branch: 'DN Al Wasl', cases: 8, contacted: 8, pending: 0 },
      { branch: 'Dr Tosun', cases: 63, contacted: 3, pending: 60 },
      { branch: 'Al Maher', cases: 34, contacted: 0, pending: 34 },
    ],
  },
};

export const DAILY_REPORT_SNAPSHOT = {
  reportDate: '27.08.2026',
  branches: [
    {
      branch: 'Dr. Tosun Dental Br.', preparedBy: 'Ross & Christine', submitted: '6:30 PM',
      attendedWithAppt: 19, walkIn: 0, totalServed: 19, newPatients: 1, noShows: 2, cancelled: 0,
      totalBooked: 21, servicesProvided: 20, attendanceRate: '90.5%', noShowRate: '9.5%', topService: 'Ortho Visit',
    },
    {
      branch: 'Dental Nation — Al Wasl', preparedBy: 'Hasan', submitted: '5:00 PM',
      attendedWithAppt: 0, walkIn: 1, totalServed: 1, newPatients: 1, noShows: 0, cancelled: 0,
      totalBooked: 0, servicesProvided: 0, attendanceRate: 'N/A', noShowRate: 'N/A', topService: '—',
    },
    {
      branch: 'Dental Nation — Al Maher Medical Centre', preparedBy: 'Dalia', submitted: '5:00 PM',
      attendedWithAppt: 1, walkIn: 0, totalServed: 1, newPatients: 0, noShows: 0, cancelled: 0,
      totalBooked: 1, servicesProvided: 1, attendanceRate: '100.0%', noShowRate: '0.0%', topService: 'N/A',
    },
  ],
};
