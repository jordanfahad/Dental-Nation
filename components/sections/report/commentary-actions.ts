'use server';

import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/auth/role';
import { setCommentary } from '@/lib/report/commentary';

/** Save a Board-Report commentary block (admin only). */
export async function saveCommentary(slug: string, body: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: 'Admin only.' };
  const res = await setCommentary(slug, body);
  if (res.ok) revalidatePath('/');
  return res;
}
