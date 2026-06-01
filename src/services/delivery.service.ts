import { DeliveryStatus, PaymentMethod } from '../../generated/prisma/enums';
import { prisma } from '../config/prisma';
import { notifyUser, notifyAdmins } from '../socket/socket.manager';

import {
  notifyRiders,
  getIO,
} from '../socket/socket.manager';

function calculateDeliveryEstimate(
  pickupLat?: number,
  pickupLng?: number,
  destLat?: number,
  destLng?: number,
): number {
  if (pickupLat && pickupLng && destLat && destLng) {
    // Haversine rough distance → tiered pricing
    const R    = 6371;
    const dLat = ((destLat - pickupLat) * Math.PI) / 180;
    const dLng = ((destLng - pickupLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((pickupLat * Math.PI) / 180) *
        Math.cos((destLat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
 
    if (km <= 1)  return 5;
    if (km <= 3)  return 8;
    if (km <= 7)  return 12;
    if (km <= 15) return 18;
    return 25;
  }
  return 10; // fallback flat rate
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

export async function getAllLocations() {
  return prisma.location.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}
 
export async function searchLocations(query: string) {
  return prisma.location.findMany({
    where: {
      isActive: true,
      OR: [
        { name:    { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
    take: 20,
  });
}
 
export async function createLocation(data: {
  name:      string;
  address:   string;
  latitude:  number;
  longitude: number;
}) {
  return prisma.location.create({ data });
}
 
export async function updateLocation(
  id: string,
  data: Partial<{ name: string; address: string; latitude: number; longitude: number; isActive: boolean }>
) {
  return prisma.location.update({ where: { id }, data });
}
 
export async function deleteLocation(id: string) {
  return prisma.location.delete({ where: { id } });
}

// ─── CREATE ──────────────────────────────────────────────

export async function createDeliveryRequest(
  customerId: string,
  data: {
    pickupAddress: string;
    pickupLatitude?: number;
    pickupLongitude?: number;
    destinationAddress: string;
    destinationLatitude?: number;
    destinationLongitude?: number;
    itemDescription: string;
    paymentMethod: 'CASH' | 'MOMO';
  }
) {
  const estimatedFee = 10; // flat rate MVP

  const delivery = await prisma.deliveryRequest.create({
    data: {
      customerId,
      pickupAddress:       data.pickupAddress.trim(),
      pickupLatitude:      data.pickupLatitude,
      pickupLongitude:     data.pickupLongitude,
      destinationAddress:  data.destinationAddress.trim(),
      destinationLatitude: data.destinationLatitude,
      destinationLongitude:data.destinationLongitude,
      itemDescription:     data.itemDescription.trim(),
      estimatedFee,
      paymentMethod:       data.paymentMethod,
    },
    include: {
      customer: { select: { name: true, phone: true } },
    },
  });

  // ── Broadcast to ALL online riders immediately ──
  const payload = {
    type:            'NEW_DELIVERY',
    deliveryId:      delivery.id,
    pickupAddress:   delivery.pickupAddress,
    destinationAddress: delivery.destinationAddress,
    itemDescription: delivery.itemDescription,
    estimatedFee:    delivery.estimatedFee,
    paymentMethod:   delivery.paymentMethod,
    customer: {
      name:  delivery.customer.name,
      phone: delivery.customer.phone,
    },
    createdAt: delivery.createdAt,
  };

  // Emit to all riders in the riders room
  notifyRiders('delivery:new_request', payload);

  // Also notify admins
  notifyAdmins('admin:new_delivery', payload);

  return delivery;
}

// ─── RIDER SELF-ACCEPT ────────────────────────────────────
// Any available rider can accept a pending delivery

export async function riderAcceptDelivery(
  deliveryId: string,
  riderUserId: string
) {
  const rider = await prisma.rider.findUnique({ where: { userId: riderUserId } });
  if (!rider) throw new Error('Rider profile not found');
  if (rider.availability !== 'ONLINE')
    throw new Error('You must be online to accept deliveries');

  // Use a transaction + atomic update to prevent race conditions
  // Only one rider can claim it — first one wins
  const delivery = await prisma.$transaction(async (tx) => {
    // Re-fetch inside transaction to check current state
    const current = await tx.deliveryRequest.findUnique({
      where: { id: deliveryId },
    });

    if (!current) throw new Error('Delivery not found');
    if (current.status !== 'PENDING')
      throw new Error('This delivery has already been taken');
    if (current.assignedRiderId)
      throw new Error('This delivery has already been assigned');

    // Claim it
    const updated = await tx.deliveryRequest.update({
      where: { id: deliveryId },
      data: {
        assignedRiderId: rider.id,
        status:          'ACCEPTED',
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        rider: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
    });

    // Set rider as BUSY
    await tx.rider.update({
      where: { id: rider.id },
      data:  { availability: 'BUSY' },
    });

    return updated;
  });

  // ── Notify customer that a rider accepted ──
  notifyUser(delivery.customer.id, 'delivery:rider_accepted', {
    deliveryId:   delivery.id,
    riderName:    delivery.rider?.user.name,
    riderPhone:   delivery.rider?.user.phone,
    status:       'ACCEPTED',
    timestamp:    new Date(),
  });

  // ── Tell ALL other riders this delivery is gone ──
  notifyRiders('delivery:taken', { deliveryId: delivery.id });

  // ── Notify admins ──
  notifyAdmins('admin:delivery_accepted', {
    deliveryId: delivery.id,
    riderId:    rider.id,
    riderName:  delivery.rider?.user.name,
  });

  return delivery;
}

// ─── STATUS TRANSITIONS ──────────────────────────────────

const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING:    ['ACCEPTED', 'CANCELLED'],
  ACCEPTED:   ['PICKED_UP', 'CANCELLED'],
  PICKED_UP:  ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED:  [],
  CANCELLED:  [],
};

export async function updateDeliveryStatus(
  deliveryId: string,
  userId: string,
  newStatus: DeliveryStatus
) {
  const delivery = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryId },
    include: { customer: true },
  });
  if (!delivery) throw new Error('Delivery not found');

  const user  = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const rider = await prisma.rider.findUnique({ where: { userId } });

  // Permission checks
  if (['PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(newStatus)) {
    if (rider?.id !== delivery.assignedRiderId)
      throw new Error('Only the assigned rider can update this delivery');
  }

  if (newStatus === 'CANCELLED') {
    const isCustomer = delivery.customerId === userId;
    const isAdmin    = user.role === 'ADMIN';
    if (!isCustomer && !isAdmin)
      throw new Error('Only the customer or admin can cancel');
    if (!['PENDING', 'ACCEPTED'].includes(delivery.status))
      throw new Error('This delivery can no longer be cancelled');
  }

  const allowed = validTransitions[delivery.status];
  if (!allowed.includes(newStatus))
    throw new Error(`Cannot transition from ${delivery.status} to ${newStatus}`);

  // Update + handle completion
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.deliveryRequest.update({
      where: { id: deliveryId },
      data:  { status: newStatus },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        rider: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
    });

    // On delivery complete — update rider stats and free them up
    if (newStatus === 'DELIVERED' && delivery.assignedRiderId) {
      await tx.rider.update({
        where: { id: delivery.assignedRiderId },
        data: {
          totalDeliveries: { increment: 1 },
          earnings:        { increment: delivery.estimatedFee },
          availability:    'ONLINE', // free up rider
        },
      });
    }

    // On cancel — free up rider if they were assigned
    if (newStatus === 'CANCELLED' && delivery.assignedRiderId) {
      await tx.rider.update({
        where: { id: delivery.assignedRiderId },
        data:  { availability: 'ONLINE' },
      });
    }

    return result;
  });

  // ── Real-time events ──
  const eventPayload = {
    deliveryId,
    status:    newStatus,
    timestamp: new Date(),
    riderName: updated.rider?.user.name,
  };

  // Notify customer
  notifyUser(delivery.customerId, 'delivery:status_update', eventPayload);

  // Notify admins
  notifyAdmins('admin:delivery_update', eventPayload);
  emitDeliveryEvent(delivery.customerId, deliveryId, newStatus);
  return updated;
}

// ─── FETCH PENDING (for riders to browse) ────────────────

export async function getPendingDeliveries() {
  return prisma.deliveryRequest.findMany({
    where: {
      status:          'PENDING',
      assignedRiderId: null,
    },
    include: {
      customer: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── RIDER'S OWN JOBS ────────────────────────────────────

export async function getRiderJobs(riderUserId: string) {
  const rider = await prisma.rider.findUnique({ where: { userId: riderUserId } });
  if (!rider) throw new Error('Rider profile not found');

  const [active, history] = await Promise.all([
    prisma.deliveryRequest.findMany({
      where: {
        assignedRiderId: rider.id,
        status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
      },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.deliveryRequest.findMany({
      where: {
        assignedRiderId: rider.id,
        status: { in: ['DELIVERED', 'CANCELLED'] },
      },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return { active, history };
}
