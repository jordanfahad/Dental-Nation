import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOrthoDashboard, chargeKind, funnelFor, isOrthoLead, leadOutcome, segmentOfAd, segmentOfLead, weeksOf, type Sources,
} from '../lib/ortho/dashboard';
import { weeklyRanges } from '../lib/alerts/orthoWeekly';
import { ALL_ALERTS, sendsLiveOn } from '../lib/alerts/registry';

const R = { from: '2026-10-26', to: '2026-11-01' };
const EMPTY: Sources = { google: [], googleAds: [], meta: [], leads: [], appts: [], firstVisit: new Map(), bills: [] };

test('segments: ad names map to S1, S2, S3; a DNO code tags a lead', () => {
  assert.equal(segmentOfAd('Teeth Straightening in Dubai'), 'S1');
  assert.equal(segmentOfAd('Invisalign in Dubai'), 'S1');
  assert.equal(segmentOfAd('Lost or Broken Retainer?'), 'S2');
  assert.equal(segmentOfAd('Teeth Shifting After Braces?'), 'S2');
  assert.equal(segmentOfAd('Orthodontist for Kids in Dubai'), 'S3');
  assert.equal(segmentOfAd('Braces for Kids and Teens'), 'S3');
  assert.equal(segmentOfLead({ Notes: 'Hi, ortho assessment please (DNO-S2)' }), 'S2');
  assert.equal(segmentOfLead({ Notes: 'braces' }), null);
});

test('leads: ortho rows from lead tabs only; outcomes from Status', () => {
  assert.equal(isOrthoLead({ _source_tab: 'Leads', 'Service / Inquiry Type': 'gap in my teeth - braces and clear aligners' }), true);
  assert.equal(isOrthoLead({ _source_tab: 'Leads', 'Service / Inquiry Type': 'cleaning' }), false);
  assert.equal(isOrthoLead({ _source_tab: 'Smile Club', 'Service / Inquiry Type': 'braces' }), false);
  assert.equal(leadOutcome({ Status: 'Arrived' }), 'booked');
  assert.equal(leadOutcome({ Status: 'No answer' }), 'noAnswer');
  assert.equal(leadOutcome({ Status: 'Internatioanl number' }), 'international');
  assert.equal(leadOutcome({ Status: 'Not interested' }), 'notInterested');
  assert.equal(leadOutcome({ Status: 'Interested' }), 'interested');
  assert.equal(leadOutcome({}), 'other');
});

test('Practo charges: assessment, start (not subsequent visits), other ortho', () => {
  assert.equal(chargeKind('Pre-Orthodontic Treatment Visit'), 'assessment');
  assert.equal(chargeKind('Comprehensive orthodontic treatment of the adult dentition,ceramic'), 'start');
  assert.equal(chargeKind('Limited Orthodontic Treatment Of The Transitional Dentition (Without VAT)'), 'start');
  assert.equal(chargeKind('Comprehensive Orthodontic Treatment Subsequent Visits only'), 'ortho');
  assert.equal(chargeKind('Essix Retainer /Per Arch'), 'ortho');
  assert.equal(chargeKind('Scaling'), null);
});

test('weeks run Monday to Sunday and are clipped to the range', () => {
  assert.deepEqual(weeksOf({ from: '2026-10-28', to: '2026-11-03' }), [
    { from: '2026-10-28', to: '2026-11-01' }, { from: '2026-11-02', to: '2026-11-03' },
  ]);
  assert.deepEqual(weeklyRanges('2026-11-09'), {
    lastWeek: { from: '2026-11-02', to: '2026-11-08' },
    weekBefore: { from: '2026-10-26', to: '2026-11-01' },
    since: { from: '2026-09-01', to: '2026-11-08' },
  });
});

