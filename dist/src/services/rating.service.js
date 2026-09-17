"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitVendorRating = submitVendorRating;
exports.getVendorRatingSummary = getVendorRatingSummary;
exports.getVendorRatings = getVendorRatings;
const prisma_1 = require("../config/prisma");
// ─── SUBMIT (one vote per customer, ever) ────────────────
async function submitVendorRating(vendorId, customerId, rating, comment) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error('Rating must be a whole number between 1 and 5');
    }
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor)
        throw new Error('Vendor not found');
    const existing = await prisma_1.prisma.vendorRating.findUnique({
        where: { vendorId_customerId: { vendorId, customerId } },
    });
    if (existing)
        throw new Error('You have already rated this vendor');
    // Create the rating and roll the new average up onto Vendor.rating
    // in a single transaction so the two never drift apart.
    const created = await prisma_1.prisma.$transaction(async (tx) => {
        const newRating = await tx.vendorRating.create({
            data: {
                vendorId,
                customerId,
                rating,
                comment: comment?.trim() ? comment.trim() : null,
            },
        });
        const agg = await tx.vendorRating.aggregate({
            where: { vendorId },
            _avg: { rating: true },
        });
        await tx.vendor.update({
            where: { id: vendorId },
            data: { rating: agg._avg.rating ?? rating },
        });
        return newRating;
    });
    return created;
}
// ─── SUMMARY (average + count + the requesting customer's own vote) ──
async function getVendorRatingSummary(vendorId, customerId) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor)
        throw new Error('Vendor not found');
    const [agg, count, mine] = await Promise.all([
        prisma_1.prisma.vendorRating.aggregate({ where: { vendorId }, _avg: { rating: true } }),
        prisma_1.prisma.vendorRating.count({ where: { vendorId } }),
        customerId
            ? prisma_1.prisma.vendorRating.findUnique({
                where: { vendorId_customerId: { vendorId, customerId } },
            })
            : null,
    ]);
    return {
        average: Number((agg._avg.rating ?? vendor.rating ?? 0).toFixed(2)),
        count,
        myRating: mine
            ? { rating: mine.rating, comment: mine.comment, createdAt: mine.createdAt }
            : null,
    };
}
// ─── LIST (paginated reviews for a vendor's page) ────────
async function getVendorRatings(vendorId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [ratings, total] = await Promise.all([
        prisma_1.prisma.vendorRating.findMany({
            where: { vendorId },
            include: { customer: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma_1.prisma.vendorRating.count({ where: { vendorId } }),
    ]);
    return {
        ratings,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}
//# sourceMappingURL=rating.service.js.map