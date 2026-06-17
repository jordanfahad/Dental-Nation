import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the SERVICE-ROLE key. NEVER import this in a
 * client component — the service-role key bypasses RLS. The dashboard is fully
 * server-rendered, so no browser Supabase client is needed.
 */
// Loosely-typed client: we don't use generated Database types, and the client is
// bound to the non-default `lane_e` schema, so keep the schema generic open.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminClient = SupabaseClient<any, any, any>;

let cached: AdminClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Returns the admin client, or null when env is not configured (mock mode). */
export function getSupabaseAdmin(): AdminClient | null {
  if (!isSupabaseConfigured()) return null;
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      // Lane E lives in its own schema (see migration), not `public`.
      db: { schema: 'lane_e' },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return cached;
}

/** Throwing variant for the sync pipeline, where Supabase is required. */
export function requireSupabaseAdmin(): AdminClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return client;
}
