"use strict";
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
const prisma_1 = require("../config/prisma");
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
    return prisma_1.prisma.vendor.update({
        where: { id: vendorId },
        data: { status },
    });
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
    if (order.orderStatus !== 'READY_FOR_PICKUP')
        throw new Error('Order must be READY_FOR_PICKUP before assigning a rider');
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
//# sourceMappingURL=admin.service.js.map