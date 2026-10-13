
import { Response, Router } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../interface/auth-request.interface.ts';
import { authenticate } from '../middleware/auth.middleware';
import { requireService } from '../services/service-flags.service';
 
/* ═══════════════════════ SERVICE ═══════════════════════ */
 
const proSelect = {
  id: true, name: true, phone: true, whatsapp: true, photo: true, bio: true, area: true,
  yearsExp: true, priceNote: true, rating: true, reviewCount: true, verified: true,
  trades: { select: { id: true, name: true } },
};
 
export async function listTrades() {
  const trades = await prisma.trade.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true, name: true, icon: true,
      _count: { select: { professionals: { where: { status: 'ACTIVE' } } } },
    },
  });
  return trades.map((t) => ({ id: t.id, name: t.name, icon: t.icon, proCount: t._count.professionals }));
}
 
export async function listProfessionals(q: {
  tradeId?: string; search?: string; sort?: string; page?: number; limit?: number;
}) {
  const page = q.page || 1;
  const limit = Math.min(q.limit || 20, 50);
  const search = q.search?.trim();
 
  const where: any = {
    status: 'ACTIVE',
    ...(q.tradeId && { trades: { some: { id: q.tradeId } } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { area: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };
 
  const orderBy: any[] =
    q.sort === 'reviews' ? [{ reviewCount: 'desc' }, { rating: 'desc' }]
    : q.sort === 'experience' ? [{ yearsExp: { sort: 'desc', nulls: 'last' } }, { rating: 'desc' }]
    : q.sort === 'new' ? [{ createdAt: 'desc' }]
    : [{ verified: 'desc' }, { rating: 'desc' }, { reviewCount: 'desc' }];
 
  const [pros, total] = await Promise.all([
    prisma.professional.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, select: proSelect }),
    prisma.professional.count({ where }),
  ]);
  return { pros, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}
 
export async function getProfessional(id: string, customerId: string) {
  const pro = await prisma.professional.findFirst({ where: { id, status: 'ACTIVE' }, select: proSelect });
  if (!pro) throw new Error('Professional not found');
 
  const [reviews, hasContacted, mine] = await Promise.all([
    prisma.professionalReview.findMany({
      where: { professionalId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, rating: true, comment: true, createdAt: true, customer: { select: { name: true } } },
    }),
    prisma.professionalCall.count({ where: { professionalId: id, customerId } }),
    prisma.professionalReview.findUnique({
      where: { professionalId_customerId: { professionalId: id, customerId } },
      select: { rating: true, comment: true },
    }),
  ]);
 
  return {
    ...pro,
    reviews: reviews.map((r) => ({
      id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt,
      customerName: (r.customer?.name || 'Customer').split(' ')[0], // first name only
    })),
    canReview: hasContacted > 0,
    myReview: mine,
  };
}
 
/** Customer tapped Call / WhatsApp. Cheap, de-duplicated per hour. */
export async function logContact(professionalId: string, customerId: string) {
  const exists = await prisma.professional.findFirst({ where: { id: professionalId, status: 'ACTIVE' }, select: { id: true } });
  if (!exists) throw new Error('Professional not found');
  const recent = await prisma.professionalCall.findFirst({
    where: { professionalId, customerId, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    select: { id: true },
  });
  if (!recent) await prisma.professionalCall.create({ data: { professionalId, customerId } });
  return { logged: true };
}
 
export async function reviewProfessional(
  professionalId: string, customerId: string, data: { rating: number; comment?: string },
) {
  const rating = Number(data.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Rating must be 1 to 5');
 
  const contacted = await prisma.professionalCall.count({ where: { professionalId, customerId } });
  if (!contacted) throw new Error('Contact this professional first, then you can rate them');
 
  const comment = data.comment?.trim().slice(0, 500) || null;
 
  await prisma.$transaction(async (tx) => {
    await tx.professionalReview.upsert({
      where: { professionalId_customerId: { professionalId, customerId } },
      create: { professionalId, customerId, rating, comment },
      update: { rating, comment },
    });
    const agg = await tx.professionalReview.aggregate({
      where: { professionalId }, _avg: { rating: true }, _count: { id: true },
    });
    await tx.professional.update({
      where: { id: professionalId },
      data: {
        rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count.id,
      },
    });
  });
  return getProfessional(professionalId, customerId);
}
 
// ── admin ──
 
export async function adminCreateTrade(data: { name: string; icon?: string; sortOrder?: number }) {
  const name = (data.name || '').trim();
  if (!name) throw new Error('Trade name is required');
  return prisma.trade.create({ data: { name, icon: data.icon || null, sortOrder: data.sortOrder ?? 0 } });
}
 
export async function adminListTrades() {
  return prisma.trade.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { professionals: true } } },
  });
}
 
