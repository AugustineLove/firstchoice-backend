import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';

const PHONE_REGEX = /^(0|\+233)\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  // Store consistently as local format (0XXXXXXXXX)
  if (trimmed.startsWith('+233')) return '0' + trimmed.slice(4);
  return trimmed;
}

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
  data: { name?: string; email?: string; phone?: string; profileImage?: string }
) {
  const updateData: Record<string, any> = {};

  if (data.name !== undefined) {
    const name = data.name.trim();
    if (name.length < 2) throw new Error('Name must be at least 2 characters');
    updateData.name = name;
  }

  if (data.email !== undefined) {
    const email = data.email.trim();
    if (email.length > 0) {
      if (!EMAIL_REGEX.test(email)) throw new Error('Please enter a valid email address');
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (existing) throw new Error('Email is already in use by another account');
      updateData.email = email;
    } else {
      updateData.email = null;
    }
  }

  if (data.phone !== undefined) {
    const phone = normalizePhone(data.phone);
    if (!PHONE_REGEX.test(data.phone.trim())) {
      throw new Error('Please enter a valid Ghanaian phone number (e.g. 024XXXXXXX)');
    }
    const existing = await prisma.user.findFirst({
      where: { phone, NOT: { id } },
    });
    if (existing) throw new Error('Phone number is already in use by another account');
    updateData.phone = phone;
  }

  if (data.profileImage !== undefined) {
    updateData.profileImage = data.profileImage;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('No changes to save');
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
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

  if (data.newPassword === data.currentPassword)
    throw new Error('New password must be different from current password');

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
      items: { include: { product: { select: { name: true, images: true } } } },
      rider: { select: { user: { select: { name: true, phone: true } } } },
    },
  });
}

export async function getUserDeliveries(id: string) {
  return prisma.deliveryRequest.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' },
    include: { rider: { select: { user: { select: { name: true, phone: true } } } } },
  });
}

export async function getUserErrands(id: string) {
  return prisma.errand.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' },
  });
}