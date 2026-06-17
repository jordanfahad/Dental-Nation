'use server';

import { revalidatePath } from 'next/cache';
import { runSync } from '@/lib/sync';

export interface RefreshResult {
  ok: boolean;
  status: string;
  message: string;
}

/** "Refresh now" — force a pull without waiting for the next cron tick (§11). */
export async function refreshNow(): Promise<RefreshResult> {
  try {
    const summary = await runSync('manual');
    revalidatePath('/');
    return {
      ok: summary.status === 'success' || summary.status === 'partial',
      status: summary.status,
      message: summary.message,
    };
  } catch (err) {
    return { ok: false, status: 'failed', message: (err as Error).message };
  }
}
