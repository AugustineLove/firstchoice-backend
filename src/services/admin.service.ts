import * as NotificationService from './notification.service';
import { DeliveryStatus, OrderStatus, UserStatus, VendorStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { notifyAdmins, notifyRiders, notifyUser } from '../socket/socket.manager';
import { validateOpeningHours } from './vendor.service';
import { emitOrderEvent } from './order.service';
// ─── OVERVIEW STATS ─────────────────────────────────────

export async function getOverviewStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalRiders,
    totalVendors,
    totalOrders,
    todayOrders,
    totalDeliveries,
    todayDeliveries,
    totalErrands,
    activeRiders,
    pendingOrders,
    revenue,
    todayRevenue,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.rider.count(),
    prisma.vendor.count(),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.deliveryRequest.count(),
    prisma.deliveryRequest.count({ where: { createdAt: { gte: today } } }),
    prisma.errand.count(),
    prisma.rider.count({ where: { availability: 'ONLINE' } }),
    prisma.order.count({ where: { orderStatus: 'PENDING' } }),
    prisma.transaction.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { paymentStatus: 'PAID', recordedAt: { gte: today } },
      _sum: { amount: true },
    }),
  ]);

  return {
    users: { total: totalUsers },
    riders: { total: totalRiders, active: activeRiders },
    vendors: { total: totalVendors },
    orders: {
      total: totalOrders,
      today: todayOrders,
      pending: pendingOrders,
    },
    deliveries: { total: totalDeliveries, today: todayDeliveries },
    errands: { total: totalErrands },
    revenue: {
      total: revenue._sum.amount || 0,
      today: todayRevenue._sum.amount || 0,
    },
  };
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return startOfDay(d); }

