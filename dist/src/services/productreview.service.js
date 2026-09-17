"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitReview = submitReview;
exports.getProductReviews = getProductReviews;
exports.getProductReviewSummary = getProductReviewSummary;
exports.deleteReview = deleteReview;
const prisma_1 = require("../config/prisma");
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
};
// ─── CREATE / UPDATE (one review per customer per product) ──
async function submitReview(userId, productId, data) {
    const rating = Math.round(Number(data.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
    }
    const product = await prisma_1.prisma.product.findUnique({ where: { id: productId } });
    if (!product)
        throw new Error('Product not found');
    // If an orderId was supplied, sanity-check it actually belongs to this
    // customer and this product before we let it flag "verified purchase".
    let verifiedOrderId = null;
    if (data.orderId) {
        const item = await prisma_1.prisma.orderItem.findFirst({
            where: { orderId: data.orderId, productId },
            include: { order: true },
        });
        if (item && item.order.customerId === userId)
            verifiedOrderId = data.orderId;
    }
    return prisma_1.prisma.productReview.upsert({
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
async function getProductReviews(productId, limit = 50) {
    return prisma_1.prisma.productReview.findMany({
        where: { productId },
        include: { customer: { select: reviewerSelect } },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}
// ─── SUMMARY (average + star breakdown) ─────────────────
async function getProductReviewSummary(productId, userId) {
    const reviews = await prisma_1.prisma.productReview.findMany({
        where: { productId },
        select: { rating: true, customerId: true },
    });
    const count = reviews.length;
    const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) {
        const bucket = Math.min(5, Math.max(1, r.rating));
        breakdown[bucket] += 1;
    }
    const myReview = userId
        ? await prisma_1.prisma.productReview.findUnique({
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
async function deleteReview(userId, reviewId) {
    const review = await prisma_1.prisma.productReview.findUnique({ where: { id: reviewId } });
    if (!review)
        throw new Error('Review not found');
    if (review.customerId !== userId)
        throw new Error('Access denied');
    await prisma_1.prisma.productReview.delete({ where: { id: reviewId } });
    return { message: 'Review deleted' };
}
//# sourceMappingURL=productreview.service.js.map