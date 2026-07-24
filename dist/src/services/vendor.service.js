"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerVendor = registerVendor;
exports.getVendorProfile = getVendorProfile;
exports.getMyVendorProfile = getMyVendorProfile;
exports.updateVendorProfile = updateVendorProfile;
exports.getAllVendors = getAllVendors;
exports.getVendorOrders = getVendorOrders;
exports.getVendorStats = getVendorStats;
const prisma_1 = require("../config/prisma");
const NotificationService = __importStar(require("./notification.service"));
async function registerVendor(userId, data) {
    const existingVendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (existingVendor)
        throw new Error('You already have a vendor profile');
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    const vendor = await prisma_1.prisma.$transaction(async (tx) => {
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
async function getVendorProfile(vendorId) {
    const vendor = await prisma_1.prisma.vendor.findUnique({
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
    if (!vendor)
        throw new Error('Vendor not found');
    return vendor;
}
async function getMyVendorProfile(userId) {
    const vendor = await prisma_1.prisma.vendor.findUnique({
        where: { userId },
        include: {
            products: { orderBy: { createdAt: 'desc' } },
        },
    });
    if (!vendor)
        throw new Error('No vendor profile found for this account');
    return vendor;
}
async function updateVendorProfile(userId, data) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor)
        throw new Error('Vendor profile not found');
    return prisma_1.prisma.vendor.update({
        where: { userId },
        data,
    });
}
async function getAllVendors(filters) {
    return prisma_1.prisma.vendor.findMany({
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
async function getVendorOrders(userId) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor)
        throw new Error('Vendor profile not found');
    return prisma_1.prisma.order.findMany({
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
async function getVendorStats(userId) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor)
        throw new Error('Vendor profile not found');
    const [totalOrders, completedOrders, pendingOrders, totalProducts] = await Promise.all([
        prisma_1.prisma.order.count({ where: { vendorId: vendor.id } }),
        prisma_1.prisma.order.count({
            where: { vendorId: vendor.id, orderStatus: 'DELIVERED' },
        }),
        prisma_1.prisma.order.count({
            where: {
                vendorId: vendor.id,
                orderStatus: { in: ['PENDING', 'ACCEPTED'] },
            },
        }),
        prisma_1.prisma.product.count({ where: { vendorId: vendor.id } }),
    ]);
    const revenue = await prisma_1.prisma.order.aggregate({
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
//# sourceMappingURL=vendor.service.js.map