export async function getAdminOverview() {
  const since30    = daysAgo(30);
  const startToday = startOfDay(new Date());

  const [
    totalUsers, usersByRole, usersLast30,
    totalVendors, vendorsByStatus, pendingVendors,
    totalRiders, ridersByAvailability,
    ordersLast30, deliveriesLast30,
    ordersToday, deliveriesToday,
    orderStatusCounts, deliveryStatusCounts,
    topVendorsRaw,
    allTimeOrderRevenue, allTimeDeliveryRevenue,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true, role: true } }),

    prisma.vendor.count(),
    prisma.vendor.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.vendor.count({ where: { status: 'PENDING' } }),

    prisma.rider.count(),
    prisma.rider.groupBy({ by: ['availability'], _count: { id: true } }),

    prisma.order.findMany({
      where: { createdAt: { gte: since30 } },
      select: { createdAt: true, totalAmount: true, orderStatus: true },
    }),
    prisma.deliveryRequest.findMany({
      where: { createdAt: { gte: since30 } },
      select: { createdAt: true, estimatedFee: true, status: true, type: true },
    }),

    prisma.order.count({ where: { createdAt: { gte: startToday } } }),
    prisma.deliveryRequest.count({ where: { createdAt: { gte: startToday } } }),

    prisma.order.groupBy({ by: ['orderStatus'], _count: { id: true } }),
    prisma.deliveryRequest.groupBy({ by: ['status'], _count: { id: true } }),

    prisma.order.groupBy({
      by: ['vendorId'],
      where: { orderStatus: 'DELIVERED' },
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5,
    }),

    prisma.order.aggregate({ where: { orderStatus: 'DELIVERED' }, _sum: { deliveryFee: true } }),
    prisma.deliveryRequest.aggregate({ where: { status: 'DELIVERED' }, _sum: { estimatedFee: true } }),
  ]);

  // ── Resolve vendor names for the leaderboard (groupBy doesn't join) ──
  const vendorIds = topVendorsRaw.map(v => v.vendorId);
  const vendorRecords = await prisma.vendor.findMany({
    where: { id: { in: vendorIds } },
    select: { id: true, businessName: true, logo: true },
  });
  const vendorMap = Object.fromEntries(vendorRecords.map(v => [v.id, v]));
  const topVendors = topVendorsRaw.map(v => ({
    vendorId: v.vendorId,
    businessName: vendorMap[v.vendorId]?.businessName || 'Unknown',
    logo: vendorMap[v.vendorId]?.logo || null,
    orderCount: v._count.id,
    revenue: v._sum.totalAmount || 0,
  }));

  // ── Daily revenue + volume trend, last 30 days ──
  const dayMap: Record<string, { date: string; orderRevenue: number; deliveryRevenue: number; orderCount: number; deliveryCount: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const key = daysAgo(i).toISOString().slice(0, 10);
    dayMap[key] = { date: key, orderRevenue: 0, deliveryRevenue: 0, orderCount: 0, deliveryCount: 0 };
  }
  for (const o of ordersLast30) {
    const key = startOfDay(o.createdAt).toISOString().slice(0, 10);
    if (!dayMap[key]) continue;
    dayMap[key].orderCount += 1;
    if (o.orderStatus === 'DELIVERED') {
      dayMap[key].orderRevenue += o.totalAmount ?? 0;
    }
  }
  for (const d of deliveriesLast30) {
    const key = startOfDay(d.createdAt).toISOString().slice(0, 10);
    if (!dayMap[key]) continue;
    dayMap[key].deliveryCount += 1;
    if (d.status === 'DELIVERED') {
      dayMap[key].deliveryRevenue += d.estimatedFee ?? 0;
    }
  }
  const dailyTrend = Object.values(dayMap).map(d => ({
    ...d, totalRevenue: d.orderRevenue + d.deliveryRevenue, totalCount: d.orderCount + d.deliveryCount,
  }));

  // ── User growth trend, last 30 days ──
  const growthMap: Record<string, { date: string; customers: number; vendors: number; riders: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const key = daysAgo(i).toISOString().slice(0, 10);
    growthMap[key] = { date: key, customers: 0, vendors: 0, riders: 0 };
  }
  for (const u of usersLast30) {
    const key = startOfDay(u.createdAt).toISOString().slice(0, 10);
    if (!growthMap[key]) continue;
    if (u.role === 'CUSTOMER') growthMap[key].customers += 1;
    else if (u.role === 'VENDOR') growthMap[key].vendors += 1;
    else if (u.role === 'RIDER') growthMap[key].riders += 1;
  }
  const userGrowth = Object.values(growthMap);

  // ── Order type mix (marketplace / pickup delivery / errand), last 30 days ──
  const orderTypeBreakdown = [
    { type: 'Marketplace Orders', count: ordersLast30.length },
    { type: 'Pickup Deliveries',  count: deliveriesLast30.filter(d => d.type === 'PICKUP').length },
    { type: 'Errands',            count: deliveriesLast30.filter(d => d.type === 'ERRAND').length },
  ];

  // ── Payment method mix (orders + deliveries combined) ──
  const [orderPaymentCounts, deliveryPaymentCounts] = await Promise.all([
    prisma.order.groupBy({ by: ['paymentMethod'], _count: { id: true } }),
    prisma.deliveryRequest.groupBy({ by: ['paymentMethod'], _count: { id: true } }),
  ]);
  const paymentTotals: Record<string, number> = {};
  for (const p of orderPaymentCounts) paymentTotals[p.paymentMethod] = (paymentTotals[p.paymentMethod] || 0) + p._count.id;
  for (const p of deliveryPaymentCounts) paymentTotals[p.paymentMethod] = (paymentTotals[p.paymentMethod] || 0) + p._count.id;
  const paymentMethodBreakdown = Object.entries(paymentTotals).map(([method, count]) => ({ method, count }));

  // ── Cancellation rate, last 30 days ──
  const cancelledLast30 =
    ordersLast30.filter(o => o.orderStatus === 'CANCELLED').length +
    deliveriesLast30.filter(d => d.status === 'CANCELLED').length;
  const totalLast30 = ordersLast30.length + deliveriesLast30.length;
  const cancellationRate = totalLast30 > 0 ? Math.round((cancelledLast30 / totalLast30) * 1000) / 10 : 0;

  const revenueToday = dailyTrend[dailyTrend.length - 1]?.totalRevenue || 0;

  const [orderEarningsAgg, deliveryEarningsAgg, orderJobCounts, deliveryJobCounts] = await Promise.all([
    prisma.order.groupBy({
      by: ['riderId'],
      where: { riderId: { not: null }, orderStatus: 'DELIVERED' },
      _sum: { deliveryFee: true },
      _count: { id: true },
    }),
    prisma.deliveryRequest.groupBy({
      by: ['assignedRiderId'],
      where: { assignedRiderId: { not: null }, status: 'DELIVERED' },
      _sum: { estimatedFee: true },
      _count: { id: true },
    }),
    prisma.order.groupBy({
      by: ['riderId'],
      where: { riderId: { not: null } },
      _count: { id: true },
    }),
    prisma.deliveryRequest.groupBy({
      by: ['assignedRiderId'],
      where: { assignedRiderId: { not: null } },
      _count: { id: true },
    }),
  ]);

  const riderStats: Record<string, { earnings: number; completedJobs: number; totalJobs: number }> = {};
  const ensure = (id: string) => (riderStats[id] ??= { earnings: 0, completedJobs: 0, totalJobs: 0 });

  for (const o of orderEarningsAgg) {
    if (!o.riderId) continue;
    const s = ensure(o.riderId);
    s.earnings += o._sum.deliveryFee || 0;
    s.completedJobs += o._count.id;
  }
  for (const d of deliveryEarningsAgg) {
    if (!d.assignedRiderId) continue;
    const s = ensure(d.assignedRiderId);
    s.earnings += d._sum.estimatedFee || 0;
    s.completedJobs += d._count.id;
  }
  for (const o of orderJobCounts) {
    if (!o.riderId) continue;
    ensure(o.riderId).totalJobs += o._count.id;
  }
  for (const d of deliveryJobCounts) {
    if (!d.assignedRiderId) continue;
    ensure(d.assignedRiderId).totalJobs += d._count.id;
  }

  const rankedRiderIds = Object.entries(riderStats)
    .sort((a, b) => b[1].earnings - a[1].earnings)
    .slice(0, 5)
    .map(([id]) => id);

  const riderRecords = await prisma.rider.findMany({
    where: { id: { in: rankedRiderIds } },
    include: { user: { select: { name: true, phone: true } } },
  });
  const riderRecordMap = Object.fromEntries(riderRecords.map(r => [r.id, r]));

  const topRiders = rankedRiderIds.map(id => {
    const r = riderRecordMap[id];
    const s = riderStats[id];
    return {
      id,
      name: r?.user.name || 'Unknown',
      phone: r?.user.phone || '',
      rating: r?.rating || 0,
      availability: r?.availability || 'OFFLINE',
      totalEarnings: s.earnings,       // orders' deliveryFee + deliveries' estimatedFee, delivered only
      totalJobs: s.totalJobs,          // every order/delivery ever assigned, any status
      completedJobs: s.completedJobs,  // delivered only
    };
  });
  return {
    kpis: {
      totalUsers,
      usersByRole: Object.fromEntries(usersByRole.map(u => [u.role, u._count.id])),
      totalVendors,
      activeVendors: vendorsByStatus.find(v => v.status === 'ACTIVE')?._count.id || 0,
      pendingVendors,
      totalRiders,
      onlineRiders: ridersByAvailability.find(r => r.availability === 'ONLINE')?._count.id || 0,
      ordersToday,
      deliveriesToday,
      revenueToday,
      totalRevenueAllTime: (allTimeOrderRevenue._sum.deliveryFee || 0) + (allTimeDeliveryRevenue._sum.estimatedFee || 0),
      cancellationRate,
    },
    dailyTrend,
    userGrowth,
    orderStatusBreakdown: orderStatusCounts.map(o => ({ status: o.orderStatus, count: o._count.id })),
    deliveryStatusBreakdown: deliveryStatusCounts.map(d => ({ status: d.status, count: d._count.id })),
    orderTypeBreakdown,
    paymentMethodBreakdown,
    topVendors,
    topRiders
  };
}
// ─── USER MANAGEMENT ────────────────────────────────────

