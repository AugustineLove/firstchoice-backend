import { Router } from "express";
import { prisma } from "../config/prisma";

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
  vendorId: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
  subtotal?: number;
  customerId?: string;
  promoCode?: string;
}): Promise<DeliveryQuote> {
    const code = input.promoCode?.trim().toUpperCase();
  const cfg =
  (await prisma.deliveryPricingConfig.findFirst({ where: { active: true } })) ??
  { baseFee: 5, perKmRate: 2, minFee: 5, maxFee: null as number | null, surgeMultiplier: 1, fallbackFee: 10 };

  // 1. base fee
  let distanceKm: number | null = null;
  let baseFee: number;
  if (input.pickupLat == null || input.pickupLng == null ||
      input.destLat == null || input.destLng == null) {
    baseFee = cfg.fallbackFee;
  } else {
    distanceKm = haversineKm(input.pickupLat, input.pickupLng, input.destLat, input.destLng);
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
      AND: [
        { OR: [{ vendorId: null }, { vendorId: input.vendorId }] },
        { OR: [{ code: null }, ...(input.promoCode ? [{ code: input.promoCode }] : [])] },
      ],
    },
  });

  let best: { discount: number; promo: (typeof promos)[number] } | null = null;
  for (const p of promos) {
    if (p.usageLimit != null && p.usedCount >= p.usageLimit) continue;
    if (p.minSubtotal != null && (input.subtotal ?? 0) < p.minSubtotal) continue;
    // (perUserLimit check: count this customer's past orders with promotionId = p.id)
    if (p.perUserLimit != null && input.customerId) {
    const used = await prisma.order.count({
        where: { customerId: input.customerId, promotionId: p.id, orderStatus: { not: 'CANCELLED' } },
    });
    if (used >= p.perUserLimit) continue;
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