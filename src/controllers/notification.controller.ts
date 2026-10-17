// notification.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function listNotifications(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  res.json({ success: true, data: { items, unreadCount } });
}

export async function markRead(req: Request, res: Response) {
  const userId = (req as any).user.id;
  await prisma.notification.updateMany({
    where: { id: req.params.id as string, userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ success: true });
}

export async function markAllRead(req: Request, res: Response) {
  const userId = (req as any).user.id;
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ success: true });
}

export async function clearAll(req: Request, res: Response) {
  const userId = (req as any).user.id;
  await prisma.notification.deleteMany({ where: { userId } });
  res.json({ success: true });
}