export async function getAllUsers(filters: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(filters.role && { role: filters.role as any }),
    ...(filters.status && { status: filters.status as any }),
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' as any } },
        { phone: { contains: filters.search, mode: 'insensitive' as any } },
        { email: { contains: filters.search, mode: 'insensitive' as any } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        profileImage: true,
        createdAt: true,
        rider: { select: { availability: true, totalDeliveries: true, rating: true } },
        vendor: { select: { businessName: true, status: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  return prisma.user.update({
    where: { id: userId },
    data: { status },
    select: {
      id: true, name: true, phone: true, role: true, status: true,
    },
  });
}

// ─── VENDOR MANAGEMENT ──────────────────────────────────

export async function getAllVendorsAdmin(filters: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(filters.status && { status: filters.status as any }),
  };

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, phone: true, email: true, status: true } },
        _count: { select: { products: true, orders: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  return {
    vendors,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateVendorStatus(
  vendorId: string,
  status: VendorStatus
) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error('Vendor not found');

  console.log(vendorId);
  const updatedVendor =  prisma.vendor.update({
    where: { id: vendorId },
    data: { status },
  });
    if (status === 'ACTIVE') {
    await NotificationService.notifyVendorApproved(vendor.userId, vendor.businessName);
  }
return updatedVendor;
}

// ─── RIDER MANAGEMENT ───────────────────────────────────

export async function getAllRidersAdmin(filters: {
  availability?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(filters.availability && { availability: filters.availability as any }),
  };

  const [riders, total] = await Promise.all([
    prisma.rider.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true, phone: true, email: true, status: true,
          },
        },
      },
    }),
    prisma.rider.count({ where }),
  ]);

  return {
    riders,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

// ─── ORDER ASSIGNMENT ───────────────────────────────────

export async function assignRiderToOrder(orderId: string, riderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { rider: { select: { userId: true } } },
  });
  if (!order) throw new Error('Order not found');

  // Any order still "in flight" can have a rider (re)assigned.
  // Once it's DELIVERED or CANCELLED, it's locked.
  const assignableStatuses: OrderStatus[] = ['PENDING', 'RIDER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'];
  if (!assignableStatuses.includes(order.orderStatus))
    throw new Error(`Cannot assign a rider to an order that is ${order.orderStatus}`);

  const previousRiderId = order.riderId;
  const previousRiderUserId = order.rider?.userId;
  const isReassignment = !!previousRiderId;

  if (isReassignment && previousRiderId === riderId)
    throw new Error('Order is already assigned to this rider');

  const rider = await prisma.rider.findUnique({ where: { id: riderId } });
  if (!rider) throw new Error('Rider not found');
  if (rider.availability !== 'ONLINE')
    throw new Error('Rider is not available');

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId },
      data: {
        riderId,
        // Only bump status on the FIRST assignment. Reassigning mid-delivery
        // (e.g. rider went offline after pickup) should leave orderStatus alone.
        ...(isReassignment ? {} : { orderStatus: 'RIDER_ASSIGNED' }),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        vendor: { select: { businessName: true, address: true } },
        rider: { include: { user: { select: { name: true, phone: true } } } },
        items: { include: { product: { select: { name: true } } } },
      },
    });

    // Free the previous rider back up
    if (isReassignment && previousRiderId) {
      await tx.rider.update({
        where: { id: previousRiderId },
        data: { availability: 'ONLINE' },
      });
    }

    // Lock in the new one
    await tx.rider.update({
      where: { id: riderId },
      data: { availability: 'BUSY' },
    });

    return result;
  });

  // ── Notifications ──
  notifyUser(updated.customerId, 'delivery:rider_assigned', {
    orderId,
    riderName: updated.rider?.user?.name,
    riderPhone: updated.rider?.user?.phone,
    reassigned: isReassignment,
    timestamp: new Date(),
  });

  if (isReassignment && previousRiderUserId) {
    notifyUser(previousRiderUserId, 'delivery:unassigned', {
      orderId,
      reason: 'Reassigned by admin',
      timestamp: new Date(),
    });
  }

  // Tell the rider pool this order is spoken for (in case it was ever broadcast)
  notifyRiders('delivery:taken', { orderId });

  return updated;
}

