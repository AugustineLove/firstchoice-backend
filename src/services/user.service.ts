import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      status: true,
      profileImage: true,
      createdAt: true,
      rider: {
        select: {
          id: true,
          bikeType: true,
          availability: true,
          rating: true,
          totalDeliveries: true,
          earnings: true,
        },
      },
      vendor: {
        select: {
          id: true,
          businessName: true,
          businessType: true,
          status: true,
          rating: true,
        },
      },
    },
  });

  if (!user) throw new Error('User not found');
  return user;
}

export async function updateProfile(
  id: string,
  data: { name?: string; email?: string; profileImage?: string }
) {
  if (data.email) {
    const existing = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id } },
    });
    if (existing) throw new Error('Email already in use');
  }

  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      profileImage: true,
      role: true,
      status: true,
    },
  });
}

export async function changePassword(
  id: string,
  data: { currentPassword: string; newPassword: string }
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');

  const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!isMatch) throw new Error('Current password is incorrect');

  if (data.newPassword.length < 6)
    throw new Error('New password must be at least 6 characters');

  const passwordHash = await bcrypt.hash(data.newPassword, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });

  return { message: 'Password changed successfully' };
}

export async function getUserOrders(id: string) {
  return prisma.order.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      vendor: { select: { businessName: true, logo: true } },
      items: {
        include: {
          product: { select: { name: true, images: true } },
        },
      },
      rider: {
        select: {
          user: { select: { name: true, phone: true } },
        },
      },
    },
  });
}

export async function getUserDeliveries(id: string) {
  return prisma.deliveryRequest.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      rider: {
        select: {
          user: { select: { name: true, phone: true } },
        },
      },
    },
  });
}

export async function getUserErrands(id: string) {
  return prisma.errand.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' },
  });
}