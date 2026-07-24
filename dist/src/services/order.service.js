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
exports.placeOrder = placeOrder;
exports.getOrderById = getOrderById;
exports.updateOrderStatus = updateOrderStatus;
exports.cancelOrder = cancelOrder;
exports.getAllOrders = getAllOrders;
exports.getOrdersReadyForPickup = getOrdersReadyForPickup;
exports.riderAcceptOrder = riderAcceptOrder;
exports.attachOrderImage = attachOrderImage;
const prisma_1 = require("../config/prisma");
const socket_manager_1 = require("../socket/socket.manager");
const NotificationService = __importStar(require("./notification.service"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
// In placeOrder, update the items validation and price calculation:
// Same tiered-by-distance table used on the deliveries page / mobile app.
// Used only for SIMPLE (note-based) orders, where there's no subtotal yet
// to base a fee on — we price off distance instead, same as a delivery.
function calculateDeliveryFeeByDistance({ pickupLat, pickupLng, destLat, destLng, }) {
    if (pickupLat == null || pickupLng == null || destLat == null || destLng == null)
        return 10; // fallback flat fee if coords missing
    const r = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(destLat - pickupLat);
    const dLng = toRad(destLng - pickupLng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(pickupLat)) * Math.cos(toRad(destLat)) * Math.sin(dLng / 2) ** 2;
    const km = r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
async function placeOrder(customerId, data) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { id: data.vendorId } });
    if (!vendor)
        throw new Error('Vendor not found');
    if (vendor.status !== 'ACTIVE')
        throw new Error('This vendor is currently unavailable');
    const hasStructuredItems = Array.isArray(data.items) && data.items.length > 0;
    // ═══════════════════════════════════════════════════════
    // LEGACY FLOW — untouched. Kicks in only when items[] is sent.
    // ═══════════════════════════════════════════════════════
    if (hasStructuredItems) {
        const productIds = data.items.map(i => i.productId);
        const products = await prisma_1.prisma.product.findMany({
            where: { id: { in: productIds }, vendorId: data.vendorId },
        });
        if (products.length !== data.items.length)
            throw new Error('One or more products not found');
        for (const item of data.items) {
            const product = products.find(p => p.id === item.productId);
            if (!product.available)
                throw new Error(`Product unavailable: ${product.name}`);
            if (product.stock < item.quantity)
                throw new Error(`Insufficient stock: ${product.name}`);
        }
        const orderItems = data.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            const variantExtra = (item.selectedVariants || []).reduce((s, v) => s + v.priceAdjustment, 0);
            const addonExtra = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
            const unitPrice = product.price + variantExtra + addonExtra;
            return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice,
                selectedVariants: item.selectedVariants ? JSON.stringify(item.selectedVariants) : undefined,
                selectedAddons: item.selectedAddons ? JSON.stringify(item.selectedAddons) : undefined,
                itemNotes: item.itemNotes,
            };
        });
        const calculationData = {
            pickupLat: Number(vendor.latitude),
            pickupLng: Number(vendor.longitude),
            destLat: data.deliveryLatitude,
            destLng: data.deliveryLongitude
        };
        const deliveryFee = calculateDeliveryFeeByDistance(calculationData);
        const totalAmount = data.subtotal + deliveryFee;
        const order = await prisma_1.prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    customerId,
                    vendorId: data.vendorId,
                    deliveryAddress: data.deliveryAddress,
                    deliveryLatitude: data.deliveryLatitude ?? null,
                    deliveryLongitude: data.deliveryLongitude ?? null,
                    paymentMethod: data.paymentMethod,
                    recipientName: data.recipientName || null,
                    recipientPhone: data.recipientPhone || null,
                    notes: data.notes || null,
                    subtotal: data.subtotal,
                    pickupLatitude: Number(vendor.latitude) || null,
                    pickupLongitude: Number(vendor.longitude) || null,
                    vendorAddress: vendor.businessName,
                    deliveryFee,
                    totalAmount,
                    orderType: 'MARKETPLACE',
                    orderStatus: 'PENDING',
                    items: { create: orderItems },
                },
                include: {
                    items: { include: { product: { select: { name: true, images: true } } } },
                    vendor: { select: { businessName: true, logo: true, phone: true } },
                },
            });
            for (const item of data.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } },
                });
            }
            return newOrder;
        }, { timeout: 15000, maxWait: 30000 });
        await NotificationService.notifyNewOrder(order.id);
        return order;
    }
    // ═══════════════════════════════════════════════════════
    // NEW SIMPLE FLOW — just vendorId + free-text note.
    // No items, no stock decrement, no known subtotal — vendor
    // confirms the real total after reading the note.
    // ═══════════════════════════════════════════════════════
    if (!data.note || !data.note.trim()) {
        throw new Error('Either items[] or a note is required to place an order');
    }
    const deliveryFee = calculateDeliveryFeeByDistance({
        pickupLat: Number(vendor.latitude),
        pickupLng: Number(vendor.longitude),
        destLat: data.deliveryLatitude,
        destLng: data.deliveryLongitude,
    });
    const order = await prisma_1.prisma.order.create({
        data: {
            customerId,
            vendorId: data.vendorId,
            deliveryAddress: data.deliveryAddress,
            deliveryLatitude: data.deliveryLatitude ?? null,
            deliveryLongitude: data.deliveryLongitude ?? null,
            paymentMethod: data.paymentMethod,
            recipientName: data.recipientName || null,
            recipientPhone: data.recipientPhone || null,
            notes: data.note.trim(),
            pickupLatitude: Number(vendor.latitude) || null,
            pickupLongitude: Number(vendor.longitude) || null,
            vendorAddress: vendor.businessName,
            subtotal: 0, // unknown until vendor confirms
            deliveryFee,
            totalAmount: deliveryFee, // updated once vendor sets item pricing
            orderType: 'MARKETPLACE',
            orderStatus: 'PENDING',
        },
        include: {
            vendor: { select: { businessName: true, logo: true, phone: true } },
        },
    });
    await NotificationService.notifyNewOrder(order.id);
    await NotificationService.notifyNewDelivery(order.id);
    return order;
}
async function getOrderById(orderId, userId) {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: orderId },
        include: {
            customer: { select: { name: true, phone: true } },
            vendor: { select: { businessName: true, logo: true, address: true, phone: true } },
            rider: {
                select: {
                    user: { select: { name: true, phone: true } },
                    currentLatitude: true,
                    currentLongitude: true,
                },
            },
            items: {
                include: {
                    product: { select: { name: true, images: true, price: true } },
                },
            },
            transaction: true,
        },
    });
    if (!order)
        throw new Error('Order not found');
    // Only the customer, vendor, assigned rider, or admin can view
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    const rider = await prisma_1.prisma.rider.findUnique({ where: { userId } });
    const isCustomer = order.customerId === userId;
    const isVendor = vendor?.id === order.vendorId;
    const isRider = rider?.id === order.riderId;
    const isAdmin = user.role === 'ADMIN';
    if (!isCustomer && !isVendor && !isRider && !isAdmin)
        throw new Error('Access denied');
    return order;
}
// Vendor: accept, prepare, mark ready
// Admin: assign rider
// Rider: pick up, deliver
// Customer/Admin: cancel
const validTransitions = {
    PENDING: ['RIDER_ASSIGNED', 'CANCELLED'],
    RIDER_ASSIGNED: ['PICKED_UP', 'CANCELLED'],
    PICKED_UP: ['IN_TRANSIT'],
    IN_TRANSIT: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
    ACCEPTED: [],
};
async function updateOrderStatus(orderId, userId, newStatus) {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: orderId },
        include: { vendor: true },
    });
    if (!order)
        throw new Error('Order not found');
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    const rider = await prisma_1.prisma.rider.findUnique({ where: { userId } });
    // Role-based permission checks
    // if (newStatus === 'ACCEPTED') {
    //   if (vendor?.id !== order.vendorId)
    //     throw new Error('Only the vendor can update to this status');
    // }
    if (newStatus === 'PICKED_UP' || newStatus === 'DELIVERED') {
        if (rider?.id !== order.riderId)
            throw new Error('Only the assigned rider can update to this status');
    }
    // if (newStatus === 'RIDER_ASSIGNED' && user.role !== 'ADMIN')
    //   throw new Error('Only admin can assign riders');
    if (newStatus === 'RIDER_ASSIGNED') {
        if (!rider)
            throw new Error('Only riders can accept orders');
        if (order.riderId)
            throw new Error('Order has already been assigned');
        await prisma_1.prisma.$transaction(async (tx) => {
            const current = await tx.order.findUnique({
                where: { id: orderId },
            });
            if (!current || current.riderId) {
                throw new Error('Order already assigned');
            }
            await tx.order.update({
                where: { id: orderId },
                data: {
                    riderId: rider.id,
                    orderStatus: 'RIDER_ASSIGNED',
                },
            });
        });
        await emitOrderEvent(orderId, 'RIDER_ASSIGNED');
        await NotificationService.notifyOrderStatusChange(orderId, 'RIDER_ASSIGNED');
        return;
    }
    if (newStatus === 'CANCELLED') {
        const cancellable = ['PENDING', 'ACCEPTED'];
        if (!cancellable.includes(order.orderStatus))
            throw new Error('Order can no longer be cancelled');
    }
    if (newStatus === 'PENDING') {
        console.log('PENDING reached');
        console.log({
            type: 'NEW_DELIVERY',
            orderId: order.id,
            pickupAddress: vendor?.address,
            destinationAddress: order.deliveryAddress,
            itemDescription: order.notes,
            estimatedFee: order.deliveryFee,
            paymentMethod: order.paymentMethod,
            customer: {
                name: order.recipientName,
                phone: order.recipientPhone,
            },
            createdAt: order.createdAt
        });
        (0, socket_manager_1.notifyRiders)('delivery:new_request', {
            type: 'NEW_DELIVERY',
            orderId: order.id,
            pickupAddress: vendor?.address,
            destinationAddress: order.deliveryAddress,
            itemDescription: order.notes,
            estimatedFee: order.deliveryFee,
            paymentMethod: order.paymentMethod,
            customer: {
                name: order.recipientName,
                phone: order.recipientPhone,
            },
            createdAt: order.createdAt
        });
    }
    // Validate transition
    const allowed = validTransitions[order.orderStatus];
    if (!allowed.includes(newStatus))
        throw new Error(`Cannot transition from ${order.orderStatus} to ${newStatus}`);
    await emitOrderEvent(orderId, newStatus);
    await NotificationService.notifyOrderStatusChange(orderId, newStatus);
    return prisma_1.prisma.order.update({
        where: { id: orderId },
        data: { orderStatus: newStatus },
        include: {
            items: {
                include: { product: { select: { name: true } } },
            },
            vendor: { select: { businessName: true } },
            rider: {
                select: { user: { select: { name: true, phone: true } } },
            },
        },
    });
}
async function cancelOrder(orderId, userId) {
    const order = await prisma_1.prisma.order.findUnique({ where: { id: orderId } });
    if (!order)
        throw new Error('Order not found');
    if (order.customerId !== userId)
        throw new Error('You can only cancel your own orders');
    const cancellable = ['PENDING', 'ACCEPTED'];
    if (!cancellable.includes(order.orderStatus))
        throw new Error('This order can no longer be cancelled');
    return prisma_1.prisma.$transaction(async (tx) => {
        // Restore stock
        const items = await tx.orderItem.findMany({ where: { orderId } });
        for (const item of items) {
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
            });
        }
        return tx.order.update({
            where: { id: orderId },
            data: { orderStatus: 'CANCELLED' },
        });
    });
}
async function getAllOrders(filters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const where = {
        ...(filters.status && { orderStatus: filters.status }),
        ...(filters.vendorId && { vendorId: filters.vendorId }),
        ...(filters.customerId && { customerId: filters.customerId }),
    };
    const [orders, total] = await Promise.all([
        prisma_1.prisma.order.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                customer: { select: { name: true, phone: true } },
                vendor: { select: { businessName: true } },
                rider: {
                    select: { user: { select: { name: true, phone: true } } },
                },
                items: { include: { product: { select: { name: true } } } },
            },
        }),
        prisma_1.prisma.order.count({ where }),
    ]);
    console.log(`Orders: ${orders}`);
    return {
        orders,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}