export async function assignRiderToDelivery(deliveryId: string, riderId: string) {
  const delivery = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryId },
    include: {
      rider: { select: { id: true, userId: true, user: { select: { name: true, phone: true } } } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!delivery) throw new Error('Delivery request not found');

  // Any delivery still "in flight" can have a rider (re)assigned.
  // Once it's DELIVERED or CANCELLED, it's locked.
  const assignableStatuses: DeliveryStatus[] = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];
  if (!assignableStatuses.includes(delivery.status))
    throw new Error(`Cannot assign a rider to a delivery request that is ${delivery.status}`);

  const previousRiderId = delivery.assignedRiderId;
  const previousRiderUserId = delivery.rider?.userId;
  const isReassignment = !!previousRiderId;

  if (isReassignment && previousRiderId === riderId)
    throw new Error('Delivery request is already assigned to this rider');

  const rider = await prisma.rider.findUnique({
    where: { id: riderId },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!rider) throw new Error('Rider not found');
  if (rider.availability !== 'ONLINE')
    throw new Error('Rider is not available');

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.deliveryRequest.update({
      where: { id: deliveryId },
      data: {
        assignedRiderId: riderId,
        // Only bump status on the FIRST assignment (from PENDING to ACCEPTED).
        // Reassigning mid-delivery (e.g. rider went offline after pickup) leaves status alone.
        ...(isReassignment ? {} : { status: 'ACCEPTED' }),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        rider: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
    });

    // Free the previous rider back up
    if (isReassignment && previousRiderId) {
      await tx.rider.update({
        where: { id: previousRiderId },
        data: { availability: 'ONLINE' },
      });
    }

    // Lock in the new one
    await tx.rider.update({
      where: { id: riderId },
      data: { availability: 'BUSY' },
    });

    return result;
  });

  // ── Notifications ──
  notifyUser(updated.customerId, 'delivery:rider_assigned', {
    deliveryId,
    riderName: updated.rider?.user?.name,
    riderPhone: updated.rider?.user?.phone,
    reassigned: isReassignment,
    timestamp: new Date(),
  });

  if (isReassignment && previousRiderUserId) {
    notifyUser(previousRiderUserId, 'delivery:unassigned', {
      deliveryId,
      reason: 'Reassigned by admin',
      timestamp: new Date(),
    });
  }

  // Notify newly assigned rider
  if (rider.userId) {
    notifyUser(rider.userId, 'delivery:rider_assigned', {
      deliveryId,
      timestamp: new Date(),
    });
  }

  // Push notification for delivery status change
  await NotificationService.notifyDeliveryStatusChange(deliveryId, updated.status);

  // Tell the rider pool this delivery is spoken for (in case it was ever broadcast)
  notifyRiders('delivery:taken', { deliveryId });

  // Notify admins
  notifyAdmins('admin:delivery_assigned', {
    deliveryId,
    riderId,
    riderName: updated.rider?.user?.name,
    reassigned: isReassignment,
  });

  return updated;
}

