import type { AdminClient } from '../../lib/supabase/server';

/** In-memory PostgREST-shaped fixture. No client creation, credentials or network. */
export function fixtureDb(tables: Record<string, Record<string, unknown>[]>, failed?: string): AdminClient {
  return { from(table: string) {
    let rows = [...(tables[table] ?? [])];
    const result = () => ({ data: failed === table ? null : rows, error: failed === table ? { message: 'synthetic failure' } : null });
    const q = {
      select() { return q; }, order() { return q; }, limit(n: number) { rows = rows.slice(0, n); return q; },
      eq(key: string, value: unknown) { rows = rows.filter((r) => r[key] === value); return q; },
      is(key: string, value: unknown) { rows = rows.filter((r) => (r[key] ?? null) === value); return q; },
      in(key: string, values: unknown[]) { rows = rows.filter((r) => values.includes(r[key])); return q; },
      gte(key: string, value: string) { rows = rows.filter((r) => String(r[key]) >= value); return q; },
      lte(key: string, value: string) { rows = rows.filter((r) => String(r[key]) <= value); return q; },
      async range(from: number, to: number) { const r = result(); return { ...r, data: r.data?.slice(from, to + 1) ?? null }; },
      async maybeSingle() { const r = result(); return { ...r, data: r.data?.[0] ?? null }; },
      then(resolve: (r: unknown) => void) { resolve(result()); },
    };
    return q;
  } } as unknown as AdminClient;
}
