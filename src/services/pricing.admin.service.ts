import { Router } from 'express';
import { prisma } from '../config/prisma';
import { quoteDelivery } from './delivery-pricing.service';

const DEFAULTS = {
  baseFee: 5,
  perKmRate: 2,
  minFee: 5,
  maxFee: null as number | null,
  surgeMultiplier: 1,
  fallbackFee: 10,
};

const PROMO_TYPES = ['FREE_DELIVERY', 'FIXED_OFF', 'PERCENT_OFF'];

class BadRequest extends Error {}

const optNum = (v: unknown, label: string): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new BadRequest(`${label} must be a non-negative number`);
  return n;
};

const reqNum = (v: unknown, label: string): number => {
  const n = optNum(v, label);
  if (n === null) throw new BadRequest(`${label} is required`);
  return n;
};

const optInt = (v: unknown, label: string): number | null => {
  const n = optNum(v, label);
  if (n === null) return null;
  if (!Number.isInteger(n)) throw new BadRequest(`${label} must be a whole number`);
  return n;
};

const handle =
  (fn: (req: any, res: any) => Promise<any>) =>
  async (req: any, res: any) => {
    try {
      await fn(req, res);
    } catch (e: any) {
      if (e instanceof BadRequest) return res.status(400).json({ success: false, message: e.message });
      if (e?.code === 'P2002') return res.status(409).json({ success: false, message: 'A promotion with that code already exists' });
      if (e?.code === 'P2025') return res.status(404).json({ success: false, message: 'Not found' });
      console.error('[delivery-pricing admin]', e);
      res.status(500).json({ success: false, message: e?.message ?? 'Something went wrong' });
    }
  };

// Validates a promotion. For PATCH, `cur` is the existing row and `b` overlays it,
// so the merged result is always validated as a whole.
function parsePromo(b: any, cur: any = {}) {
  const m = { ...cur, ...b };

  const name = String(m.name ?? '').trim();
  if (!name) throw new BadRequest('Name is required');

  const type = m.type;
  if (!PROMO_TYPES.includes(type)) throw new BadRequest('Invalid promotion type');

  const value = type === 'FREE_DELIVERY' ? 0 : reqNum(m.value, 'Value');
  if (type === 'FIXED_OFF' && value <= 0) throw new BadRequest('Amount off must be greater than 0');
  if (type === 'PERCENT_OFF' && (value <= 0 || value > 100)) throw new BadRequest('Percent must be between 1 and 100');

  const startsAt = new Date(m.startsAt);
  const endsAt = new Date(m.endsAt);
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) throw new BadRequest('Start and end dates are required');
  if (endsAt <= startsAt) throw new BadRequest('End must be after start');

  const code = m.code ? String(m.code).trim().toUpperCase() : null;
  if (code && !/^[A-Z0-9_-]{3,20}$/.test(code)) {
    throw new BadRequest('Code must be 3-20 letters, numbers, - or _');
  }

  return {
    name,
    type,
    value,
    code,
    maxDiscount: optNum(m.maxDiscount, 'Max discount'),
    minSubtotal: optNum(m.minSubtotal, 'Minimum order'),
    vendorId: m.vendorId || null,
    startsAt,
    endsAt,
    usageLimit: optInt(m.usageLimit, 'Usage limit'),
    perUserLimit: optInt(m.perUserLimit, 'Per-customer limit'),
    active: m.active === undefined ? true : !!m.active,
  };
}

export function registerDeliveryPricingAdminRoutes(router: Router) {
  // Config + all promotions
  router.get('/delivery-pricing', handle(async (_req, res) => {
    const [config, promotions] = await Promise.all([
      prisma.deliveryPricingConfig.findFirst({ where: { active: true } }),
      prisma.deliveryPromotion.findMany({ orderBy: [{ active: 'desc' }, { endsAt: 'desc' }] }),
    ]);
    res.json({ success: true, data: { config: config ?? DEFAULTS, promotions } });
  }));

  // Update the live pricing config
  router.put('/delivery-pricing/config', handle(async (req, res) => {
    const b = req.body ?? {};
    const baseFee = reqNum(b.baseFee, 'Base fee');
    const perKmRate = reqNum(b.perKmRate, 'Per-km rate');
    const minFee = reqNum(b.minFee, 'Minimum fee');
    const fallbackFee = reqNum(b.fallbackFee, 'Fallback fee');
    const maxFee = optNum(b.maxFee, 'Maximum fee');
    const surgeMultiplier = reqNum(b.surgeMultiplier, 'Surge multiplier');

    if (surgeMultiplier < 0.5 || surgeMultiplier > 5) throw new BadRequest('Surge multiplier must be between 0.5 and 5');
    if (maxFee !== null && maxFee < minFee) throw new BadRequest('Maximum fee cannot be below the minimum fee');

    const data = { baseFee, perKmRate, minFee, maxFee, surgeMultiplier, fallbackFee };
    const existing = await prisma.deliveryPricingConfig.findFirst({ where: { active: true } });
    const saved = existing
      ? await prisma.deliveryPricingConfig.update({ where: { id: existing.id }, data })
      : await prisma.deliveryPricingConfig.create({ data: { ...data, active: true } });

    res.json({ success: true, data: saved });
  }));

  // Simulator: what would customers pay at these distances right now?
  router.post('/delivery-pricing/preview', handle(async (req, res) => {
    const raw = Array.isArray(req.body?.distances) ? req.body.distances : [1, 2, 3, 5, 8, 12];
    const distances: number[] = raw.map(Number).filter((n: number) => Number.isFinite(n) && n >= 0).slice(0, 20);
    const subtotal = Number(req.body?.subtotal) || 0;
    const promoCode = req.body?.promoCode ? String(req.body.promoCode) : undefined;
    const vendorId = req.body?.vendorId ? String(req.body.vendorId) : '';

    const quotes = await Promise.all(
      distances.map((km) => quoteDelivery({ vendorId, distanceKm: km, subtotal, promoCode })),
    );
    res.json({ success: true, data: quotes });
  }));

  // Promotions
  router.post('/delivery-pricing/promotions', handle(async (req, res) => {
    const data = parsePromo(req.body ?? {});
    const created = await prisma.deliveryPromotion.create({ data });
    res.json({ success: true, data: created });
  }));

  router.patch('/delivery-pricing/promotions/:id', handle(async (req, res) => {
    const cur = await prisma.deliveryPromotion.findUnique({ where: { id: req.params.id } });
    if (!cur) return res.status(404).json({ success: false, message: 'Promotion not found' });
    const data = parsePromo(req.body ?? {}, cur);
    const updated = await prisma.deliveryPromotion.update({ where: { id: cur.id }, data });
    res.json({ success: true, data: updated });
  }));

  // Used promotions are only switched off, never deleted, so order history stays traceable.
  router.delete('/delivery-pricing/promotions/:id', handle(async (req, res) => {
    const cur = await prisma.deliveryPromotion.findUnique({ where: { id: req.params.id } });
    if (!cur) return res.status(404).json({ success: false, message: 'Promotion not found' });
    if (cur.usedCount > 0) {
      await prisma.deliveryPromotion.update({ where: { id: cur.id }, data: { active: false } });
      return res.json({ success: true, data: { deactivated: true } });
    }
    await prisma.deliveryPromotion.delete({ where: { id: cur.id } });
    res.json({ success: true, data: { deleted: true } });
  }));
}