import * as NotificationService from './notification.service';
import { UserStatus, VendorStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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
    paymentMethodCounts,
    topVendorsRaw, topRiders,
    allTimeRevenue,
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
    prisma.order.groupBy({ by: ['paymentMethod'], _count: { id: true } }),

    prisma.order.groupBy({
      by: ['vendorId'], _count: { id: true }, _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } }, take: 5,
    }),
    prisma.rider.findMany({
      orderBy: { earnings: 'desc' }, take: 5,
      include: { user: { select: { name: true, phone: true } } },
    }),

    prisma.order.aggregate({ where: { orderStatus: 'DELIVERED' }, _sum: { totalAmount: true } }),
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
    if (dayMap[key]) { dayMap[key].orderRevenue += o.totalAmount ?? 0; dayMap[key].orderCount += 1; }
  }
  for (const d of deliveriesLast30) {
    const key = startOfDay(d.createdAt).toISOString().slice(0, 10);
    if (dayMap[key]) { dayMap[key].deliveryRevenue += d.estimatedFee ?? 0; dayMap[key].deliveryCount += 1; }
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

  // ── Payment method mix ──
  const paymentMethodBreakdown = paymentMethodCounts.map(p => ({ method: p.paymentMethod, count: p._count.id }));

  // ── Cancellation rate, last 30 days ──
  const cancelledLast30 =
    ordersLast30.filter(o => o.orderStatus === 'CANCELLED').length +
    deliveriesLast30.filter(d => d.status === 'CANCELLED').length;
  const totalLast30 = ordersLast30.length + deliveriesLast30.length;
  const cancellationRate = totalLast30 > 0 ? Math.round((cancelledLast30 / totalLast30) * 1000) / 10 : 0;

  const revenueToday = dailyTrend[dailyTrend.length - 1]?.totalRevenue || 0;

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
      totalRevenueAllTime: allTimeRevenue._sum.totalAmount || 0,
      cancellationRate,
    },
    dailyTrend,
    userGrowth,
    orderStatusBreakdown: orderStatusCounts.map(o => ({ status: o.orderStatus, count: o._count.id })),
    deliveryStatusBreakdown: deliveryStatusCounts.map(d => ({ status: d.status, count: d._count.id })),
    orderTypeBreakdown,
    paymentMethodBreakdown,
    topVendors,
    topRiders: topRiders.map(r => ({
      id: r.id, name: r.user.name, phone: r.user.phone,
      earnings: r.earnings, totalDeliveries: r.totalDeliveries, rating: r.rating, availability: r.availability,
    })),
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
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  if (order.orderStatus !== 'PENDING')
    throw new Error('Order must be  before assigning a rider');

  const rider = await prisma.rider.findUnique({ where: { id: riderId } });
  if (!rider) throw new Error('Rider not found');
  if (rider.availability !== 'ONLINE')
    throw new Error('Rider is not available');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        riderId,
        orderStatus: 'RIDER_ASSIGNED',
      },
      include: {
        customer: { select: { name: true, phone: true } },
        vendor: { select: { businessName: true, address: true } },
        rider: {
          include: { user: { select: { name: true, phone: true } } },
        },
        items: { include: { product: { select: { name: true } } } },
      },
    });

    await tx.rider.update({
      where: { id: riderId },
      data: { availability: 'BUSY' },
    });

    return updated;
  });
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
  openingHours?: string;
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
        openingHours: data.openingHours || null,
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
  data: { businessName?: string; businessType?: string; address?: string; phone?: string; openingHours?: string; logo?: string; }
) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error('Vendor not found');

  return prisma.vendor.update({
    where: { id: vendorId },
    data,
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