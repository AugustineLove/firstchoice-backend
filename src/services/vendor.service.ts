import { prisma } from '../config/prisma';
import * as NotificationService from './notification.service';
export async function registerVendor(
  userId: string,
  data: {
    businessName: string;
    businessType: string;
    address: string;
    phone: string;
    logo?: string;
    openingHours?: string;
  }
) {
  const existingVendor = await prisma.vendor.findUnique({ where: { userId } });
  if (existingVendor) throw new Error('You already have a vendor profile');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const vendor = await prisma.$transaction(async (tx) => {
    const newVendor = await tx.vendor.create({
      data: {
        userId,
        businessName: data.businessName.trim(),
        businessType: data.businessType.trim(),
        address: data.address.trim(),
        phone: data.phone.trim(),
        logo: data.logo || null,
        openingHours: data.openingHours || null,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { role: 'VENDOR' },
    });
    await NotificationService.notifyVendorPendingApproval(data.businessName);
    return newVendor;
  });

  return vendor;
}

export async function getVendorProfile(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      user: {
        select: { name: true, phone: true, email: true },
      },
      products: {
        where: { available: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!vendor) throw new Error('Vendor not found');
  return vendor;
}

export async function getMyVendorProfile(userId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    include: {
      products: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!vendor) throw new Error('No vendor profile found for this account');
  return vendor;
}

export async function updateVendorProfile(
  userId: string,
  data: {
    businessName?: string;
    businessType?: string;
    address?: string;
    phone?: string;
    logo?: string;
    openingHours?: string;
  }
) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new Error('Vendor profile not found');

  return prisma.vendor.update({
    where: { userId },
    data,
  });
}

export async function getAllVendors(filters: {
  businessType?: string;
  search?: string;
}) {
  return prisma.vendor.findMany({
    where: {
      status: 'ACTIVE',
      ...(filters.businessType && { businessType: filters.businessType }),
      ...(filters.search && {
        businessName: { contains: filters.search, mode: 'insensitive' },
      }),
    },
    select: {
      id: true,
      businessName: true,
      businessType: true,
      address: true,
      logo: true,
      openingHours: true,
      rating: true,
      status: true,
    },
    orderBy: { rating: 'desc' },
  });
}

export async function getVendorOrders(userId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new Error('Vendor profile not found');

  return prisma.order.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true, phone: true } },
      rider: {
        select: { user: { select: { name: true, phone: true } } },
      },
      items: {
        include: { product: { select: { name: true, price: true } } },
      },
    },
  });
}

export async function getVendorStats(userId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new Error('Vendor profile not found');

  const [totalOrders, completedOrders, pendingOrders, totalProducts] =
    await Promise.all([
      prisma.order.count({ where: { vendorId: vendor.id } }),
      prisma.order.count({
        where: { vendorId: vendor.id, orderStatus: 'DELIVERED' },
      }),
      prisma.order.count({
        where: {
          vendorId: vendor.id,
          orderStatus: { in: ['PENDING', 'ACCEPTED', 'PREPARING'] },
        },
      }),
      prisma.product.count({ where: { vendorId: vendor.id } }),
    ]);

  const revenue = await prisma.order.aggregate({
    where: { vendorId: vendor.id, orderStatus: 'DELIVERED' },
    _sum: { totalAmount: true },
  });

  return {
    totalOrders,
    completedOrders,
    pendingOrders,
    totalProducts,
    totalRevenue: revenue._sum.totalAmount || 0,
  };
}