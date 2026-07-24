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
exports.getDeliveryById = getDeliveryById;
exports.assignRiderToDelivery = assignRiderToDelivery;
exports.getAllDeliveries = getAllDeliveries;
exports.getAllLocations = getAllLocations;
exports.searchLocations = searchLocations;
exports.createLocation = createLocation;
exports.updateLocation = updateLocation;
exports.deleteLocation = deleteLocation;
exports.createDeliveryRequest = createDeliveryRequest;
exports.riderAcceptDelivery = riderAcceptDelivery;
exports.updateDeliveryStatus = updateDeliveryStatus;
exports.getPendingDeliveries = getPendingDeliveries;
exports.getRiderJobs = getRiderJobs;
const prisma_1 = require("../config/prisma");
const socket_manager_1 = require("../socket/socket.manager");
const NotificationService = __importStar(require("./notification.service"));
const socket_manager_2 = require("../socket/socket.manager");
function calculateDeliveryEstimate(pickupLat, pickupLng, destLat, destLng) {
    if (pickupLat && pickupLng && destLat && destLng) {
        const R = 6371;
        const dLat = ((destLat - pickupLat) * Math.PI) / 180;
        const dLng = ((destLng - pickupLng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos((pickupLat * Math.PI) / 180) *
                Math.cos((destLat * Math.PI) / 180) *
                Math.sin(dLng / 2) ** 2;
        const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (km <= 1)
            return 5;
        if (km <= 1.5)
            return 6;
        if (km <= 2)
            return 7;
        if (km <= 2.5)
            return 8;
        if (km <= 3)
            return 9;
        if (km <= 3.5)
            return 10;
        if (km <= 4)
            return 11;
        if (km <= 4.5)
            return 12;
        if (km <= 5)
            return 13;
        if (km <= 5.5)
            return 14;
        if (km <= 6)
            return 15;
        if (km <= 6.5)
            return 16;
        if (km <= 7)
            return 17;
        if (km <= 7.5)
            return 18;
        if (km <= 8)
            return 19;
        if (km <= 8.5)
            return 20;
        if (km <= 9)
            return 21;
        return 25;
    }
    return 0;
}
async function getDeliveryById(deliveryId, userId) {
    const delivery = await prisma_1.prisma.deliveryRequest.findUnique({
        where: { id: deliveryId },
        include: {
            customer: { select: { name: true, phone: true } },
            rider: {
                include: {
                    user: { select: { name: true, phone: true, profileImage: true } },
                },
            },
        },
    });
    if (!delivery)
        throw new Error('Delivery request not found');
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    const rider = await prisma_1.prisma.rider.findUnique({ where: { userId } });
    const isCustomer = delivery.customerId === userId;
    const isRider = rider?.id === delivery.assignedRiderId;
    const isAdmin = user.role === 'ADMIN';
    if (!isCustomer && !isRider && !isAdmin)
        throw new Error('Access denied');
    return delivery;
}
const validDeliveryTransitions = {
    PENDING: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['PICKED_UP', 'CANCELLED'],
    PICKED_UP: ['IN_TRANSIT'],
    IN_TRANSIT: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
};
async function assignRiderToDelivery(deliveryId, riderId) {
    const delivery = await prisma_1.prisma.deliveryRequest.findUnique({
        where: { id: deliveryId },
    });
    if (!delivery)
        throw new Error('Delivery request not found');
    if (delivery.status !== 'PENDING')
        throw new Error('Can only assign rider to a pending delivery');
    const rider = await prisma_1.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider)
        throw new Error('Rider not found');
    if (rider.availability !== 'ONLINE')
        throw new Error('Rider is not available');
    return prisma_1.prisma.$transaction(async (tx) => {
        const updated = await tx.deliveryRequest.update({
            where: { id: deliveryId },
            data: {
                assignedRiderId: riderId,
                status: 'ACCEPTED',
            },
            include: {
                customer: { select: { name: true, phone: true } },
                rider: {
                    include: { user: { select: { name: true, phone: true } } },
                },
            },
        });
        await tx.rider.update({
            where: { id: riderId },
            data: { availability: 'BUSY' },
        });
        (0, socket_manager_1.notifyUser)(delivery.customerId, 'delivery:rider_assigned', {
            deliveryId,
            riderId,
            timestamp: new Date(),
        });
        return updated;
    });
}
async function getAllDeliveries(filters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const where = {
        ...(filters.status && { status: filters.status }),
    };
    const [deliveries, total] = await Promise.all([
        prisma_1.prisma.deliveryRequest.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                customer: { select: { name: true, phone: true } },
                rider: {
                    include: { user: { select: { name: true, phone: true } } },
                },
            },
        }),
        prisma_1.prisma.deliveryRequest.count({ where }),
    ]);
    return {
        deliveries,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}
