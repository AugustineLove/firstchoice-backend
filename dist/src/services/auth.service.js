"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.refreshAccessToken = refreshAccessToken;
exports.resetPassword = resetPassword;
exports.resetPasswordEmail = resetPasswordEmail;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const dotenv_1 = __importDefault(require("dotenv"));
const email_service_1 = require("./email.service");
dotenv_1.default.config();
const crypto_1 = __importDefault(require("crypto"));
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
async function buildUserResponse(user) {
    const vendorProfile = await prisma_1.prisma.vendor.findUnique({
        where: { userId: user.id },
        select: { id: true },
    });
    return {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage,
        hasVendorProfile: vendorProfile !== null, // ← actual DB check
    };
}
function generateTokens(userId, role) {
    const accessToken = jsonwebtoken_1.default.sign({ id: userId, role }, JWT_SECRET, {
        expiresIn: '10d',
    });
    const refreshToken = jsonwebtoken_1.default.sign({ id: userId, role }, JWT_REFRESH_SECRET, {
        expiresIn: '7d',
    });
    return { accessToken, refreshToken };
}
async function registerUser(data) {
    const existing = await prisma_1.prisma.user.findUnique({
        where: { phone: data.phone },
    });
    console.log(data);
    if (existing)
        throw new Error('Phone number already registered');
    const passwordHash = await bcryptjs_1.default.hash(data.password, 10);
    const rawUser = await prisma_1.prisma.user.create({
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
    const user = await buildUserResponse(rawUser);
    return { user, ...tokens };
}
async function loginUser(data) {
    console.log(data);
    const rawUser = await prisma_1.prisma.user.findUnique({
        where: { phone: data.phone },
    });
    if (!rawUser)
        throw new Error('Invalid phone number or password');
    if (rawUser.status === 'SUSPENDED')
        throw new Error('Your account has been suspended');
    const isMatch = await bcryptjs_1.default.compare(data.password, rawUser.passwordHash);
    if (!isMatch)
        throw new Error('Invalid phone number or password');
    const tokens = generateTokens(rawUser.id, rawUser.role);
    const user = await buildUserResponse(rawUser);
    return { user, ...tokens };
}
async function refreshAccessToken(token) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.id } });
        if (!user)
            throw new Error('User not found');
        if (user.status === 'SUSPENDED')
            throw new Error('Account suspended');
        const accessToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
        return { accessToken };
    }
    catch {
        throw new Error('Invalid or expired refresh token');
    }
}
function maskEmail(email) {
    const [namePart, domain] = email.split('@');
    const visible = namePart.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(namePart.length - 2, 1))}@${domain}`;
}
async function resetPassword(token, newPassword) {
    const user = await prisma_1.prisma.user.findFirst({
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
        throw new Error("This reset link has expired. Please request a new one");
    }
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
    await prisma_1.prisma.user.update({
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
async function resetPasswordEmail(phone) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { phone },
    });
    if (!user) {
        throw new Error("No account found with this phone number");
    }
    if (!user.email) {
        throw new Error("No email associated with this account");
    }
    const token = crypto_1.default.randomBytes(32).toString("hex");
    const hashedToken = await bcryptjs_1.default.hash(token, 10);
    console.log(`Token: ${token}, HashedToken: ${hashedToken}`);
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: {
            resetPasswordToken: token,
            resetPasswordExpiry: new Date(Date.now() + 15 * 60 * 1000),
        },
    });
    const resetLink = `https://firstchoice-ten.vercel.app/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
    console.log(`Email: ${user.email}, Name: ${user.name}, ResetLink: ${resetLink}`);
    await (0, email_service_1.sendPasswordResetEmail)(user.email, user.name, resetLink);
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
//# sourceMappingURL=auth.service.js.map