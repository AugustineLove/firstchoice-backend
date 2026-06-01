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

  const [completedOrders, completedDeliveries] = await Promise.all([
    prisma.order.count({
      where: { riderId: rider.id, orderStatus: 'DELIVERED' },
    }),
    prisma.deliveryRequest.count({
      where: { assignedRiderId: rider.id, status: 'DELIVERED' },
    }),
  ]);

  return {
    totalEarnings: rider.earnings,
    totalDeliveries: rider.totalDeliveries,
    rating: rider.rating,
    completedOrders,
    completedDeliveries,
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