"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.refreshAccessToken = refreshAccessToken;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
function generateTokens(userId, role) {
    const accessToken = jsonwebtoken_1.default.sign({ id: userId, role }, JWT_SECRET, {
        expiresIn: '15m',
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
    const user = await prisma_1.prisma.user.create({
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
    const tokens = generateTokens(user.id, user.role);
    return { user, ...tokens };
}
async function loginUser(data) {
    console.log(data);
    const user = await prisma_1.prisma.user.findUnique({
        where: { phone: data.phone },
    });
    if (!user)
        throw new Error('Invalid phone number or password');
    if (user.status === 'SUSPENDED')
        throw new Error('Your account has been suspended');
    const isMatch = await bcryptjs_1.default.compare(data.password, user.passwordHash);
    if (!isMatch)
        throw new Error('Invalid phone number or password');
    const tokens = generateTokens(user.id, user.role);
    return {
        user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            status: user.status,
        },
        ...tokens,
    };
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
//# sourceMappingURL=auth.service.js.map