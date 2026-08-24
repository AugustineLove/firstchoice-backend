import { prisma } from '../config/prisma';

export async function registerRider(
  userId: string,
  data: {
    bikeType: string;
    licenseNumber?: string;
  }
) {
  const existingRider = await prisma.rider.findUnique({ where: { userId } });
  if (existingRider) throw new Error('You already have a rider profile');

  const rider = await prisma.$transaction(async (tx) => {
    const newRider = await tx.rider.create({
      data: {
        userId,
        bikeType: data.bikeType.trim(),
        licenseNumber: data.licenseNumber?.trim() || null,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { role: 'RIDER' },
    });

    return newRider;
  });

  return rider;
}

export async function getRiderProfile(riderId: string) {
  const rider = await prisma.rider.findUnique({
    where: { id: riderId },
    include: {
      user: {
        select: {
          name: true,
          phone: true,
          email: true,
          profileImage: true,
          status: true,
        },
      },
    },
  });

  if (!rider) throw new Error('Rider not found');
  return rider;
}

export async function getMyRiderProfile(userId: string) {
  const rider = await prisma.rider.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          name: true,
          phone: true,
          email: true,
          profileImage: true,
        },
      },
    },
  });

  if (!rider) throw new Error('No rider profile found for this account');
  return rider;
}

export async function toggleAvailability(
  userId: string,
  availability: 'ONLINE' | 'OFFLINE'
) {
  const rider = await prisma.rider.findUnique({ where: { userId } });
  if (!rider) throw new Error('Rider profile not found');

  return prisma.rider.update({
    where: { userId },
    data: { availability },
  });
}

export async function updateRiderLocation(
  userId: string,
  data: { latitude: number; longitude: number }
) {
  const rider = await prisma.rider.findUnique({ where: { userId } });
  if (!rider) throw new Error('Rider profile not found');

  return prisma.rider.update({
    where: { userId },
    data: {
      currentLatitude: data.latitude,
      currentLongitude: data.longitude,
    },
  });
}

export async function getAvailableRiders() {
  return prisma.rider.findMany({
    where: { availability: 'ONLINE' },
    include: {
      user: {
        select: { name: true, phone: true, profileImage: true },
      },
    },
    orderBy: { rating: 'desc' },
  });
}

export async function getRiderEarnings(userId: string) {
  const rider = await prisma.rider.findUnique({ where: { userId } });
  if (!rider) throw new Error('Rider profile not found');

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [allOrders, allDeliveries, todayOrders, todayDeliveries] = await Promise.all([
    prisma.order.findMany({
      where: { riderId: rider.id, orderStatus: 'DELIVERED' },
      select: { deliveryFee: true },
    }),
    prisma.deliveryRequest.findMany({
      where: { assignedRiderId: rider.id, status: 'DELIVERED' },
      select: { estimatedFee: true },
    }),
    prisma.order.findMany({
      where: { riderId: rider.id, orderStatus: 'DELIVERED', updatedAt: { gte: startOfToday } },
      select: { deliveryFee: true },
    }),
    prisma.deliveryRequest.findMany({
      where: { assignedRiderId: rider.id, status: 'DELIVERED', updatedAt: { gte: startOfToday } },
      select: { estimatedFee: true },
    }),
  ]);

  const sum = (arr: (number | null)[]) => arr.reduce((s: number, n) => s + (n ?? 0), 0);

  const allOrdersEarnings      = sum(allOrders.map(o => o.deliveryFee));
  const allDeliveriesEarnings  = sum(allDeliveries.map(d => d.estimatedFee));
  const todayOrdersEarnings    = sum(todayOrders.map(o => o.deliveryFee));
  const todayDeliveriesEarnings = sum(todayDeliveries.map(d => d.estimatedFee));

  return {
    rating: rider.rating,
    allTime: {
      total:           allOrdersEarnings + allDeliveriesEarnings,
      orders:          allOrdersEarnings,
      deliveries:      allDeliveriesEarnings,
      ordersCount:     allOrders.length,
      deliveriesCount: allDeliveries.length,
    },
    today: {
      total:           todayOrdersEarnings + todayDeliveriesEarnings,
      orders:          todayOrdersEarnings,
      deliveries:      todayDeliveriesEarnings,
      ordersCount:     todayOrders.length,
      deliveriesCount: todayDeliveries.length,
    },
  };
}

