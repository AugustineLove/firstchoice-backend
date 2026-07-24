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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverviewStats = getOverviewStats;
exports.getAllUsers = getAllUsers;
exports.updateUserStatus = updateUserStatus;
exports.getAllVendorsAdmin = getAllVendorsAdmin;
exports.updateVendorStatus = updateVendorStatus;
exports.getAllRidersAdmin = getAllRidersAdmin;
exports.assignRiderToOrder = assignRiderToOrder;
exports.getOrderAnalytics = getOrderAnalytics;
exports.getRiderAnalytics = getRiderAnalytics;
exports.createVendorWithOwner = createVendorWithOwner;
exports.updateVendorProfile = updateVendorProfile;
exports.createProductForVendor = createProductForVendor;
exports.deleteProductAdmin = deleteProductAdmin;
const NotificationService = __importStar(require("./notification.service"));
const prisma_1 = require("../config/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
// ─── OVERVIEW STATS ─────────────────────────────────────
async function getOverviewStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [totalUsers, totalRiders, totalVendors, totalOrders, todayOrders, totalDeliveries, todayDeliveries, totalErrands, activeRiders, pendingOrders, revenue, todayRevenue,] = await Promise.all([
        prisma_1.prisma.user.count(),
        prisma_1.prisma.rider.count(),
        prisma_1.prisma.vendor.count(),
        prisma_1.prisma.order.count(),
        prisma_1.prisma.order.count({ where: { createdAt: { gte: today } } }),
        prisma_1.prisma.deliveryRequest.count(),
        prisma_1.prisma.deliveryRequest.count({ where: { createdAt: { gte: today } } }),
        prisma_1.prisma.errand.count(),
        prisma_1.prisma.rider.count({ where: { availability: 'ONLINE' } }),
        prisma_1.prisma.order.count({ where: { orderStatus: 'PENDING' } }),
        prisma_1.prisma.transaction.aggregate({
            where: { paymentStatus: 'PAID' },
            _sum: { amount: true },
        }),
        prisma_1.prisma.transaction.aggregate({
            where: { paymentStatus: 'PAID', recordedAt: { gte: today } },
            _sum: { amount: true },
        }),
    ]);
    return {
        users: { total: totalUsers },
        riders: { total: totalRiders, active: activeRiders },
        vendors: { total: totalVendors },
        orders: {
            total: totalOrders,
            today: todayOrders,
            pending: pendingOrders,
        },
        deliveries: { total: totalDeliveries, today: todayDeliveries },
        errands: { total: totalErrands },
        revenue: {
            total: revenue._sum.amount || 0,
            today: todayRevenue._sum.amount || 0,
        },
    };
}
// ─── USER MANAGEMENT ────────────────────────────────────
async function getAllUsers(filters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const where = {
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && {
            OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { phone: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
            ],
        }),
    };
    const [users, total] = await Promise.all([
        prisma_1.prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                role: true,
                status: true,
                profileImage: true,
                createdAt: true,
                rider: { select: { availability: true, totalDeliveries: true, rating: true } },
                vendor: { select: { businessName: true, status: true } },
            },
        }),
        prisma_1.prisma.user.count({ where }),
    ]);
    return {
        users,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}
async function updateUserStatus(userId, status) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    return prisma_1.prisma.user.update({
        where: { id: userId },
        data: { status },
        select: {
            id: true, name: true, phone: true, role: true, status: true,
        },
    });
}
// ─── VENDOR MANAGEMENT ──────────────────────────────────
async function getAllVendorsAdmin(filters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const where = {
        ...(filters.status && { status: filters.status }),
    };
    const [vendors, total] = await Promise.all([
        prisma_1.prisma.vendor.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, phone: true, email: true, status: true } },
                _count: { select: { products: true, orders: true } },
            },
        }),
        prisma_1.prisma.vendor.count({ where }),
    ]);
    return {
        vendors,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}
async function updateVendorStatus(vendorId, status) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor)
        throw new Error('Vendor not found');
    console.log(vendorId);
    const updatedVendor = prisma_1.prisma.vendor.update({
        where: { id: vendorId },
        data: { status },
    });
    if (status === 'ACTIVE') {
        await NotificationService.notifyVendorApproved(vendor.userId, vendor.businessName);
    }
    return updatedVendor;
}
// ─── RIDER MANAGEMENT ───────────────────────────────────
async function getAllRidersAdmin(filters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const where = {
        ...(filters.availability && { availability: filters.availability }),
    };
    const [riders, total] = await Promise.all([
        prisma_1.prisma.rider.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        name: true, phone: true, email: true, status: true,
                    },
                },
            },
        }),
        prisma_1.prisma.rider.count({ where }),
    ]);
    return {
        riders,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}
