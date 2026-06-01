"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = getUserById;
exports.updateProfile = updateProfile;
exports.changePassword = changePassword;
exports.getUserOrders = getUserOrders;
exports.getUserDeliveries = getUserDeliveries;
exports.getUserErrands = getUserErrands;
const prisma_1 = require("../config/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function getUserById(id) {
    const user = await prisma_1.prisma.user.findUnique({
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
    if (!user)
        throw new Error('User not found');
    return user;
}
async function updateProfile(id, data) {
    if (data.email) {
        const existing = await prisma_1.prisma.user.findFirst({
            where: { email: data.email, NOT: { id } },
        });
        if (existing)
            throw new Error('Email already in use');
    }
    return prisma_1.prisma.user.update({
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
async function changePassword(id, data) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id } });
    if (!user)
        throw new Error('User not found');
    const isMatch = await bcryptjs_1.default.compare(data.currentPassword, user.passwordHash);
    if (!isMatch)
        throw new Error('Current password is incorrect');
    if (data.newPassword.length < 6)
        throw new Error('New password must be at least 6 characters');
    const passwordHash = await bcryptjs_1.default.hash(data.newPassword, 10);
    await prisma_1.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { message: 'Password changed successfully' };
}
async function getUserOrders(id) {
    return prisma_1.prisma.order.findMany({
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
async function getUserDeliveries(id) {
    return prisma_1.prisma.deliveryRequest.findMany({
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
async function getUserErrands(id) {
    return prisma_1.prisma.errand.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
    });
}
//# sourceMappingURL=user.service.js.map