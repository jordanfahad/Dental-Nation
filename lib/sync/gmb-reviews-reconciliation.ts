import { z } from 'zod';

const reviewSchema = z.object({
  reviewId: z.string().min(1).refine((id) => id.trim() === id),
  reviewer: z.object({ displayName: z.string().optional() }).optional(),
  starRating: z.enum(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE']),
  comment: z.string().optional(),
  createTime: z.string().datetime({ offset: true }),
  updateTime: z.string().datetime({ offset: true }).optional(),
  reviewReply: z.object({
    comment: z.string().optional(),
    updateTime: z.string().datetime({ offset: true }).optional(),
  }).optional(),
});

const pageSchema = z.object({
  reviews: z.array(reviewSchema).default([]),
  averageRating: z.number().min(0).max(5).optional(),
  totalReviewCount: z.number().int().nonnegative().optional(),
  nextPageToken: z.string().optional(),
  error: z.never().optional(),
});

export type ApiReview = z.infer<typeof reviewSchema>;

/** A malformed row invalidates the page; silently dropping it could remove a live review. */
export function parseGmbReviewsPage(payload: unknown) {
  const parsed = pageSchema.safeParse(payload);
  if (!parsed.success) throw new Error('reviews.list payload is malformed; reconciliation skipped');
  return parsed.data;
}

/** IDs absent from a complete location snapshot. An empty snapshot never removes anything. */
export function missingGmbReviewIds(
  storedIds: readonly string[],
  payloadIds: readonly string[],
): string[] {
  if (payloadIds.length === 0) return [];
  const present = new Set(payloadIds);
  return [...new Set(storedIds)].filter((id) => !present.has(id));
}
