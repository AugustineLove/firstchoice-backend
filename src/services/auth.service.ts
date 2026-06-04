import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

async function buildUserResponse(user: any) {
  const vendorProfile = await prisma.vendor.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return {
    id:               user.id,
    name:             user.name,
    phone:            user.phone,
    email:            user.email,
    role:             user.role,
    status:           user.status,
    profileImage:     user.profileImage,
    hasVendorProfile: vendorProfile !== null,  // ← actual DB check
  };
}


function generateTokens(userId: string, role: Role) {
  const accessToken = jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ id: userId, role }, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
}

export async function registerUser(data: {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role?: Role;
}) {
  const existing = await prisma.user.findUnique({
    where: { phone: data.phone },
  });
  console.log(data);

  if (existing) throw new Error('Phone number already registered');

  const passwordHash = await bcrypt.hash(data.password, 10);

  const rawUser = await prisma.user.create({
    data: {
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      passwordHash,
      role: data.role || 'CUSTOMER',
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  const tokens = generateTokens(rawUser.id, rawUser.role);
  const user   = await buildUserResponse(rawUser);

  return { user, ...tokens };
}

export async function loginUser(data: {
  phone: string;
  password: string;
}) {
  console.log(data);
  const rawUser = await prisma.user.findUnique({
    where: { phone: data.phone },
  });

  if (!rawUser) throw new Error('Invalid phone number or password');

  if (rawUser.status === 'SUSPENDED')
    throw new Error('Your account has been suspended');

  const isMatch = await bcrypt.compare(data.password, rawUser.passwordHash);
  if (!isMatch) throw new Error('Invalid phone number or password');

  const tokens = generateTokens(rawUser.id, rawUser.role);
  const user   = await buildUserResponse(rawUser);
  return { user, ...tokens };
}

export async function refreshAccessToken(token: string) {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as {
      id: string;
      role: Role;
    };

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) throw new Error('User not found');
    if (user.status === 'SUSPENDED') throw new Error('Account suspended');

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    return { accessToken };
  } catch {
    throw new Error('Invalid or expired refresh token');
  }
}