export async function adminUpdateTrade(id: string, data: Record<string, any>) {
  const payload: Record<string, any> = {};
  if (data.name !== undefined) {
    if (!String(data.name).trim()) throw new Error('Trade name is required');
    payload.name = String(data.name).trim();
  }
  if (data.icon !== undefined) payload.icon = data.icon || null;
  if (data.active !== undefined) payload.active = !!data.active;
  if (data.sortOrder !== undefined) payload.sortOrder = Number(data.sortOrder) || 0;
  return prisma.trade.update({ where: { id }, data: payload });
}
 
export async function adminListProfessionals(f: { status?: string; tradeId?: string }) {
  return prisma.professional.findMany({
    where: { ...(f.status && { status: f.status as any }), ...(f.tradeId && { trades: { some: { id: f.tradeId } } }) },
    include: { trades: { select: { id: true, name: true } }, _count: { select: { calls: true, reviews: true } } },
    orderBy: { createdAt: 'desc' },
  });
}
 
export async function adminCreateProfessional(data: {
  name: string; phone: string; tradeIds: string[]; whatsapp?: string; area?: string; bio?: string;
  photo?: string; yearsExp?: number; priceNote?: string; verified?: boolean; status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}) {
  if (!data.name?.trim() || !data.phone?.trim()) throw new Error('Name and phone are required');
  if (!Array.isArray(data.tradeIds) || data.tradeIds.length === 0) throw new Error('Pick at least one trade');
  return prisma.professional.create({
    data: {
      name: data.name.trim(),
      phone: data.phone.trim(),
      whatsapp: data.whatsapp?.trim() || null,
      area: data.area?.trim() || null,
      bio: data.bio?.trim() || null,
      photo: data.photo || null,
      yearsExp: data.yearsExp ?? null,
      priceNote: data.priceNote?.trim() || null,
      verified: !!data.verified,
      status: data.status ?? 'ACTIVE',
      trades: { connect: data.tradeIds.map((id) => ({ id })) },
    },
    include: { trades: true },
  });
}
 
export async function adminUpdateProfessional(id: string, data: Record<string, any>) {
  const allowed = ['name', 'phone', 'whatsapp', 'area', 'bio', 'photo', 'yearsExp', 'priceNote', 'verified', 'status'];
  const payload: Record<string, any> = {};
  for (const k of allowed) if (data[k] !== undefined) payload[k] = data[k];
  if (Array.isArray(data.tradeIds)) payload.trades = { set: data.tradeIds.map((t: string) => ({ id: t })) };
  return prisma.professional.update({ where: { id }, data: payload, include: { trades: true } });
}
 
/* ═══════════════════════ CONTROLLER HELPER ═══════════════════════ */

const h =
  (fn: (req: AuthRequest) => Promise<unknown>, okStatus = 200) =>
  async (req: AuthRequest, res: Response) => {
    try {
      res.status(okStatus).json({ success: true, data: await fn(req) });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message || 'Something went wrong' });
    }
  };


/* ═══════════════════════ ADMIN ROUTES ═══════════════════════
   call once in admin.routes.ts, after adminRouter.use(authenticate, authorize('ADMIN')):
     registerProsAdminRoutes(adminRouter);                                              */

export function registerProsAdminRoutes(adminRouter: Router) {
  adminRouter.post('/trades', h((req) => adminCreateTrade(req.body), 201));
  adminRouter.get('/trades', h(() => adminListTrades()));
  adminRouter.patch('/trades/:id', h((req) => adminUpdateTrade(req.params.id as string, req.body)));
  adminRouter.get('/pros', h((req) => adminListProfessionals({
    status: req.query.status as string | undefined, tradeId: req.query.tradeId as string | undefined,
  })));
  adminRouter.post('/pros', h((req) => adminCreateProfessional(req.body), 201));
  adminRouter.patch('/pros/:id', h((req) => adminUpdateProfessional(req.params.id as string, req.body)));
}

/* ═══════════════════════ SEED (run once) ═══════════════════════
await prisma.trade.createMany({ skipDuplicates: true, data: [
  { name: 'Electrician', icon: '⚡', sortOrder: 1 },
  { name: 'Plumber',     icon: '🚰', sortOrder: 2 },
  { name: 'Carpenter',   icon: '🪚', sortOrder: 3 },
  { name: 'Mason',       icon: '🧱', sortOrder: 4 },
  { name: 'Painter',     icon: '🎨', sortOrder: 5 },
  { name: 'Mechanic',    icon: '🔧', sortOrder: 6 },
  { name: 'Phone/Electronics Repair', icon: '📱', sortOrder: 7 },
  { name: 'Cleaner',     icon: '🧹', sortOrder: 8 },
  { name: 'Other',       icon: '🛠️', sortOrder: 99 },
]});
*/