export async function getRiderActiveJobs(userId: string) {
  const rider = await prisma.rider.findUnique({ where: { userId } });
  if (!rider) throw new Error('Rider profile not found');

  const [activeOrders, activeDeliveries] = await Promise.all([
    prisma.order.findMany({
      where: {
        riderId: rider.id,
        orderStatus: { in: ['RIDER_ASSIGNED', 'PICKED_UP'] },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        vendor: { select: { businessName: true, address: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    }),
    prisma.deliveryRequest.findMany({
      where: {
        assignedRiderId: rider.id,
        status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
      },
      include: {
        customer: { select: { name: true, phone: true } },
      },
    }),
  ]);

  return { activeOrders, activeDeliveries };
}

export async function getRiderJobHistory(userId: string) {
  const rider = await prisma.rider.findUnique({ where: { userId } });
  if (!rider) throw new Error('Rider profile not found');

  const [completedOrders, completedDeliveries] = await Promise.all([
    prisma.order.findMany({
      where: { riderId: rider.id, orderStatus: 'DELIVERED' },
      include: {
        customer: { select: { name: true, phone: true } },
        vendor:   { select: { businessName: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.deliveryRequest.findMany({
      where: { assignedRiderId: rider.id, status: 'DELIVERED' },
      include: {
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return { completedOrders, completedDeliveries };
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return startOfDay(d); }

export async function getRiderInsights(riderId: string) {
  const rider = await prisma.rider.findUnique({
    where: { id: riderId },
    include: { user: { select: { name: true, phone: true, email: true, profileImage: true, status: true, createdAt: true } } },
  });
  if (!rider) throw new Error('Rider not found');

  const since30    = daysAgo(30);
  const startToday = startOfDay(new Date());
  const startWeek  = daysAgo(7);

  const [
    allOrders, allDeliveries,
    ordersLast30, deliveriesLast30,
    activeOrders, activeDeliveries,
    cancelledOrders, cancelledDeliveries,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { riderId },
      select: { id: true, orderStatus: true, deliveryFee: true, createdAt: true, updatedAt: true,
        vendor: { select: { businessName: true } }, customer: { select: { name: true } } },
    }),
    prisma.deliveryRequest.findMany({
      where: { assignedRiderId: riderId },
      select: { id: true, status: true, estimatedFee: true, type: true, createdAt: true, updatedAt: true,
        customer: { select: { name: true } } },
    }),
    prisma.order.findMany({ where: { riderId, orderStatus: 'DELIVERED', updatedAt: { gte: since30 } }, select: { deliveryFee: true, updatedAt: true } }),
    prisma.deliveryRequest.findMany({ where: { assignedRiderId: riderId, status: 'DELIVERED', updatedAt: { gte: since30 } }, select: { estimatedFee: true, updatedAt: true } }),
    prisma.order.count({ where: { riderId, orderStatus: { in: ['RIDER_ASSIGNED', 'PICKED_UP'] } } }),
    prisma.deliveryRequest.count({ where: { assignedRiderId: riderId, status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] } } }),
    prisma.order.count({ where: { riderId, orderStatus: 'CANCELLED' } }),
    prisma.deliveryRequest.count({ where: { assignedRiderId: riderId, status: 'CANCELLED' } }),
  ]);

  const deliveredOrders     = allOrders.filter(o => o.orderStatus === 'DELIVERED');
  const deliveredDeliveries = allDeliveries.filter(d => d.status === 'DELIVERED');

  const totalDelivered  = deliveredOrders.length + deliveredDeliveries.length;
  const totalCancelled  = cancelledOrders + cancelledDeliveries;
  const totalJobsEver   = allOrders.length + allDeliveries.length;
  const completionRate  = totalJobsEver > 0 ? Math.round((totalDelivered / totalJobsEver) * 1000) / 10 : 0;

  const sum = (arr: (number | null | undefined)[]) => arr.reduce((s: number, n) => s + (n ?? 0), 0);
  const totalEarnings = sum(deliveredOrders.map(o => o.deliveryFee)) + sum(deliveredDeliveries.map(d => d.estimatedFee));

  const todayEarnings =
    sum(deliveredOrders.filter(o => o.updatedAt >= startToday).map(o => o.deliveryFee)) +
    sum(deliveredDeliveries.filter(d => d.updatedAt >= startToday).map(d => d.estimatedFee));

  const weekEarnings =
    sum(deliveredOrders.filter(o => o.updatedAt >= startWeek).map(o => o.deliveryFee)) +
    sum(deliveredDeliveries.filter(d => d.updatedAt >= startWeek).map(d => d.estimatedFee));

  // ── Daily earnings, last 30 days ──
  const dayMap: Record<string, { date: string; orders: number; deliveries: number; total: number; jobCount: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const key = daysAgo(i).toISOString().slice(0, 10);
    dayMap[key] = { date: key, orders: 0, deliveries: 0, total: 0, jobCount: 0 };
  }
  for (const o of ordersLast30) {
    const key = startOfDay(o.updatedAt).toISOString().slice(0, 10);
    if (dayMap[key]) { dayMap[key].orders += o.deliveryFee ?? 0; dayMap[key].total += o.deliveryFee ?? 0; dayMap[key].jobCount += 1; }
  }
  for (const d of deliveriesLast30) {
    const key = startOfDay(d.updatedAt).toISOString().slice(0, 10);
    if (dayMap[key]) { dayMap[key].deliveries += d.estimatedFee ?? 0; dayMap[key].total += d.estimatedFee ?? 0; dayMap[key].jobCount += 1; }
  }
  const dailyEarnings = Object.values(dayMap);

  // ── Weekday performance, all-time delivered ──
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const o of deliveredOrders) weekdayCounts[o.updatedAt.getDay()]++;
  for (const d of deliveredDeliveries) weekdayCounts[d.updatedAt.getDay()]++;
  const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayBreakdown = WEEKDAY_LABELS.map((label, i) => ({ day: label, jobs: weekdayCounts[i] }));

  // ── Job type breakdown ──
  const jobTypeBreakdown = [
    { type: 'Marketplace Orders', count: allOrders.length },
    { type: 'Pickup Deliveries',  count: allDeliveries.filter(d => d.type === 'PICKUP').length },
    { type: 'Errands',            count: allDeliveries.filter(d => d.type === 'ERRAND').length },
  ];

  // ── Current status breakdown ──
  const statusCounts: Record<string, number> = {};
  for (const o of allOrders) statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1;
  for (const d of allDeliveries) statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  // ── Recent activity feed ──
  const recentActivity = [
    ...allOrders.map(o => ({ id: o.id, kind: 'order' as const, status: o.orderStatus, amount: o.deliveryFee, counterparty: o.customer?.name, note: o.vendor?.businessName, date: o.updatedAt })),
    ...allDeliveries.map(d => ({ id: d.id, kind: 'delivery' as const, status: d.status, amount: d.estimatedFee, counterparty: d.customer?.name, note: d.type, date: d.updatedAt })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

  return {
    profile: {
      id: rider.id,
      name: rider.user.name,
      phone: rider.user.phone,
      email: rider.user.email,
      profileImage: rider.user.profileImage,
      accountStatus: rider.user.status,
      joined: rider.user.createdAt,
      bikeType: rider.bikeType,
      licenseNumber: rider.licenseNumber,
      availability: rider.availability,
      rating: rider.rating,
      currentLatitude: rider.currentLatitude,
      currentLongitude: rider.currentLongitude,
    },
    summary: {
      totalEarnings, todayEarnings, weekEarnings,
      totalJobsEver, totalDelivered, totalCancelled, completionRate,
      activeJobs: activeOrders + activeDeliveries,
    },
    charts: { dailyEarnings, weekdayBreakdown, jobTypeBreakdown, statusBreakdown },
    recentActivity,
  };
}

// ─── ADMIN: PAGINATED, FILTERABLE JOB HISTORY (orders + deliveries merged) ──
export async function getRiderJobsPaginated(riderId: string, filters: {
  page?: number; limit?: number; kind?: 'order' | 'delivery'; status?: string;
}) {
  const page  = filters.page || 1;
  const limit = filters.limit || 20;

  const [orders, deliveries] = await Promise.all([
    filters.kind === 'delivery' ? [] : prisma.order.findMany({
      where: { riderId, ...(filters.status && { orderStatus: filters.status as any }) },
      include: { customer: { select: { name: true, phone: true } }, vendor: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    filters.kind === 'order' ? [] : prisma.deliveryRequest.findMany({
      where: { assignedRiderId: riderId, ...(filters.status && { status: filters.status as any }) },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const merged = [
    ...orders.map(o => ({
      id: o.id, kind: 'order' as const, status: o.orderStatus,
      amount: o.deliveryFee, totalAmount: o.totalAmount,
      customer: o.customer, counterparty: o.vendor?.businessName,
      from: o.vendorAddress, to: o.deliveryAddress,
      createdAt: o.createdAt, updatedAt: o.updatedAt,
    })),
    ...deliveries.map(d => ({
      id: d.id, kind: 'delivery' as const, status: d.status,
      amount: d.estimatedFee, totalAmount: d.estimatedFee,
      customer: d.customer, counterparty: d.type,
      from: d.pickupAddress, to: d.destinationAddress,
      createdAt: d.createdAt, updatedAt: d.updatedAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = merged.length;
  const start = (page - 1) * limit;

  return {
    jobs: merged.slice(start, start + limit),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}