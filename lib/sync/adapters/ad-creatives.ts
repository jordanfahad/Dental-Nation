const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown) => typeof v === 'string' || typeof v === 'number' ? String(v) : '';
export function creativeUrl(value: unknown): string | null {
  try { const url = new URL(text(value)); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export function metaCreative(value: unknown, now: string) {
  const ad = object(value), creative = object(ad.creative), story = object(creative.object_story_spec);
  const link = object(story.link_data), video = object(story.video_data), photo = object(story.photo_data);
  const cta = object(link.call_to_action ?? video.call_to_action);
  if (!text(ad.id)) throw new Error('Meta creative has no ad id');
  return { platform: 'meta', ad_id: text(ad.id), campaign_name: text(object(ad.campaign).name), ad_name: text(ad.name),
    creative_id: text(creative.id), thumbnail_url: creativeUrl(creative.thumbnail_url ?? creative.image_url), image_url: creativeUrl(creative.image_url ?? link.picture ?? photo.url),
    video_id: text(creative.video_id ?? video.video_id), body: text(creative.body ?? link.message ?? video.message ?? photo.caption),
    title: text(creative.title ?? link.name ?? video.title), cta: text(creative.call_to_action_type ?? cta.type),
    link_url: creativeUrl(link.link ?? object(cta.value).link), headlines: [], descriptions: [], fetched_at: now };
}
export function googleCreative(value: unknown, customer: string, now: string) {
  const row = object(value), ad = object(object(row.adGroupAd).ad), rsa = object(ad.responsiveSearchAd);
  if (!text(ad.id)) throw new Error('Google creative has no ad id');
  const texts = (v: unknown) => Array.isArray(v) ? v.map((r) => text(object(r).text)).filter(Boolean) : [];
  const headlines = texts(rsa.headlines), descriptions = texts(rsa.descriptions);
  return { platform: 'google', ad_id: `${customer}:${text(ad.id)}`, campaign_name: text(object(row.campaign).name), ad_name: text(ad.name) || headlines[0] || 'Responsive search ad',
    creative_id: text(ad.id), thumbnail_url: null, image_url: null, video_id: '', body: descriptions.join(' | '), title: headlines.join(' | '),
    cta: '', link_url: creativeUrl(Array.isArray(ad.finalUrls) ? ad.finalUrls[0] : null), headlines, descriptions, fetched_at: now };
}