// ─── ORDER ASSIGNMENT ───────────────────────────────────
async function assignRiderToOrder(orderId, riderId) {
    const order = await prisma_1.prisma.order.findUnique({ where: { id: orderId } });
    if (!order)
        throw new Error('Order not found');
    if (order.orderStatus !== 'PENDING')
        throw new Error('Order must be  before assigning a rider');
    const rider = await prisma_1.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider)
        throw new Error('Rider not found');
    if (rider.availability !== 'ONLINE')
        throw new Error('Rider is not available');
    return prisma_1.prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
            where: { id: orderId },
            data: {
                riderId,
                orderStatus: 'RIDER_ASSIGNED',
            },
            include: {
                customer: { select: { name: true, phone: true } },
                vendor: { select: { businessName: true, address: true } },
                rider: {
                    include: { user: { select: { name: true, phone: true } } },
                },
                items: { include: { product: { select: { name: true } } } },
            },
        });
        await tx.rider.update({
            where: { id: riderId },
            data: { availability: 'BUSY' },
        });
        return updated;
    });
}
// ─── PLATFORM ANALYTICS ─────────────────────────────────
async function getOrderAnalytics() {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const [byStatus, last7DaysOrders, topVendors] = await Promise.all([
        prisma_1.prisma.order.groupBy({
            by: ['orderStatus'],
            _count: { id: true },
        }),
        prisma_1.prisma.order.findMany({
            where: { createdAt: { gte: last7Days } },
            select: { createdAt: true, totalAmount: true, orderStatus: true },
            orderBy: { createdAt: 'asc' },
        }),
        prisma_1.prisma.order.groupBy({
            by: ['vendorId'],
            _count: { id: true },
            _sum: { totalAmount: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5,
        }),
    ]);
    // Enrich top vendors with names
    const vendorIds = topVendors.map((v) => v.vendorId);
    const vendors = await prisma_1.prisma.vendor.findMany({
        where: { id: { in: vendorIds } },
        select: { id: true, businessName: true },
    });
    const enrichedTopVendors = topVendors.map((v) => ({
        ...v,
        vendor: vendors.find((vn) => vn.id === v.vendorId),
    }));
    return {
        byStatus,
        last7Days: last7DaysOrders,
        topVendors: enrichedTopVendors,
    };
}
async function getRiderAnalytics() {
    const topRiders = await prisma_1.prisma.rider.findMany({
        orderBy: { totalDeliveries: 'desc' },
        take: 10,
        include: {
            user: { select: { name: true, phone: true } },
        },
        where: { totalDeliveries: { gt: 0 } },
    });
    const availabilitySummary = await prisma_1.prisma.rider.groupBy({
        by: ['availability'],
        _count: { id: true },
    });
    return { topRiders, availabilitySummary };
}
async function createVendorWithOwner(data) {
    const existingUser = await prisma_1.prisma.user.findUnique({ where: { phone: data.ownerPhone } });
    if (existingUser)
        throw new Error('A user with this phone number already exists');
    const tempPassword = data.password?.trim() || crypto_1.default.randomBytes(4).toString('hex');
    const passwordHash = await bcryptjs_1.default.hash(tempPassword, 10);
    const vendor = await prisma_1.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name: data.ownerName.trim(),
                phone: data.ownerPhone.trim(),
                email: data.ownerEmail?.trim() || null,
                passwordHash,
                role: 'VENDOR',
                status: 'ACTIVE',
            },
        });
        return tx.vendor.create({
            data: {
                userId: user.id,
                businessName: data.businessName.trim(),
                businessType: data.businessType,
                address: data.address.trim(),
                phone: data.phone.trim(),
                openingHours: data.openingHours || null,
                logo: data.logo || null,
                status: 'ACTIVE', // admin-created vendors are pre-approved
            },
            include: { user: { select: { id: true, name: true, phone: true, email: true } } },
        });
    });
    return { vendor, tempPassword };
}
async function updateVendorProfile(vendorId, data) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor)
        throw new Error('Vendor not found');
    return prisma_1.prisma.vendor.update({
        where: { id: vendorId },
        data,
        include: { user: { select: { name: true, phone: true, email: true } } },
    });
}
// ─── PRODUCT MANAGEMENT ON BEHALF OF A VENDOR ──────────
async function createProductForVendor(vendorId, data) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor)
        throw new Error('Vendor not found');
    return prisma_1.prisma.product.create({
        data: {
            vendorId,
            name: data.name.trim(),
            category: data.category,
            price: data.price,
            stock: data.stock ?? 0,
            images: data.images || [],
            available: data.available ?? true,
        },
    });
}
async function deleteProductAdmin(productId) {
    const product = await prisma_1.prisma.product.findUnique({ where: { id: productId } });
    if (!product)
        throw new Error('Product not found');
    await prisma_1.prisma.product.delete({ where: { id: productId } });
    return { message: 'Product deleted successfully' };
}
//# sourceMappingURL=admin.service.js.map