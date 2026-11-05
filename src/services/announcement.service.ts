import { prisma } from '../config/prisma';
import { AnnouncementTarget } from '@prisma/client';
import { AuthRequest } from '../interface/auth-request.interface.ts';
import { Router, Response, NextFunction } from 'express';

export async function createAnnouncement(adminId: string, data: {
  title: string; subtitle?: string; imageUrl?: string;
  targetType: AnnouncementTarget; vendorId?: string; productId?: string;
  startsAt?: string; endsAt?: string; sortOrder?: number;
}) {
  if (!data.title?.trim()) throw new Error('Title is required');

  if (data.targetType === 'VENDOR') {
    if (!data.vendorId) throw new Error('vendorId is required');
    const v = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
    if (!v) throw new Error('Vendor not found');
  }
  if (data.targetType === 'PRODUCT') {
    if (!data.productId) throw new Error('productId is required');
    const p = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!p) throw new Error('Product not found');
  }

  const created = await prisma.announcement.create({
    data: {
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || null,
      imageUrl: data.imageUrl || null,
      targetType: data.targetType,
      vendorId: data.targetType === 'VENDOR' ? data.vendorId : null,
      productId: data.targetType === 'PRODUCT' ? data.productId : null,
      startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      sortOrder: data.sortOrder ?? 0,
    },
  });

  await prisma.adminActionLog.create({
    data: {
      adminId,
      action: 'BROADCAST_SENT', // reuse; add ANNOUNCEMENT_* enum values later if you want
      targetType: 'Announcement',
      targetId: created.id,
      summary: `Created home announcement "${created.title}"`,
    },
  });

  return created;
}

export async function updateAnnouncement(id: string, data: Partial<{
  title: string; subtitle: string | null; imageUrl: string | null;
  isActive: boolean; endsAt: string | null; sortOrder: number;
}>) {
  return prisma.announcement.update({
    where: { id },
    data: {
      ...data,
      endsAt: data.endsAt === undefined ? undefined : data.endsAt ? new Date(data.endsAt) : null,
    },
  });
}

export const deleteAnnouncement = (id: string) =>
  prisma.announcement.delete({ where: { id } });

export const listAnnouncementsAdmin = () =>
  prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      vendor:  { select: { businessName: true } },
      product: { select: { name: true } },
    },
  });

export const listProductsForVendor = (vendorId: string) =>
  prisma.product.findMany({
    where: { vendorId },
    select: { id: true, name: true, available: true },
    orderBy: { name: 'asc' },
  });

export async function getActiveAnnouncements() {
  const now = new Date();
  return prisma.announcement.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        {
          OR: [
            { targetType: 'NONE' },
            { targetType: 'VENDOR',  vendor:  { status: 'ACTIVE' } },
            { targetType: 'PRODUCT', product: { available: true, vendor: { status: 'ACTIVE' } } },
          ],
        },
      ],
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: 5,
  });
}

const h =
  (fn: (req: AuthRequest) => Promise<unknown>, okStatus = 200) =>
  async (req: AuthRequest, res: Response) => {
    try {
      res.status(okStatus).json({ success: true, data: await fn(req) });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message || 'Something went wrong' });
    }
  };

export function registerAnnouncementRoutes(router: Router, authenticate: any, authorize: any) {
  // public: the Flutter app reads res.data['data'], so the extra `success` flag is harmless
  router.get('/active', authenticate, h(() => getActiveAnnouncements()));

  // admin
  const admin = [authenticate, authorize('ADMIN')];
  router.get('/admin/products', ...admin,
    h((req) => listProductsForVendor(String(req.query.vendorId || ''))));

  router.get('/admin/', ...admin, h(() => listAnnouncementsAdmin()));
  
  router.post('/admin/', ...admin,
    h((req) => createAnnouncement(req.user!.id, req.body), 201));
  router.patch('/admin/:id', ...admin,
    h((req) => updateAnnouncement(req.params.id as string, req.body)));
  router.delete('/admin/:id', ...admin,
    h(async (req) => { await deleteAnnouncement(req.params.id as string); return { deleted: true }; }));
}