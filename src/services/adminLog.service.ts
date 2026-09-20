import { prisma } from '../config/prisma';
import { AdminActionType, Prisma } from '@prisma/client';

// Logging must never break the admin action it's attached to — a failed
// write here is swallowed and just logged to console, not thrown.
export async function logAdminAction(params: {
  adminId: string;
  action: AdminActionType;
  targetType?: string;
  targetId?: string;
  summary: string;
  metadata?: Record<string, any>;
}) {
  try {
    await prisma.adminActionLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        summary: params.summary,
        metadata: params.metadata as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error('[adminLog] failed to record action:', err);
  }
}

export async function getAdminActionLogs(filters: {
  adminId?: string;
  action?: AdminActionType;
  targetType?: string;
  targetId?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 30;
  const skip = (page - 1) * limit;

  const where = {
    ...(filters.adminId && { adminId: filters.adminId }),
    ...(filters.action && { action: filters.action }),
    ...(filters.targetType && { targetType: filters.targetType }),
    ...(filters.targetId && { targetId: filters.targetId }),
  };

  const [logs, total] = await Promise.all([
    prisma.adminActionLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { name: true, phone: true } } },
    }),
    prisma.adminActionLog.count({ where }),
  ]);

  return { logs, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}