function emitDeliveryEvent(customerId, deliveryId, status) {
    const payload = { deliveryId, status, timestamp: new Date() };
    (0, socket_manager_1.notifyUser)(customerId, 'delivery:status_update', payload);
    (0, socket_manager_1.notifyAdmins)('admin:delivery_update', payload);
}
async function getAllLocations() {
    return prisma_1.prisma.location.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });
}
async function searchLocations(query) {
    return prisma_1.prisma.location.findMany({
        where: {
            isActive: true,
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { address: { contains: query, mode: 'insensitive' } },
            ],
        },
        orderBy: { name: 'asc' },
        take: 20,
    });
}
async function createLocation(data) {
    return prisma_1.prisma.location.create({ data });
}
async function updateLocation(id, data) {
    return prisma_1.prisma.location.update({ where: { id }, data });
}
async function deleteLocation(id) {
    return prisma_1.prisma.location.delete({ where: { id } });
}
// ─── CREATE ──────────────────────────────────────────────
async function createDeliveryRequest(customerId, data) {
    const estimatedFee = calculateDeliveryEstimate(data.pickupLatitude, data.pickupLongitude, data.destinationLatitude, data.destinationLongitude);
    const delivery = await prisma_1.prisma.deliveryRequest.create({
        data: {
            customerId,
            pickupAddress: data.pickupAddress.trim(),
            pickupLatitude: data.pickupLatitude,
            pickupLongitude: data.pickupLongitude,
            destinationAddress: data.destinationAddress.trim(),
            destinationLatitude: data.destinationLatitude,
            destinationLongitude: data.destinationLongitude,
            itemDescription: data.itemDescription.trim(),
            estimatedFee,
            paymentMethod: data.paymentMethod,
            recipientName: data.recipientName?.trim() || null,
            recipientPhone: data.recipientPhone?.trim() || null,
            imageUrl: data.imageUrl || null,
        },
        include: {
            customer: { select: { name: true, phone: true } },
        },
    });
    const payload = {
        type: 'NEW_DELIVERY',
        deliveryId: delivery.id,
        pickupAddress: delivery.pickupAddress,
        destinationAddress: delivery.destinationAddress,
        itemDescription: delivery.itemDescription,
        estimatedFee: delivery.estimatedFee,
        paymentMethod: delivery.paymentMethod,
        recipientName: delivery.recipientName,
        recipientPhone: delivery.recipientPhone,
        imageUrl: delivery.imageUrl,
        customer: {
            name: delivery.customer.name,
            phone: delivery.customer.phone,
        },
        createdAt: delivery.createdAt,
    };
    (0, socket_manager_2.notifyRiders)('delivery:new_request', payload);
    (0, socket_manager_1.notifyAdmins)('admin:new_delivery', payload);
    await NotificationService.notifyNewDelivery(delivery.id);
    return delivery;
}
// ─── RIDER SELF-ACCEPT ────────────────────────────────────
// Any available rider can accept a pending delivery
async function riderAcceptDelivery(deliveryId, riderUserId) {
    const rider = await prisma_1.prisma.rider.findUnique({ where: { userId: riderUserId } });
    if (!rider)
        throw new Error('Rider profile not found');
    if (rider.availability !== 'ONLINE')
        throw new Error('You must be online to accept deliveries');
    // Use a transaction + atomic update to prevent race conditions
    // Only one rider can claim it — first one wins
    const delivery = await prisma_1.prisma.$transaction(async (tx) => {
        // Re-fetch inside transaction to check current state
        const current = await tx.deliveryRequest.findUnique({
            where: { id: deliveryId },
        });
        if (!current)
            throw new Error('Delivery not found');
        if (current.status !== 'PENDING')
            throw new Error('This delivery has already been taken');
        if (current.assignedRiderId)
            throw new Error('This delivery has already been assigned');
        // Claim it
        const updated = await tx.deliveryRequest.update({
            where: { id: deliveryId },
            data: {
                assignedRiderId: rider.id,
                status: 'ACCEPTED',
            },
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                rider: {
                    include: { user: { select: { name: true, phone: true } } },
                },
            },
        });
        // Set rider as BUSY
        await tx.rider.update({
            where: { id: rider.id },
            data: { availability: 'BUSY' },
        });
        return updated;
    });
    // ── Notify customer that a rider accepted ──
    (0, socket_manager_1.notifyUser)(delivery.customer.id, 'delivery:rider_accepted', {
        deliveryId: delivery.id,
        riderName: delivery.rider?.user.name,
        riderPhone: delivery.rider?.user.phone,
        status: 'ACCEPTED',
        timestamp: new Date(),
    });
    // ── Tell ALL other riders this delivery is gone ──
    (0, socket_manager_2.notifyRiders)('delivery:taken', { deliveryId: delivery.id });
    // ── Notify admins ──
    (0, socket_manager_1.notifyAdmins)('admin:delivery_accepted', {
        deliveryId: delivery.id,
        riderId: rider.id,
        riderName: delivery.rider?.user.name,
    });
    return delivery;
}
// ─── STATUS TRANSITIONS ──────────────────────────────────
const validTransitions = {
    PENDING: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['PICKED_UP', 'CANCELLED'],
    PICKED_UP: ['IN_TRANSIT'],
    IN_TRANSIT: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
};
async function updateDeliveryStatus(deliveryId, userId, newStatus) {
    const delivery = await prisma_1.prisma.deliveryRequest.findUnique({
        where: { id: deliveryId },
        include: { customer: true },
    });
    if (!delivery)
        throw new Error('Delivery not found');
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    const rider = await prisma_1.prisma.rider.findUnique({ where: { userId } });
    // Permission checks
    if (['PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(newStatus)) {
        if (rider?.id !== delivery.assignedRiderId)
            throw new Error('Only the assigned rider can update this delivery');
    }
    if (newStatus === 'CANCELLED') {
        const isCustomer = delivery.customerId === userId;
        const isAdmin = user.role === 'ADMIN';
        if (!isCustomer && !isAdmin)
            throw new Error('Only the customer or admin can cancel');
        if (!['PENDING', 'ACCEPTED'].includes(delivery.status))
            throw new Error('This delivery can no longer be cancelled');
    }
    const allowed = validTransitions[delivery.status];
    if (!allowed.includes(newStatus))
        throw new Error(`Cannot transition from ${delivery.status} to ${newStatus}`);
    // Update + handle completion
    const updated = await prisma_1.prisma.$transaction(async (tx) => {
        const result = await tx.deliveryRequest.update({
            where: { id: deliveryId },
            data: { status: newStatus },
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                rider: {
                    include: { user: { select: { name: true, phone: true } } },
                },
            },
        });
        // On delivery complete — update rider stats and free them up
        if (newStatus === 'DELIVERED' && delivery.assignedRiderId) {
            await tx.rider.update({
                where: { id: delivery.assignedRiderId },
                data: {
                    totalDeliveries: { increment: 1 },
                    earnings: { increment: delivery.estimatedFee },
                    availability: 'ONLINE', // free up rider
                },
            });
        }
        // On cancel — free up rider if they were assigned
        if (newStatus === 'CANCELLED' && delivery.assignedRiderId) {
            await tx.rider.update({
                where: { id: delivery.assignedRiderId },
                data: { availability: 'ONLINE' },
            });
        }
        await NotificationService.notifyDeliveryStatusChange(deliveryId, newStatus);
        return result;
    });
    // ── Real-time events ──
    const eventPayload = {
        deliveryId,
        status: newStatus,
        timestamp: new Date(),
        riderName: updated.rider?.user.name,
    };
    // Notify customer
    (0, socket_manager_1.notifyUser)(delivery.customerId, 'delivery:status_update', eventPayload);
    // Notify admins
    (0, socket_manager_1.notifyAdmins)('admin:delivery_update', eventPayload);
    emitDeliveryEvent(delivery.customerId, deliveryId, newStatus);
    return updated;
}
// ─── FETCH PENDING (for riders to browse) ────────────────
async function getPendingDeliveries() {
    const deliveries = await prisma_1.prisma.deliveryRequest.findMany({
        where: {
            status: 'PENDING',
            assignedRiderId: null,
        },
        include: {
            customer: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    return deliveries;
}
// ─── RIDER'S OWN JOBS ────────────────────────────────────
async function getRiderJobs(riderUserId) {
    const rider = await prisma_1.prisma.rider.findUnique({ where: { userId: riderUserId } });
    if (!rider)
        throw new Error('Rider profile not found');
    const [active, history] = await Promise.all([
        prisma_1.prisma.deliveryRequest.findMany({
            where: {
                assignedRiderId: rider.id,
                status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
            },
            include: { customer: { select: { name: true, phone: true } } },
            orderBy: { createdAt: 'desc' },
        }),
        prisma_1.prisma.deliveryRequest.findMany({
            where: {
                assignedRiderId: rider.id,
                status: { in: ['DELIVERED', 'CANCELLED'] },
            },
            include: { customer: { select: { name: true, phone: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20,
        }),
    ]);
    return { active, history };
}
//# sourceMappingURL=delivery.service.js.map