import 'server-only';
import { discoveredGmbClinic, GMB_CLINICS } from '@/config/gmb-clinics';

export interface DiscoveredGmbAccount {
  account: string;
  locations: { id: string; title: string }[];
}

/** Enumerate every account and location page. Only configured locations are
 * subsequently synced; discovery itself grants no permission to ingest them. */
export async function discoverGmbLocations(token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  async function pages<T>(base: string, field: string): Promise<T[]> {
    const rows: T[] = [];
    const seen = new Set<string>();
    let pageToken: string | undefined;
    do {
      const url = new URL(base);
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const res = await fetch(url.toString(), { headers, cache: 'no-store' });
      if (!res.ok) throw new Error(`GMB discovery HTTP ${res.status}`);
      const data = await res.json();
      if (data[field] != null && !Array.isArray(data[field])) throw new Error('Invalid GMB discovery response');
      rows.push(...(data[field] ?? []));
      pageToken = data.nextPageToken;
      if (pageToken) {
        if (typeof pageToken !== 'string' || seen.has(pageToken)) throw new Error('Invalid GMB discovery pagination');
        seen.add(pageToken);
      }
    } while (pageToken);
    return rows;
  }
  const accounts = await pages<{ name?: string }>('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', 'accounts');
  const discovered: DiscoveredGmbAccount[] = [];
  let failedAccounts = 0;
  for (const account of accounts) {
    if (!account.name) continue;
    try {
      const locations = await pages<{ name?: string; title?: string }>(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title&pageSize=100`, 'locations',
      );
      discovered.push({ account: account.name, locations: locations.filter((l) => l.name).map((l) => ({ id: l.name!, title: l.title ?? '' })) });
    } catch {
      failedAccounts += 1;
    }
  }
  return { accounts: discovered, failedAccounts };
}

/** Values to review and paste, never an automatic write. Ambiguity fails closed. */
export function gmbDiscoveryValues(accounts: DiscoveredGmbAccount[]) {
  const byPath = new Map(accounts.flatMap((a) => a.locations).map((l) => [l.id, l]));
  const matches = [...byPath.values()].flatMap((l) => {
    const clinic = discoveredGmbClinic(l.title);
    return clinic ? [{ ...l, clinic }] : [];
  });
  if (!matches.length || new Set(matches.map((l) => l.clinic)).size !== matches.length) return null;
  matches.sort((a, b) => GMB_CLINICS.findIndex((c) => c.key === a.clinic) - GMB_CLINICS.findIndex((c) => c.key === b.clinic));
  return {
    gmb_location_ids: matches.map((l) => l.id).join(','),
    gmb_location_labels: matches.map((l) => l.title.replace(/,/g, ' ')).join(','),
    gmb_location_clinics: matches.map((l) => l.clinic).join(','),
  };
}
