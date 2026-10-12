'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/auth/role';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function savePerformanceNote(_previous: { message: string }, form: FormData): Promise<{ message: string }> {
  // Only the owner/admin can edit the CEO's action note; the operations grant is read-only here.
  const user = await currentUser();
  if (!process.env.AUTH_SESSION_SECRET || !process.env.DASHBOARD_PASSWORD || user?.role !== 'admin') return { message: 'Only the owner can update this note.' };
  const body = form.get('body');
  if (typeof body !== 'string' || body.length > 6000) return { message: 'Use no more than 6,000 characters.' };
  const db = getSupabaseAdmin();
  if (!db) return { message: 'The note could not be saved. Please try again.' };
  const { error } = await db.from('performance_notes').upsert({ key: 'akbar-plan', body, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return { message: 'The note could not be saved. Please try again.' };
  revalidatePath('/');
  return { message: 'Saved for the next daily performance brief.' };
}