test('funnel: spend, people, enquiries, visits, new patients, starts; unreadable is null, never 0', () => {
  const s: Sources = {
    google: [{ campaign_name: 'Search | DNO Ortho | EN | Dubai | 2026-10', date: '2026-10-27', spend: '50.5', impressions: 200, clicks: 5 },
      { campaign_name: 'Search | Brand', date: '2026-10-27', spend: 99, impressions: 1, clicks: 1 }],
    googleAds: [{ ad_name: 'Invisalign in Dubai', day: '2026-10-27', spend: 30 }, { ad_name: 'Kids Braces', day: '2026-10-27', spend: 20.5 }],
    meta: [{ campaign_name: 'New Angles', adset_name: 'Ortho Everyday Experts | English', date: '2026-10-28', spend: 40,
      data: { actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '4' }, { action_type: 'onsite_conversion.messaging_user_depth_2_message_send', value: '3' }] } },
    { campaign_name: 'Tooth Gap', adset_name: 'General', date: '2026-10-28', spend: 99, data: null }],
    leads: [{ inquiry_date: '2026-10-29', raw_row: { _source_tab: 'Leads', 'Service / Inquiry Type': 'braces', Status: 'Booked' } },
      { inquiry_date: '2026-10-29', raw_row: { _source_tab: 'Leads', 'Service / Inquiry Type': 'braces', Status: 'No answer' } }],
    appts: [{ appt_date: '2026-10-29', status: 'Completed', doctor: 'Dr. Hasna Alsaeed', mr_no: 'A' },
      { appt_date: '2026-10-29', status: 'Arrived', doctor: 'Dr.Yahya Serif Tosun', mr_no: 'B' },
      { appt_date: '2026-10-30', status: 'Cancel', doctor: 'Dr. Hasna Alsaeed', mr_no: 'C' }],
    firstVisit: new Map([['A', '2026-10-29'], ['B', '2026-01-02']]),
    bills: [{ bill_date: '2026-10-30', data: { charges: [{ description: 'Pre-Orthodontic Treatment Visit', amount: 550 },
      { description: 'Comprehensive orthodontic treatment of the adult dentition,ceramic', amount: 18000 }, { description: 'Scaling', amount: 300 }] } }],
  };
  const f = funnelFor(s, R);
  assert.equal(f.googleSpend, 50.5);
  assert.equal(f.metaSpend, 40);
  assert.equal(f.spend, 90.5);
  assert.equal(f.metaPeople, 4);
  assert.equal(f.metaRealPeople, 3);
  assert.equal(f.leads, 2);
  assert.equal(f.leadsBooked, 1);
  assert.equal(f.appointments, 3);
  assert.equal(f.attended, 2);
  assert.equal(f.newAttended, 1);
  assert.equal(f.assessments, 1);
  assert.equal(f.starts, 1);
  assert.equal(f.startsAed, 18000);
  assert.equal(f.orthoBilled, 18550);
  const d = buildOrthoDashboard(s, R);
  assert.deepEqual(d.segments.map((x) => x.googleSpend), [30, 0, 20.5]);
  assert.equal(d.metaAdSets?.length, 1);
  const none = funnelFor({ ...EMPTY, google: null, bills: null, firstVisit: null }, R);
  assert.equal(none.googleSpend, null);
  assert.equal(none.spend, null);
  assert.equal(none.starts, null);
  assert.equal(none.newAttended, null);
  assert.equal(none.leads, 0);
});

test('weekly email: Mondays only, from 9 Nov 2026', () => {
  const weekly = ALL_ALERTS.find((a) => a.kind === 'am:ortho-weekly')!;
  // Ms Shadi came off the weekly email on 12 Nov 2026.
  assert.deepEqual([...weekly.to], ['luvi', 'akbar']);
  assert.deepEqual([...weekly.cc], ['fahad']);
  assert.equal(sendsLiveOn(weekly, '2026-11-02'), false); // a Monday before the first send
  assert.equal(sendsLiveOn(weekly, '2026-11-09'), true);
  assert.equal(sendsLiveOn(weekly, '2026-11-10'), false);
  assert.equal(sendsLiveOn(weekly, '2026-11-16'), true);
});

test('creatives: one card per ortho ad with spend, image and copy, highest spend first', async () => {
  const { buildCreatives } = await import('../lib/ortho/dashboard');
  const meta = [
    { ad_id: 'a1', ad_name: 'Ortho | gap | EN', adset_name: 'Ortho Everyday Experts | English', campaign_name: 'New Angles', date: '2026-10-27', spend: 40,
      data: { actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '4' }, { action_type: 'onsite_conversion.messaging_user_depth_2_message_send', value: '2' }] } },
    { ad_id: 'a1', ad_name: 'Ortho | gap | EN', adset_name: 'Ortho Everyday Experts | English', campaign_name: 'New Angles', date: '2026-10-28', spend: 20, data: null },
    { ad_id: 'a2', ad_name: 'Ortho | kids | AR', adset_name: 'Ortho Everyday Experts | Arabic', campaign_name: 'New Angles', date: '2026-10-27', spend: 70, data: null },
    { ad_id: 'x', ad_name: 'Whitening', adset_name: 'General', campaign_name: 'Tooth Gap', date: '2026-10-27', spend: 99, data: null },
  ];
  const creatives = [{ ad_id: 'a1', ad_name: null, thumbnail_url: 'https://cdn.example.invalid/t.jpg', image_url: null, title: 'Close the gap', body: 'Braces and aligners', headlines: null, descriptions: null }];
  const google = [{ ad_name: 'Braces for Kids and Teens', day: '2026-10-27', spend: 10 }];
  const googleCreatives = [{ ad_id: 'g', ad_name: 'Braces for Kids and Teens', thumbnail_url: null, image_url: null, title: null, body: null, headlines: ['Braces for Kids', 'When to start'], descriptions: ['An assessment is not a commitment.'] }];
  const cards = buildCreatives(meta, creatives, google, googleCreatives, R);
  assert.deepEqual(cards.map((c) => [c.adId, c.spend]), [['a2', 70], ['a1', 60], ['Braces for Kids and Teens', 10]]);
  const a1 = cards.find((c) => c.adId === 'a1')!;
  assert.equal(a1.imageUrl, 'https://cdn.example.invalid/t.jpg');
  assert.equal(a1.title, 'Close the gap');
  assert.equal(a1.realPeople, 2);
  assert.equal(a1.lastSpend, '2026-10-28');
  const g = cards.find((c) => c.platform === 'google')!;
  assert.equal(g.group, 'S3 parents');
  assert.equal(g.title, 'Braces for Kids | When to start');
  assert.equal(cards.some((c) => c.adId === 'x'), false, 'non-ortho ads are left out');
});
