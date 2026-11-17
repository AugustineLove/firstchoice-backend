import { Router } from "express";
import { prisma } from "../config/prisma";
import { Prisma } from '@prisma/client';
export type PromoScope = 'MARKETPLACE' | 'PICKUP' | 'ERRAND';


export type DeliveryQuote = {
  distanceKm: number | null;
  baseFee: number;          // before discount
  discount: number;
  finalFee: number;
  promotionId: string | null;
  promotionName: string | null;
};

const toRad = (d: number) => (d * Math.PI) / 180;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function quoteDelivery(input: {
  vendorId?: string;       // was required
  scope?: PromoScope;      // default MARKETPLACE
  pickupLat?: number | null;
  pickupLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
  subtotal?: number;
  distanceKm?: number | null; // admin simulator only
  customerId?: string;
  promoCode?: string;
}): Promise<DeliveryQuote> {
  const scope = input.scope ?? 'MARKETPLACE';
  const code = input.promoCode?.trim().toUpperCase();
  const cfg =
  (await prisma.deliveryPricingConfig.findFirst({ where: { active: true } })) ??
  { baseFee: 5, perKmRate: 2, minFee: 5, maxFee: null as number | null, surgeMultiplier: 1, fallbackFee: 10 };

  // 1. base fee
  let distanceKm: number | null = null;
  if (input.distanceKm != null) {
    distanceKm = input.distanceKm;
  } else if (input.pickupLat != null && input.pickupLng != null && input.destLat != null && input.destLng != null) {
    distanceKm = haversineKm(input.pickupLat, input.pickupLng, input.destLat, input.destLng);
  }

  let baseFee: number;
  if (distanceKm == null) {
    baseFee = cfg.fallbackFee;
  } else {
    baseFee = (cfg.baseFee + distanceKm * cfg.perKmRate) * cfg.surgeMultiplier;
    baseFee = Math.max(baseFee, cfg.minFee);
    if (cfg.maxFee != null) baseFee = Math.min(baseFee, cfg.maxFee);
  }
  baseFee = Math.round(baseFee);

  // 2. best applicable promotion
  const now = new Date();
  const promos = await prisma.deliveryPromotion.findMany({
    where: {
    active: true,
    startsAt: { lte: now },
    endsAt: { gte: now },
    appliesTo: { has: scope },
    AND: [
      // vendor-specific promos must never leak onto requests with no vendor
      input.vendorId ? { OR: [{ vendorId: null }, { vendorId: input.vendorId }] } : { vendorId: null },
      { OR: [{ code: null }, ...(code ? [{ code }] : [])] },
    ],
  },
  });

  let best: { discount: number; promo: (typeof promos)[number] } | null = null;
  for (const p of promos) {
    if (p.usageLimit != null && p.usedCount >= p.usageLimit) continue;
    if (p.minSubtotal != null && (input.subtotal ?? 0) < p.minSubtotal) continue;
    // (perUserLimit check: count this customer's past orders with promotionId = p.id)
    if (p.perUserLimit != null && input.customerId) {
      const [o, d] = await Promise.all([
        prisma.order.count({ where: { customerId: input.customerId, promotionId: p.id, orderStatus: { not: 'CANCELLED' } } }),
        prisma.deliveryRequest.count({ where: { customerId: input.customerId, promotionId: p.id, status: { not: 'CANCELLED' } } }),
      ]);
      if (o + d >= p.perUserLimit) continue;
    }

    let discount = 0;
    if (p.type === 'FREE_DELIVERY') discount = baseFee;
    else if (p.type === 'FIXED_OFF') discount = p.value;
    else if (p.type === 'PERCENT_OFF') {
      discount = (baseFee * p.value) / 100;
      if (p.maxDiscount != null) discount = Math.min(discount, p.maxDiscount);
    }
    discount = Math.min(Math.round(discount), baseFee);
    if (!best || discount > best.discount) best = { discount, promo: p };
  }

  const discount = best?.discount ?? 0;
  return {
    distanceKm,
    baseFee,
    discount,
    finalFee: baseFee - discount,
    promotionId: best?.promo.id ?? null,
    promotionName: best?.promo.name ?? null,
  };
}

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function registerDeliveryPricingRoutes(router: Router, auth: any) {
  router.post('/delivery-quote', auth, async (req: any, res: any) => {
    try {
      const { vendorId, deliveryLatitude, deliveryLongitude, subtotal, promoCode } = req.body ?? {};
      if (!vendorId) return res.status(400).json({ error: 'vendorId is required' });

      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

      const quote = await quoteDelivery({
        vendorId,
        pickupLat: toNum(vendor.latitude),
        pickupLng: toNum(vendor.longitude),
        destLat: toNum(deliveryLatitude),
        destLng: toNum(deliveryLongitude),
        subtotal: toNum(subtotal) ?? 0,
        customerId: req.user.id,
        promoCode,
      });
      res.json(quote);
    } catch (e: any) {
      res.status(500).json({ error: e.message ?? 'Could not calculate delivery fee' });
    }
  });
}

export async function redeemPromotion(tx: Prisma.TransactionClient, promotionId: string | null) {
  if (!promotionId) return;
  const p = await tx.deliveryPromotion.update({
    where: { id: promotionId },
    data: { usedCount: { increment: 1 } },
  });
  if (p.usageLimit != null && p.usedCount > p.usageLimit) {
    throw new Error('That promotion has just ended. Please try again.');
  }
}