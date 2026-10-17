/** Existing Growth Platforms booking-status rule, shared with reception counts. */
export function bookedFrom(status: string | null): boolean {
  const s = (status ?? '').trim().toLowerCase();
  return s === 'booked' || s === 'confirmed' || s === 'attended' || s === 'completed';
}
