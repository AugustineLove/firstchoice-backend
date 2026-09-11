import { prisma } from '../config/prisma';
import * as NotificationService from './notification.service';
import { isWithinHours } from '../utils/hours.util';

export async function registerVendor(
  userId: string,
  data: {
    businessName: string;
    businessType: string;
    address: string;
    phone: string;
    logo?: string;
    openingHours?: unknown;
  }
) {
  const existingVendor = await prisma.vendor.findUnique({ where: { userId } });
  if (existingVendor) throw new Error('You already have a vendor profile');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const openingHours = data.openingHours ? validateOpeningHours(data.openingHours) : undefined;


  const vendor = await prisma.$transaction(async (tx) => {
    const newVendor = await tx.vendor.create({
      data: {
        userId,
        businessName: data.businessName.trim(),
        businessType: data.businessType.trim(),
        address: data.address.trim(),
        phone: data.phone.trim(),
        logo: data.logo || null,
        openingHours: openingHours ?? undefined,
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
  return { ...vendor, isOpen: isWithinHours(vendor.openingHours as any) };
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
    openingHours?: unknown;
    latitude?: string;
    longitude?: string;
  }
) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new Error('Vendor profile not found');

  // Basic sanity check: if provided, latitude/longitude must parse to real
  // numbers within valid GPS ranges before we persist them.
  if (data.latitude !== undefined) {
    const lat = Number(data.latitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new Error('Invalid latitude value');
    }
  }
  if (data.longitude !== undefined) {
    const lng = Number(data.longitude);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new Error('Invalid longitude value');
    }
  }

   const payload: any = { ...data };
  if (data.openingHours !== undefined) {
    payload.openingHours = validateOpeningHours(data.openingHours);
  }

  return prisma.vendor.update({ where: { userId }, data: payload });
}

export async function getAllVendors(filters: { businessType?: string; search?: string }) {
  const vendors = await prisma.vendor.findMany({
    where: {
      status: 'ACTIVE',
      ...(filters.businessType && { businessType: filters.businessType }),
      ...(filters.search && { businessName: { contains: filters.search, mode: 'insensitive' } }),
    },
    select: {
      id: true, businessName: true, businessType: true, address: true,
      logo: true, openingHours: true, rating: true, status: true,
    },
    orderBy: { rating: 'desc' },
  });

  return vendors.map((v) => ({ ...v, isOpen: isWithinHours(v.openingHours as any) }));
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
          orderStatus: { in: ['PENDING', 'ACCEPTED'] },
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

type DayHours = { start: string; end: string }[];
type WeeklyHours = Record<string, DayHours>;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function validateOpeningHours(hours: unknown): WeeklyHours {
  if (typeof hours !== 'object' || hours === null) {
    throw new Error('openingHours must be an object keyed by day (0-6)');
  }
  const result: WeeklyHours = {};
  for (const [day, ranges] of Object.entries(hours as Record<string, unknown>)) {
    const dayNum = Number(day);
    if (!Number.isInteger(dayNum) || dayNum < 0 || dayNum > 6) {
      throw new Error(`Invalid day key "${day}" — must be 0-6`);
    }
    if (!Array.isArray(ranges)) {
      throw new Error(`openingHours["${day}"] must be an array`);
    }
    result[day] = ranges.map((r: any) => {
      if (!r || typeof r.start !== 'string' || typeof r.end !== 'string') {
        throw new Error(`Invalid time range for day ${day}`);
      }
      if (!TIME_RE.test(r.start) || !TIME_RE.test(r.end)) {
        throw new Error(`Times must be HH:mm — got "${r.start}"–"${r.end}"`);
      }
      if (r.start >= r.end) {
        throw new Error(`Range start must be before end (day ${day})`);
      }
      return { start: r.start, end: r.end };
    });
  }
  return result;
}