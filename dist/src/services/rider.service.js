"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRider = registerRider;
exports.getRiderProfile = getRiderProfile;
exports.getMyRiderProfile = getMyRiderProfile;
exports.toggleAvailability = toggleAvailability;
exports.updateRiderLocation = updateRiderLocation;
exports.getAvailableRiders = getAvailableRiders;
exports.getRiderEarnings = getRiderEarnings;
exports.getRiderActiveJobs = getRiderActiveJobs;
exports.getRiderJobHistory = getRiderJobHistory;
const prisma_1 = require("../config/prisma");
async function registerRider(userId, data) {
    const existingRider = await prisma_1.prisma.rider.findUnique({ where: { userId } });
    if (existingRider)
        throw new Error('You already have a rider profile');
    const rider = await prisma_1.prisma.$transaction(async (tx) => {
        const newRider = await tx.rider.create({
            data: {
                userId,
                bikeType: data.bikeType.trim(),
                licenseNumber: data.licenseNumber?.trim() || null,
            },
        });
        await tx.user.update({
            where: { id: userId },
            data: { role: 'RIDER' },
        });
        return newRider;
    });
    return rider;
}
async function getRiderProfile(riderId) {
    const rider = await prisma_1.prisma.rider.findUnique({
        where: { id: riderId },
        include: {
            user: {
                select: {
                    name: true,
                    phone: true,
                    email: true,
                    profileImage: true,
                    status: true,
                },
            },
        },
    });
    if (!rider)
        throw new Error('Rider not found');
    return rider;
}
async function getMyRiderProfile(userId) {
    const rider = await prisma_1.prisma.rider.findUnique({
        where: { userId },
        include: {
            user: {
                select: {
                    name: true,
                    phone: true,
                    email: true,
                    profileImage: true,
                },
            },
        },
    });
    if (!rider)
        throw new Error('No rider profile found for this account');
    return rider;
}
async function toggleAvailability(userId, availability) {
    const rider = await prisma_1.prisma.rider.findUnique({ where: { userId } });
    if (!rider)
        throw new Error('Rider profile not found');
    return prisma_1.prisma.rider.update({
        where: { userId },
        data: { availability },
    });
}
async function updateRiderLocation(userId, data) {
    const rider = await prisma_1.prisma.rider.findUnique({ where: { userId } });
    if (!rider)
        throw new Error('Rider profile not found');
    return prisma_1.prisma.rider.update({
        where: { userId },
        data: {
            currentLatitude: data.latitude,
            currentLongitude: data.longitude,
        },
    });
}
async function getAvailableRiders() {
    return prisma_1.prisma.rider.findMany({
        where: { availability: 'ONLINE' },
        include: {
            user: {
                select: { name: true, phone: true, profileImage: true },
            },
        },
        orderBy: { rating: 'desc' },
    });
}
async function getRiderEarnings(userId) {
    const rider = await prisma_1.prisma.rider.findUnique({ where: { userId } });
    if (!rider)
        throw new Error('Rider profile not found');
    const [completedOrders, completedDeliveries] = await Promise.all([
        prisma_1.prisma.order.count({
            where: { riderId: rider.id, orderStatus: 'DELIVERED' },
        }),
        prisma_1.prisma.deliveryRequest.count({
            where: { assignedRiderId: rider.id, status: 'DELIVERED' },
        }),
    ]);
    return {
        totalEarnings: rider.earnings,
        totalDeliveries: rider.totalDeliveries,
        rating: rider.rating,
        completedOrders,
        completedDeliveries,
    };
}
async function getRiderActiveJobs(userId) {
    const rider = await prisma_1.prisma.rider.findUnique({ where: { userId } });
    if (!rider)
        throw new Error('Rider profile not found');
    const [activeOrders, activeDeliveries] = await Promise.all([
        prisma_1.prisma.order.findMany({
            where: {
                riderId: rider.id,
                orderStatus: { in: ['RIDER_ASSIGNED', 'PICKED_UP'] },
            },
            include: {
                customer: { select: { name: true, phone: true } },
                vendor: { select: { businessName: true, address: true } },
                items: { include: { product: { select: { name: true } } } },
            },
        }),
        prisma_1.prisma.deliveryRequest.findMany({
            where: {
                assignedRiderId: rider.id,
                status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
            },
            include: {
                customer: { select: { name: true, phone: true } },
            },
        }),
    ]);
    return { activeOrders, activeDeliveries };
}
async function getRiderJobHistory(userId) {
    const rider = await prisma_1.prisma.rider.findUnique({ where: { userId } });
    if (!rider)
        throw new Error('Rider profile not found');
    const [completedOrders, completedDeliveries] = await Promise.all([
        prisma_1.prisma.order.findMany({
            where: { riderId: rider.id, orderStatus: 'DELIVERED' },
            include: {
                customer: { select: { name: true, phone: true } },
                vendor: { select: { businessName: true, address: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
        prisma_1.prisma.deliveryRequest.findMany({
            where: { assignedRiderId: rider.id, status: 'DELIVERED' },
            include: {
                customer: { select: { name: true, phone: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
    ]);
    return { completedOrders, completedDeliveries };
}
//# sourceMappingURL=rider.service.js.map