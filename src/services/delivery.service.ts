import { DeliveryStatus } from '../../generated/prisma/enums';
import { prisma } from '../config/prisma';
import { notifyUser, notifyAdmins } from '../socket/socket.manager';

export async function createDeliveryRequest(
  customerId: string,
  data: {
    pickupAddress: string;
    destinationAddress: string;
    itemDescription: string;
    paymentMethod: 'CASH' | 'MOMO';
  }
) {
  const estimatedFee = calculateDeliveryEstimate();

  return prisma.deliveryRequest.create({
    data: {
      customerId,
      pickupAddress: data.pickupAddress.trim(),
      destinationAddress: data.destinationAddress.trim(),
      itemDescription: data.itemDescription.trim(),
      estimatedFee,
    },
    include: {
      customer: { select: { name: true, phone: true } },
    },
  });
}

function calculateDeliveryEstimate(): number {
  // Flat rate for MVP — will be distance-based later
  return 10;
}

export async function getDeliveryById(deliveryId: string, userId: string) {
  const delivery = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryId },
    include: {
      customer: { select: { name: true, phone: true } },
      rider: {
        include: {
          user: { select: { name: true, phone: true, profileImage: true } },
        },
      },
    },
  });

  if (!delivery) throw new Error('Delivery request not found');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const rider = await prisma.rider.findUnique({ where: { userId } });

  const isCustomer = delivery.customerId === userId;
  const isRider = rider?.id === delivery.assignedRiderId;
  const isAdmin = user.role === 'ADMIN';

  if (!isCustomer && !isRider && !isAdmin)
    throw new Error('Access denied');

  return delivery;
}

const validDeliveryTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export async function updateDeliveryStatus(
  deliveryId: string,
  userId: string,
  newStatus: DeliveryStatus
) {
  const delivery = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryId },
  });
  if (!delivery) throw new Error('Delivery request not found');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const rider = await prisma.rider.findUnique({ where: { userId } });

  // Only assigned rider can progress the delivery
  if (['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(newStatus)) {
    if (rider?.id !== delivery.assignedRiderId)
      throw new Error('Only the assigned rider can update this delivery');
  }

  // Only customer or admin can cancel
  if (newStatus === 'CANCELLED') {
    const isCustomer = delivery.customerId === userId;
    const isAdmin = user.role === 'ADMIN';
    if (!isCustomer && !isAdmin)
      throw new Error('Only the customer or admin can cancel this delivery');
    if (!['PENDING', 'ACCEPTED'].includes(delivery.status))
      throw new Error('Delivery can no longer be cancelled');
  }

  const allowed = validDeliveryTransitions[delivery.status];
  if (!allowed.includes(newStatus))
    throw new Error(`Cannot transition from ${delivery.status} to ${newStatus}`);

  // Update rider stats on completion
  if (newStatus === 'DELIVERED' && delivery.assignedRiderId) {
    await prisma.$transaction(async (tx) => {
      await tx.deliveryRequest.update({
        where: { id: deliveryId },
        data: { status: newStatus },
      });
      await tx.rider.update({
        where: { id: delivery.assignedRiderId! },
        data: {
          totalDeliveries: { increment: 1 },
          earnings: { increment: delivery.estimatedFee },
        },
      });
    });

    emitDeliveryEvent(delivery.customerId, deliveryId, newStatus);

    return prisma.deliveryRequest.findUnique({
      where: { id: deliveryId },
      include: {
        customer: { select: { name: true, phone: true } },
        rider: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
    });
  }

  return prisma.deliveryRequest.update({
    where: { id: deliveryId },
    data: { status: newStatus },
    include: {
      customer: { select: { name: true, phone: true } },
      rider: {
        include: { user: { select: { name: true, phone: true } } },
      },
    },
  });
}

export async function assignRiderToDelivery(
  deliveryId: string,
  riderId: string
) {
  const delivery = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryId },
  });
  if (!delivery) throw new Error('Delivery request not found');
  if (delivery.status !== 'PENDING')
    throw new Error('Can only assign rider to a pending delivery');

  const rider = await prisma.rider.findUnique({ where: { id: riderId } });
  if (!rider) throw new Error('Rider not found');
  if (rider.availability !== 'ONLINE')
    throw new Error('Rider is not available');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.deliveryRequest.update({
      where: { id: deliveryId },
      data: {
        assignedRiderId: riderId,
        status: 'ACCEPTED',
      },
      include: {
        customer: { select: { name: true, phone: true } },
        rider: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
    });

    await tx.rider.update({
      where: { id: riderId },
      data: { availability: 'BUSY' },
    });

    notifyUser(delivery.customerId, 'delivery:rider_assigned', {
    deliveryId,
    riderId,
    timestamp: new Date(),
  });

    return updated;
  });
}

export async function getAllDeliveries(filters: {
  status?: DeliveryStatus;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(filters.status && { status: filters.status }),
  };

  const [deliveries, total] = await Promise.all([
    prisma.deliveryRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
        rider: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
    }),
    prisma.deliveryRequest.count({ where }),
  ]);

  return {
    deliveries,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

function emitDeliveryEvent(
  customerId: string,
  deliveryId: string,
  status: DeliveryStatus
) {
  const payload = { deliveryId, status, timestamp: new Date() };
  notifyUser(customerId, 'delivery:status_update', payload);
  notifyAdmins('admin:delivery_update', payload);
}