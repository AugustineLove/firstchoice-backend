import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';
import dotenv from 'dotenv';
import { sendPasswordResetEmail } from './email.service';
dotenv.config();
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';
import firebase from 'firebase/compat/app';


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
    expiresIn: '10d',
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

function maskEmail(email: string) {
  const [namePart, domain] = email.split('@');
  const visible = namePart.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(namePart.length - 2, 1))}@${domain}`;
}

export async function resetPassword(
  token: string,
  newPassword: string
) {

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
    },
  });


  if (!user) {
    throw new Error("Invalid or expired reset link");
  }


  if (!user.resetPasswordExpiry) {
    throw new Error("No password reset request found");
  }


  if (user.resetPasswordExpiry < new Date()) {

    throw new Error(
      "This reset link has expired. Please request a new one"
    );

  }


  const passwordHash = await bcrypt.hash(
    newPassword,
    10
  );


  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash,

      // remove token after successful reset
      resetPasswordToken: null,
      resetPasswordExpiry: null,
    },
  });


  return {
    message: "Password reset successfully",
  };
}

export async function resetPasswordEmail(phone: string) {
  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user) {
    throw new Error("No account found with this phone number");
  }

  if (!user.email) {
    throw new Error("No email associated with this account");
  }

  const token = crypto.randomBytes(32).toString("hex");

  const hashedToken = await bcrypt.hash(token, 10);
  console.log(`Token: ${token}, HashedToken: ${hashedToken}`)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: token,
      resetPasswordExpiry: new Date(Date.now() + 15 * 60 * 1000),
    },
  });


  const resetLink =
    `https://firstchoice-ten.vercel.app/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;


    console.log(`Email: ${user.email}, Name: ${user.name}, ResetLink: ${resetLink}`)
  await sendPasswordResetEmail(
    user.email,
    user.name,
    resetLink
  );


  return {
    message: "Password reset link sent",
  };
}

// Reuse whatever firebase-admin app instance you already initialized for FCM.

// async function ensureFirebaseMirror(user: { id: string; email: string | null; firebaseUid: string | null; name: string }) {
//   if (!user.email) throw new Error('No email is on file for this account. Please contact support to reset your password.');
//   if (user.firebaseUid) return user.firebaseUid;

//   let firebaseUser;
//   try {
//     firebaseUser = await firebaseAuth.getUserByEmail(user.email);
//   } catch {
//     firebaseUser = await firebaseAuth.createUser({
//       email: user.email,
//       password: crypto.randomBytes(16).toString('hex'), // never used to log in directly
//       displayName: user.name,
//       emailVerified: false,
//     });
//   }

//   await prisma.user.update({ where: { id: user.id }, data: { firebaseUid: firebaseUser.uid } });
//   return firebaseUser.uid;
// }

// export async function requestPasswordReset(phone: string) {
//   const user = await prisma.user.findUnique({ where: { phone } });
//   if (!user) throw new Error('No account found with that phone number');

//   await ensureFirebaseMirror(user);

//   // Flutter will call FirebaseAuth.sendPasswordResetEmail directly with this address.
//   return { email: user.email! };
// }
