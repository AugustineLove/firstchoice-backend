import { PaymentMethod } from '@prisma/client';
import { prisma } from '../config/prisma';
import { notifyUser, notifyAdmins, notifyRiders } from '../socket/socket.manager';


export function parseOffBookText(raw: string) {
  const text = (raw || '').trim();
  if (!text) return {};

  const phoneMatch = text.match(/(?:\+?233|0)\d{9}|\+?\d[\d\s-]{7,}\d/);
  const amountMatch = text.match(/(?:GHS|GH₵|₵)\s*([\d,]+(?:\.\d{1,2})?)/i);
  const routeMatch = text.match(/(.+?)\s*(?:->|→|-{1,2}>|\bto\b)\s*(.+)/i);

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const nameLine = lines.find(
    (l) => !/(?:GHS|₵|\d{7,})/i.test(l) && !routeMatch?.[0]?.includes(l)
  );

  return {
    customerName: nameLine?.replace(/^name[:\-]\s*/i, '').slice(0, 80) || undefined,
    customerPhone: phoneMatch ? phoneMatch[0].replace(/[\s-]+/g, '') : undefined,
    amount: amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : undefined,
    pickupAddress: routeMatch ? routeMatch[1].trim().slice(0, 200) : undefined,
    destinationAddress: routeMatch ? routeMatch[2].trim().slice(0, 200) : undefined,
  };
}

/* ═══════════════════════════════════════════════════════
   CREATE
═══════════════════════════════════════════════════════ */

export async function createManualJobService(
  adminId: string,
  data: {
    customerName?: string;
    customerPhone?: string;
    pickupAddress: string;
    pickupLatitude?: number;
    pickupLongitude?: number;
    destinationAddress: string;
    destinationLatitude?: number;
    destinationLongitude?: number;
    itemDescription?: string;
    amount?: number;
    paymentMethod?: PaymentMethod;
    rawNote?: string;
  }
) {
  if (!data.pickupAddress?.trim()) throw new Error('Pickup address is required');
  if (!data.destinationAddress?.trim()) throw new Error('Destination address is required');

  const job = await prisma.manualJob.create({
    data: {
      createdById: adminId,
      customerName: data.customerName?.trim() || null,
      customerPhone: data.customerPhone?.trim() || null,
      pickupAddress: data.pickupAddress.trim(),
      pickupLatitude: data.pickupLatitude ?? null,
      pickupLongitude: data.pickupLongitude ?? null,
      destinationAddress: data.destinationAddress.trim(),
      destinationLatitude: data.destinationLatitude ?? null,
      destinationLongitude: data.destinationLongitude ?? null,
      itemDescription: data.itemDescription?.trim() || null,
      amount: data.amount ?? 0,
      paymentMethod: data.paymentMethod || 'CASH',
      rawNote: data.rawNote?.trim() || null,
      status: 'PENDING',
    },
  });

  // Same shape as the payload order/delivery creation sends, so anything
  // already listening for 'delivery:new_request' (rider app, admin feed)
  // picks this up without extra work.
  const payload = {
    type: 'NEW_MANUAL_JOB',
    manualJobId: job.id,
    pickupAddress: job.pickupAddress,
    destinationAddress: job.destinationAddress,
    itemDescription: job.itemDescription,
    estimatedFee: job.amount,
    paymentMethod: job.paymentMethod,
    customer: { name: job.customerName, phone: job.customerPhone },
    createdAt: job.createdAt,
  };

  notifyRiders('delivery:new_request', payload);
  notifyAdmins('admin:new_delivery', payload);

  return job;
}

/* ═══════════════════════════════════════════════════════
   READ — feeds into admin.service's dispatch queue / map
═══════════════════════════════════════════════════════ */

const ACTIVE_MANUAL_STATUSES = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] as const;

export async function getActiveManualJobs() {
  return prisma.manualJob.findMany({
    where: { status: { in: ACTIVE_MANUAL_STATUSES as any } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getPendingManualJobs() {
  return prisma.manualJob.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });
}

/* ═══════════════════════════════════════════════════════
   ASSIGN
═══════════════════════════════════════════════════════ */

export async function assignRiderToManualJob(manualJobId: string, riderId: string) {
  const job = await prisma.manualJob.findUnique({ where: { id: manualJobId } });
  if (!job) throw new Error('Off-book job not found');

  const assignable: string[] = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];
  if (!assignable.includes(job.status))
    throw new Error(`Cannot assign a rider to a job that is ${job.status}`);

  const previousRiderId = job.assignedRiderId;
  const isReassignment = !!previousRiderId;
  if (isReassignment && previousRiderId === riderId)
    throw new Error('Job is already assigned to this rider');

  const rider = await prisma.rider.findUnique({
    where: { id: riderId },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });
  if (!rider) throw new Error('Rider not found');
  if (rider.availability !== 'ONLINE') throw new Error('Rider is not available');

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.manualJob.update({
      where: { id: manualJobId },
      data: {
        assignedRiderId: riderId,
        // Only bump status on first assignment, same convention as orders/deliveries
        ...(isReassignment ? {} : { status: 'ACCEPTED' }),
      },
    });

    if (isReassignment && previousRiderId) {
      await tx.rider.update({ where: { id: previousRiderId }, data: { availability: 'ONLINE' } });
    }
    await tx.rider.update({ where: { id: riderId }, data: { availability: 'BUSY' } });

    return result;
  });

  if (rider.user?.id) {
    notifyUser(rider.user.id, 'delivery:rider_assigned', { manualJobId, timestamp: new Date() });
  }
  notifyRiders('delivery:taken', { manualJobId });
  notifyAdmins('admin:delivery_assigned', { manualJobId, riderId, riderName: rider.user?.name });

  return updated;
}

/* ═══════════════════════════════════════════════════════
   STATUS TRANSITIONS
═══════════════════════════════════════════════════════ */

const validManualTransitions: Record<string, string[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export async function updateManualJobStatus(manualJobId: string, newStatus: string) {
  const job = await prisma.manualJob.findUnique({ where: { id: manualJobId } });
  if (!job) throw new Error('Off-book job not found');

  const allowed = validManualTransitions[job.status] || [];
  if (!allowed.includes(newStatus))
    throw new Error(`Cannot transition from ${job.status} to ${newStatus}`);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.manualJob.update({
      where: { id: manualJobId },
      data: { status: newStatus as any },
    });
    if ((newStatus === 'DELIVERED' || newStatus === 'CANCELLED') && job.assignedRiderId) {
      await tx.rider.update({ where: { id: job.assignedRiderId }, data: { availability: 'ONLINE' } });
    }
    return result;
  });

  notifyAdmins('admin:delivery_status_changed', { manualJobId, status: newStatus });
  return updated;
}