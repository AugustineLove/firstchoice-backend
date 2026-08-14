import { prisma } from '../config/prisma';

// ─── TYPES ───────────────────────────────────────────────

interface CreateReviewInput {
  rating: number;
  comment?: string;
  images?: string[];
  orderId?: string;
}

// Only expose what a reviewer's name + avatar-initial can show — never
// phone/email. Reviewer-to-reviewer contact is not something we build:
// a customer who wants to ask about a product contacts the VENDOR
// (see the "Contact vendor" affordance on the product page), not another
// shopper. Keeping this select narrow is what makes that guarantee hold
// even if the include list elsewhere ever grows.
const reviewerSelect = {
  id: true,
  name: true,
  profileImage: true,
} as const;

// ─── CREATE / UPDATE (one review per customer per product) ──

export async function submitReview(userId: string, productId: string, data: CreateReviewInput) {
  const rating = Math.round(Number(data.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');

  // If an orderId was supplied, sanity-check it actually belongs to this
  // customer and this product before we let it flag "verified purchase".
  let verifiedOrderId: string | null = null;
  if (data.orderId) {
    const item = await prisma.orderItem.findFirst({
      where: { orderId: data.orderId, productId },
      include: { order: true },
    });
    if (item && item.order.customerId === userId) verifiedOrderId = data.orderId;
  }

  return prisma.productReview.upsert({
    where: { productId_customerId: { productId, customerId: userId } },
    update: {
      rating,
      comment: data.comment?.trim() || null,
      images: data.images ?? [],
      ...(verifiedOrderId && { orderId: verifiedOrderId }),
    },
    create: {
      productId,
      customerId: userId,
      rating,
      comment: data.comment?.trim() || null,
      images: data.images ?? [],
      orderId: verifiedOrderId,
    },
    include: { customer: { select: reviewerSelect } },
  });
}

// ─── LIST ────────────────────────────────────────────────

export async function getProductReviews(productId: string, limit = 50) {
  return prisma.productReview.findMany({
    where: { productId },
    include: { customer: { select: reviewerSelect } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// ─── SUMMARY (average + star breakdown) ─────────────────

export async function getProductReviewSummary(productId: string, userId?: string) {
  const reviews = await prisma.productReview.findMany({
    where: { productId },
    select: { rating: true, customerId: true },
  });

  const count = reviews.length;
  const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;

  const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    const bucket = Math.min(5, Math.max(1, r.rating)) as 1 | 2 | 3 | 4 | 5;
    breakdown[bucket] += 1;
  }

  const myReview = userId
    ? await prisma.productReview.findUnique({
        where: { productId_customerId: { productId, customerId: userId } },
      })
    : null;

  return {
    average: Number(average.toFixed(2)),
    count,
    breakdown,
    myReview,
  };
}

export async function deleteReview(userId: string, reviewId: string) {
  const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error('Review not found');
  if (review.customerId !== userId) throw new Error('Access denied');
  await prisma.productReview.delete({ where: { id: reviewId } });
  return { message: 'Review deleted' };
}