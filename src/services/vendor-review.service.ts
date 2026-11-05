// vendor-reviews.service.ts
import { prisma } from '../config/prisma';

const shortName = (full?: string | null) => {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Customer';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
};

export async function getVendorReviews(vendorId: string, limit = 50) {
  const take = Math.min(Math.max(limit, 1), 100);

  const [rows, grouped] = await Promise.all([
    prisma.vendorRating.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true, rating: true, comment: true, createdAt: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.vendorRating.groupBy({
      by: ['rating'],
      where: { vendorId },
      _count: { id: true },
    }),
  ]);

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let count = 0, sum = 0;
  for (const g of grouped) {
    distribution[g.rating] = g._count.id;
    count += g._count.id;
    sum += g.rating * g._count.id;
  }

  return {
    average: count ? Math.round((sum / count) * 10) / 10 : 0,
    count,
    distribution,
    reviews: rows.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      author: shortName(r.customer?.name),
    })),
  };
}