export async function updateOrderStatusAdmin(
  orderId: string,
  newStatus: OrderStatus,
  options?: { riderId?: string }
) {
  if (!orderId) throw new Error('Order ID is required');

  const validStatuses: OrderStatus[] = [
    'PENDING',
    'ACCEPTED',
    'RIDER_ASSIGNED',
    'PICKED_UP',
    'IN_TRANSIT',
    'ARRIVED',
    'DELIVERED',
    'CANCELLED',
  ];

  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid order status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      vendor: true,
      customer: { select: { id: true, name: true, phone: true } },
      rider: { include: { user: { select: { id: true, name: true, phone: true } } } },
      items: { include: { product: true } },
    },
  });
  if (!order) throw new Error('Order not found');

  // Handle rider assignment
  let targetRiderId = options?.riderId !== undefined ? (options.riderId || null) : order.riderId;

  if (options?.riderId) {
    const riderExists = await prisma.rider.findUnique({
      where: { id: options.riderId },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });
    if (!riderExists) throw new Error('Rider not found');
  }

  // If status is PENDING, clear rider
  if (newStatus === 'PENDING') {
    targetRiderId = null;
  }

  // If status is RIDER_ASSIGNED, ensure a rider is assigned
  if (newStatus === 'RIDER_ASSIGNED' && !targetRiderId) {
    throw new Error('Rider ID is required to set status to RIDER_ASSIGNED');
  }

  // If transit/delivery in progress, require an assigned rider
  if (['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(newStatus) && !targetRiderId) {
    throw new Error(`A rider must be assigned before setting order status to ${newStatus}`);
  }

  const previousRiderId = order.riderId;
  const previousRiderUserId = order.rider?.user?.id;
  const isRiderChanging = targetRiderId !== previousRiderId;

  // Execute database updates inside transaction
  const updated = await prisma.$transaction(async (tx) => {
    // 1. Stock adjustments
    if (newStatus === 'CANCELLED' && order.orderStatus !== 'CANCELLED') {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    } else if (order.orderStatus === 'CANCELLED' && newStatus !== 'CANCELLED') {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // 2. Rider availability & earnings
    // Free previous rider if rider changed, or if resetting to PENDING/CANCELLED
    if (previousRiderId && (isRiderChanging || newStatus === 'PENDING' || newStatus === 'CANCELLED')) {
      await tx.rider.update({
        where: { id: previousRiderId },
        data: { availability: 'ONLINE' },
      });
    }

    // Adjust for prior DELIVERED status if reverting
    if (order.orderStatus === 'DELIVERED' && newStatus !== 'DELIVERED' && order.riderId) {
      await tx.rider.update({
        where: { id: order.riderId },
        data: {
          totalDeliveries: { decrement: 1 },
          earnings: { decrement: order.deliveryFee ?? 0 },
        },
      });
    }

    // Updates on target rider
    if (targetRiderId) {
      if (newStatus === 'DELIVERED' && order.orderStatus !== 'DELIVERED') {
        await tx.rider.update({
          where: { id: targetRiderId },
          data: {
            totalDeliveries: { increment: 1 },
            earnings: { increment: order.deliveryFee ?? 0 },
            availability: 'ONLINE',
          },
        });
      } else if (newStatus === 'CANCELLED') {
        await tx.rider.update({
          where: { id: targetRiderId },
          data: { availability: 'ONLINE' },
        });
      } else if (['RIDER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(newStatus)) {
        await tx.rider.update({
          where: { id: targetRiderId },
          data: { availability: 'BUSY' },
        });
      }
    }

    // 3. Update the Order
    return tx.order.update({
      where: { id: orderId },
      data: {
        orderStatus: newStatus,
        riderId: targetRiderId,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        vendor: { select: { businessName: true, address: true } },
        rider: { include: { user: { select: { id: true, name: true, phone: true } } } },
        items: { include: { product: { select: { name: true } } } },
      },
    });
  });

  // 4. Socket notifications and push notifications
  await emitOrderEvent(orderId, newStatus);
  await NotificationService.notifyOrderStatusChange(orderId, newStatus);

  // If status reset to PENDING, broadcast to rider pool
  if (newStatus === 'PENDING') {
    notifyRiders('delivery:new_request', {
      type: 'NEW_DELIVERY',
      orderId: order.id,
      pickupAddress: order.vendor?.address,
      destinationAddress: order.deliveryAddress,
      itemDescription: order.notes,
      estimatedFee: order.deliveryFee,
      paymentMethod: order.paymentMethod,
      customer: { name: order.recipientName, phone: order.recipientPhone },
      createdAt: order.createdAt,
    });
  }

  // Rider transition notifications
  if (isRiderChanging) {
    if (previousRiderUserId) {
      notifyUser(previousRiderUserId, 'delivery:unassigned', {
        orderId,
        reason: 'Order reassigned or updated by admin',
        timestamp: new Date(),
      });
    }

    if (targetRiderId && updated.rider?.user?.id) {
      notifyUser(updated.rider.user.id, 'delivery:rider_assigned', {
        orderId,
        timestamp: new Date(),
      });
      notifyRiders('delivery:taken', { orderId });
    }
  }

  return updated;
}

// ─── PLATFORM ANALYTICS ─────────────────────────────────

export async function getOrderAnalytics() {
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const [byStatus, last7DaysOrders, topVendors] = await Promise.all([
    prisma.order.groupBy({
      by: ['orderStatus'],
      _count: { id: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: last7Days } },
      select: { createdAt: true, totalAmount: true, orderStatus: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.order.groupBy({
      by: ['vendorId'],
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ]);

  // Enrich top vendors with names
  const vendorIds = topVendors.map((v) => v.vendorId);
  const vendors = await prisma.vendor.findMany({
    where: { id: { in: vendorIds } },
    select: { id: true, businessName: true },
  });

  const enrichedTopVendors = topVendors.map((v) => ({
    ...v,
    vendor: vendors.find((vn) => vn.id === v.vendorId),
  }));

  return {
    byStatus,
    last7Days: last7DaysOrders,
    topVendors: enrichedTopVendors,
  };
}

export async function getRiderAnalytics() {
  const topRiders = await prisma.rider.findMany({
    orderBy: { totalDeliveries: 'desc' },
    take: 10,
    include: {
      user: { select: { name: true, phone: true } },
    },
    where: { totalDeliveries: { gt: 0 } },
  });

  const availabilitySummary = await prisma.rider.groupBy({
    by: ['availability'],
    _count: { id: true },
  });

  return { topRiders, availabilitySummary };
}


export async function createVendorWithOwner(data: {
  businessName: string;
  businessType: string;
  address: string;
  phone: string;
  openingHours?: unknown;
  logo?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  password?: string;
}) {
  const existingUser = await prisma.user.findUnique({ where: { phone: data.ownerPhone } });
  if (existingUser) throw new Error('A user with this phone number already exists');

  const tempPassword = data.password?.trim() || crypto.randomBytes(4).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  
  const openingHours = data.openingHours ? validateOpeningHours(data.openingHours) : undefined;

  const vendor = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.ownerName.trim(),
        phone: data.ownerPhone.trim(),
        email: data.ownerEmail?.trim() || null,
        passwordHash,
        role: 'VENDOR',
        status: 'ACTIVE',
      },
    });

    return tx.vendor.create({
      data: {
        userId: user.id,
        businessName: data.businessName.trim(),
        businessType: data.businessType,
        address: data.address.trim(),
        phone: data.phone.trim(),
        openingHours: openingHours ?? undefined,
        logo: data.logo || null,
        status: 'ACTIVE', // admin-created vendors are pre-approved
      },
      include: { user: { select: { id: true, name: true, phone: true, email: true } } },
    });
  });

  return { vendor, tempPassword };
}

export async function updateVendorProfile(
  vendorId: string,
  data: { businessName?: string; businessType?: string; address?: string; phone?: string; openingHours?: unknown; logo?: string; }
) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error('Vendor not found');

  const payload: any = { ...data };
  if (data.openingHours !== undefined) {
    payload.openingHours = validateOpeningHours(data.openingHours);
  }

  return prisma.vendor.update({
    where: { id: vendorId },
    data: payload,
    include: { user: { select: { name: true, phone: true, email: true } } },
  });
}