async function emitOrderEvent(orderId, status) {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: orderId },
        select: {
            customerId: true,
            vendorId: true,
            riderId: true,
            orderStatus: true,
            vendor: { select: { businessName: true } },
            rider: {
                select: { user: { select: { name: true, phone: true } } },
            },
        },
    });
    if (!order)
        return;
    const payload = {
        orderId,
        status,
        timestamp: new Date(),
    };
    // Notify customer
    (0, socket_manager_1.notifyUser)(order.customerId, 'order:status_update', payload);
    // Notify order room (customer tracking + rider)
    (0, socket_manager_1.notifyOrderRoom)(orderId, 'order:status_update', payload);
    // Notify vendor room
    (0, socket_manager_1.notifyVendor)(order.vendorId, 'order:status_update', payload);
    // Notify admins
    (0, socket_manager_1.notifyAdmins)('admin:order_update', payload);
    // New order — notify all riders
    if (status === 'PENDING') {
        (0, socket_manager_1.notifyAdmins)('admin:order_ready_for_dispatch', {
            orderId,
            vendorId: order.vendorId,
            timestamp: new Date(),
        });
    }
}
// In your orders route/controller, add:
async function getOrdersReadyForPickup() {
    console.log('here in the get orders ready for pickup');
    return prisma_1.prisma.order.findMany({
        where: {
            orderStatus: 'ACCEPTED',
            riderId: null,
        },
        include: {
            vendor: true,
            customer: true,
            rider: true,
            items: {
                include: {
                    product: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
}
// POST /orders/:id/rider-accept
async function riderAcceptOrder(orderId, riderUserId) {
    const rider = await prisma_1.prisma.rider.findUnique({ where: { userId: riderUserId } });
    if (!rider)
        throw new Error('Rider profile not found');
    if (rider.availability !== 'ONLINE')
        throw new Error('You must be online to accept');
    const user = await prisma_1.prisma.user.findUnique({ where: { id: rider.userId } });
    return prisma_1.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new Error('Order not found');
        if (order.orderStatus !== 'PENDING')
            throw new Error('Order already taken');
        if (order.riderId)
            throw new Error('Order already assigned');
        const updated = await tx.order.update({
            where: { id: orderId },
            data: {
                riderId: rider.id,
                orderStatus: 'RIDER_ASSIGNED',
            },
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                vendor: { select: { businessName: true, address: true } },
                rider: { include: { user: { select: { name: true, phone: true } } } },
            },
        });
        console.log(user);
        await tx.rider.update({
            where: { id: rider.id },
            data: { availability: 'BUSY' },
        });
        (0, socket_manager_1.notifyUser)(order.customerId, 'delivery:rider_accepted', {
            deliveryId: order.id,
            riderName: user?.name,
            riderPhone: user?.phone,
            status: 'ACCEPTED',
            timestamp: new Date(),
        });
        return updated;
    });
}
async function attachOrderImage(orderId, customerId, imageBuffer) {
    const order = await prisma_1.prisma.order.findUnique({ where: { id: orderId } });
    if (!order)
        throw new Error('Order not found');
    if (order.customerId !== customerId)
        throw new Error('Not authorized to modify this order');
    const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary_1.default.uploader.upload_stream({ folder: 'firstchoice/orders', transformation: [{ width: 1000, crop: 'limit' }] }, (error, result) => (error ? reject(error) : resolve(result)));
        stream.end(imageBuffer);
    });
    return prisma_1.prisma.order.update({
        where: { id: orderId },
        data: { imageUrl: uploadResult.secure_url },
    });
}
//# sourceMappingURL=order.service.js.map