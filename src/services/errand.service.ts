import { ErrandStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { notifyUser, notifyAdmins } from '../socket/socket.manager';
import * as NotificationService from './notification.service';

export async function createErrand(
  customerId: string,
  data: {
    description: string;
    instructions?: string;
    budget: number;
    pickupLocation?: string;
  }
) {
  if (data.budget <= 0) throw new Error('Budget must be greater than 0');

  
  const errand = prisma.errand.create({
    data: {
      customerId,
      description: data.description.trim(),
      instructions: data.instructions?.trim() || null,
      budget: data.budget,
      pickupLocation: data.pickupLocation?.trim() || null,
    },
  });
  await NotificationService.notifyNewErrand((await errand).id);
  return errand;
}

export async function getErrandById(errandId: string, userId: string) {
  const errand = await prisma.errand.findUnique({
    where: { id: errandId },
    include: {
      customer: { select: { name: true, phone: true } },
    },
  });

  if (!errand) throw new Error('Errand not found');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const isCustomer = errand.customerId === userId;
  const isAdmin = user.role === 'ADMIN';
  const isRider = user.role === 'RIDER';

  if (!isCustomer && !isAdmin && !isRider)
    throw new Error('Access denied');

  return errand;
}

const validErrandTransitions: Record<ErrandStatus, ErrandStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export async function updateErrandStatus(
  errandId: string,
  userId: string,
  newStatus: ErrandStatus
) {
  const errand = await prisma.errand.findUnique({ where: { id: errandId } });
  if (!errand) throw new Error('Errand not found');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  if (newStatus === 'CANCELLED') {
    const isCustomer = errand.customerId === userId;
    const isAdmin = user.role === 'ADMIN';
    if (!isCustomer && !isAdmin)
      throw new Error('Only the customer or admin can cancel an errand');
    if (!['PENDING', 'ACCEPTED'].includes(errand.status))
      throw new Error('Errand can no longer be cancelled');
  }

  const allowed = validErrandTransitions[errand.status];
  if (!allowed.includes(newStatus))
    throw new Error(`Cannot transition from ${errand.status} to ${newStatus}`);

  notifyUser(errand.customerId, 'errand:status_update', {
    errandId,
    status: newStatus,
    timestamp: new Date(),
  });
  notifyAdmins('admin:errand_update', {
    errandId,
    status: newStatus,
    timestamp: new Date(),
  });
  
  const updatedErrand = prisma.errand.update({
    where: { id: errandId },
    data: { status: newStatus },
    include: {
      customer: { select: { name: true, phone: true } },
    },
  });

  await NotificationService.notifyErrandStatusChange(errandId, newStatus, errand.customerId);
  return updatedErrand;
}

export async function getAllErrands(filters: {
  status?: ErrandStatus;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(filters.status && { status: filters.status }),
  };

  const [errands, total] = await Promise.all([
    prisma.errand.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
      },
    }),
    prisma.errand.count({ where }),
  ]);

  return {
    errands,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}