// ─── PRODUCT MANAGEMENT ON BEHALF OF A VENDOR ──────────

export async function createProductForVendor(
  vendorId: string,
  data: { name: string; category: string; price: number; stock?: number; images?: string[]; available?: boolean; }
) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error('Vendor not found');

  return prisma.product.create({
    data: {
      vendorId,
      name: data.name.trim(),
      category: data.category,
      price: data.price,
      stock: data.stock ?? 0,
      images: data.images || [],
      available: data.available ?? true,
    },
  });
}

export async function deleteProductAdmin(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');
  await prisma.product.delete({ where: { id: productId } });
  return { message: 'Product deleted successfully' };
}

// ─── RIDER DAILY CASH/EARNINGS REPORT ───────────────────

export async function getRiderDailyReport(filters: {
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string;   // 'YYYY-MM-DD'
  riderId?: string;
}) {
  const start = filters.startDate ? startOfDay(new Date(filters.startDate)) : daysAgo(6);
  const endDay = filters.endDate ? startOfDay(new Date(filters.endDate)) : startOfDay(new Date());
  const end = new Date(endDay.getTime() + 24 * 60 * 60 * 1000 - 1); // inclusive end of day

  if (end < start) throw new Error('endDate cannot be before startDate');

  const [orders, deliveries] = await Promise.all([
    prisma.order.findMany({
      where: {
        orderStatus: 'DELIVERED',
        riderId: { not: null, ...(filters.riderId && { equals: filters.riderId }) },
        updatedAt: { gte: start, lte: end },
      },
      select: { riderId: true, updatedAt: true, subtotal: true, deliveryFee: true, paymentMethod: true },
    }),
    prisma.deliveryRequest.findMany({
      where: {
        status: 'DELIVERED',
        assignedRiderId: { not: null, ...(filters.riderId && { equals: filters.riderId }) },
        updatedAt: { gte: start, lte: end },
      },
      select: {
        assignedRiderId: true, updatedAt: true, itemsEstimatedTotal: true,
        deliveryFee: true, errandFee: true, paymentMethod: true, type: true,
      },
    }),
  ]);

  type Row = {
    riderId: string; date: string; jobs: number;
    itemsSubtotal: number; deliveryFees: number;
    cashCollected: number; momoCollected: number;
    grandTotal: number; netToRemit: number;
  };
  const map: Record<string, Row> = {};
  const ensure = (riderId: string, date: string) => {
    const k = `${riderId}|${date}`;
    if (!map[k]) map[k] = {
      riderId, date, jobs: 0, itemsSubtotal: 0, deliveryFees: 0,
      cashCollected: 0, momoCollected: 0, grandTotal: 0, netToRemit: 0,
    };
    return map[k];
  };

  for (const o of orders) {
    if (!o.riderId) continue;
    const date = startOfDay(o.updatedAt).toISOString().slice(0, 10);
    const row = ensure(o.riderId, date);
    const items = o.subtotal || 0;
    const fee = o.deliveryFee || 0;
    row.jobs += 1;
    row.itemsSubtotal += items;
    row.deliveryFees += fee;
    row.grandTotal += items + fee;
    if (o.paymentMethod === 'CASH') row.cashCollected += items + fee;
    else row.momoCollected += items + fee;
  }

  for (const d of deliveries) {
    if (!d.assignedRiderId) continue;
    const date = startOfDay(d.updatedAt).toISOString().slice(0, 10);
    const row = ensure(d.assignedRiderId, date);
    const items = d.itemsEstimatedTotal || 0;
    const fee = (d.deliveryFee || 0) + (d.errandFee || 0);
    row.jobs += 1;
    row.itemsSubtotal += items;
    row.deliveryFees += fee;
    row.grandTotal += items + fee;
    if (d.paymentMethod === 'CASH') row.cashCollected += items + fee;
    else row.momoCollected += items + fee;
  }

  for (const row of Object.values(map)) row.netToRemit = row.cashCollected - row.deliveryFees;

  const riderIds = [...new Set(Object.values(map).map(r => r.riderId))];
  const riders = await prisma.rider.findMany({
    where: { id: { in: riderIds } },
    include: { user: { select: { name: true, phone: true } } },
  });
  const riderMap = Object.fromEntries(riders.map(r => [r.id, r]));

  const rows = Object.values(map)
    .map(r => ({
      ...r,
      riderName: riderMap[r.riderId]?.user.name || 'Unknown',
      riderPhone: riderMap[r.riderId]?.user.phone || '',
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.riderName.localeCompare(b.riderName));

  // Same-shape totals, grouped by date only (for the per-day summary strip)
  const dailyMap: Record<string, Omit<Row, 'riderId'>> = {};
  for (const r of rows) {
    if (!dailyMap[r.date]) dailyMap[r.date] = {
      date: r.date, jobs: 0, itemsSubtotal: 0, deliveryFees: 0,
      cashCollected: 0, momoCollected: 0, grandTotal: 0, netToRemit: 0,
    };
    const t = dailyMap[r.date];
    t.jobs += r.jobs; t.itemsSubtotal += r.itemsSubtotal; t.deliveryFees += r.deliveryFees;
    t.cashCollected += r.cashCollected; t.momoCollected += r.momoCollected;
    t.grandTotal += r.grandTotal; t.netToRemit += r.netToRemit;
  }
  const dailyTotals = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));

  // Grand totals across the whole range, for header cards
  const overall = dailyTotals.reduce((acc, d) => ({
    jobs: acc.jobs + d.jobs,
    itemsSubtotal: acc.itemsSubtotal + d.itemsSubtotal,
    deliveryFees: acc.deliveryFees + d.deliveryFees,
    cashCollected: acc.cashCollected + d.cashCollected,
    momoCollected: acc.momoCollected + d.momoCollected,
    grandTotal: acc.grandTotal + d.grandTotal,
    netToRemit: acc.netToRemit + d.netToRemit,
  }), { jobs: 0, itemsSubtotal: 0, deliveryFees: 0, cashCollected: 0, momoCollected: 0, grandTotal: 0, netToRemit: 0 });

  return { rows, dailyTotals, overall, range: { start: start.toISOString(), end: end.toISOString() } };
}