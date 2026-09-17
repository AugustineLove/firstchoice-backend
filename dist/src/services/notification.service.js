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
exports.notifyNewOrder = notifyNewOrder;
exports.notifyOrderStatusChange = notifyOrderStatusChange;
exports.notifyNewDelivery = notifyNewDelivery;
exports.notifyDeliveryStatusChange = notifyDeliveryStatusChange;
exports.notifyVendorApproved = notifyVendorApproved;
exports.notifyVendorPendingApproval = notifyVendorPendingApproval;
exports.notifyNewErrand = notifyNewErrand;
exports.notifyErrandStatusChange = notifyErrandStatusChange;
exports.updateFcmToken = updateFcmToken;
exports.notifyRidersNewOrder = notifyRidersNewOrder;
exports.sendBroadcastNotification = sendBroadcastNotification;
const admin = __importStar(require("firebase-admin"));
const prisma_1 = require("../config/prisma");
const socket_manager_1 = require("../socket/socket.manager");
// import { sendTelegramToMany } from './telegram.service';
const app = admin.apps.length > 0
    ? admin.app()
    : // This converts the string to a valid JSON object
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY))
        });
exports.default = app;
function cleanString(str) {
    if (typeof str !== 'string')
        return String(str || '');
    return str
        // 1. Normalize unicode characters into standard forms
        .normalize("NFC")
        // 2. Replace stylistic em-dashes or en-dashes with a standard plain hyphen
        .replace(/[\u2014\u2013]/g, "-")
        // 3. Strip out invisible control characters (ASCII 0-31 and 127)
        .replace(/[\x00-\x1F\x7F]/g, "")
        .trim();
}
async function sendToUser(userId, payload) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true, webFcmToken: true },
    });
    const tokens = [user?.fcmToken, user?.webFcmToken].filter(Boolean).map(cleanString);
    if (!tokens.length)
        return false;
    const safeTitle = cleanString(payload.title);
    const safeBody = cleanString(payload.body);
    const safeData = {};
    if (payload.data) {
        for (const [k, v] of Object.entries(payload.data)) {
            safeData[k] = cleanString(v);
        }
    }
    const results = await Promise.allSettled(tokens.map((token) => app.messaging().send({
        token,
        notification: { title: safeTitle, body: safeBody },
        data: safeData,
        android: { priority: 'high', notification: { channelId: 'firstchoice_channel', priority: 'high' } },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        webpush: { fcmOptions: { link: safeData.screen ? `/${safeData.screen}` : '/' } },
    })));
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            console.error(`[push] send failed for user ${userId}, token ${tokens[i]?.slice(0, 12)}...:`, r.reason?.code, r.reason?.message);
            if (r.reason?.code === 'messaging/registration-token-not-registered') {
                const field = tokens[i] === user.fcmToken ? 'fcmToken' : 'webFcmToken';
                prisma_1.prisma.user.update({ where: { id: userId }, data: { [field]: null } }).catch(() => { });
            }
        }
        else {
            console.log(`[push] sent OK to user ${userId}, token ${tokens[i]?.slice(0, 12)}...`);
        }
    });
    return results.some((r) => r.status === 'fulfilled');
}
async function sendToMany(userIds, payload) {
    await Promise.allSettled(userIds.map(id => sendToUser(id, payload)));
}
async function sendToRole(role, payload) {
    const users = await prisma_1.prisma.user.findMany({
        where: { role, status: 'ACTIVE', fcmToken: { not: null } },
        select: { id: true },
    });
    await sendToMany(users.map(u => u.id), payload);
}
// ─── ORDER NOTIFICATIONS ──────────────────────────────────
async function notifyNewOrder(orderId) {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: orderId },
        include: {
            vendor: { include: { user: { select: { id: true } } } },
            customer: { select: { name: true } },
            items: { include: { product: { select: { name: true } } } },
        },
    });
    if (!order)
        return;
    const itemSummary = order.items
        .slice(0, 2)
        .map(i => i.product.name)
        .join(', ')
        + (order.items.length > 2 ? ` +${order.items.length - 2} more` : '');
    await sendToUser(order.vendor.user.id, {
        title: 'New Order',
        body: `${order.customer.name} ordered ${itemSummary} GHS ${order.subtotal.toFixed(2)}`,
        data: { type: 'NEW_ORDER', orderId, screen: 'orders' },
    });
    // → Admin
    await sendToRole('ADMIN', {
        title: '📦 New Order Received',
        body: `From ${order.customer.name} at ${order.vendor.businessName} — GHS ${order.totalAmount.toFixed(2)}`,
        data: { type: 'NEW_ORDER', orderId, screen: 'admin_orders' },
    });
}
function notifyRidersOfJob(order, vendorAddress) {
    (0, socket_manager_1.notifyRiders)('delivery:new_request', {
        type: 'NEW_DELIVERY',
        orderId: order.id,
        pickupAddress: vendorAddress,
        destinationAddress: order.deliveryAddress,
        itemDescription: order.notes,
        estimatedFee: order.deliveryFee,
        paymentMethod: order.paymentMethod,
        customer: {
            name: order.recipientName,
            phone: order.recipientPhone,
        },
        createdAt: order.createdAt,
    });
}
async function notifyOrderStatusChange(orderId, newStatus) {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: orderId },
        include: {
            customer: { select: { id: true, name: true } },
            vendor: { include: { user: { select: { id: true } } } },
            rider: { include: { user: { select: { id: true, name: true } } } },
            items: { include: { product: { select: { name: true } } } },
        },
    });
    if (!order)
        return;
    const STATUS_MESSAGES = {
        ACCEPTED: { title: '✅ Order Accepted', body: `${order.vendor.businessName} accepted your order!` },
        PREPARING: { title: '👨‍🍳 Being Prepared', body: `${order.vendor.businessName} is preparing your order.` },
        READY_FOR_PICKUP: { title: '📦 Ready for Pickup', body: 'Your order is ready and waiting for a rider.' },
        RIDER_ASSIGNED: { title: '🛵 Rider Assigned', body: `${order.rider?.user.name ?? 'A rider'} is coming to pick up your order!` },
        PICKED_UP: { title: '🛵 Order Picked Up', body: 'Your order has been picked up and is on the way!' },
        IN_TRANSIT: { title: '🛵 Order Coming To You', body: 'Your order is on the way to you.' },
        ARRIVED: { title: '📍 Rider Has Arrived', body: 'Your rider is outside — please come collect your order!' }, // ← new
        DELIVERED: { title: '🎉 Order Delivered!', body: `Your order from ${order.vendor.businessName} has been delivered. Enjoy!` },
        CANCELLED: { title: '❌ Order Cancelled', body: `Your order from ${order.vendor.businessName} was cancelled.` },
    };
    const msg = STATUS_MESSAGES[newStatus];
    if (!msg)
        return;
    const baseData = { type: 'ORDER_STATUS', orderId, status: newStatus, screen: 'order_detail' };
    // → Customer always gets notified
    await sendToUser(order.customerId, {
        ...msg,
        data: baseData,
    });
    const itemSummary = order.items.slice(0, 2).map(i => i.product.name).join(', ')
        + (order.items.length > 2 ? ` +${order.items.length - 2} more` : '');
    const admins = await prisma_1.prisma.user.findMany({
        where: { role: 'ADMIN', telegramChatId: { not: null } },
        select: { telegramChatId: true },
    });
    // await sendTelegramToMany(
    //   admins.map(a => a.telegramChatId!),
    //   `📦 <b>New Order</b>\nFrom ${order.customer.name} at ${order.vendor.businessName}\nItems: ${itemSummary}\nTotal: GHS ${order.totalAmount.toFixed(2)}\nOrder #${orderId.slice(-6).toUpperCase()}`
    // );
    // → Vendor gets notified on rider assignment, pickup, delivery, cancel
    if (['RIDER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED'].includes(newStatus)) {
        const vendorMessages = {
            RIDER_ASSIGNED: { title: '🛵 Rider On The Way', body: `${order.rider?.user.name} is heading to pick up order #${orderId.slice(-6).toUpperCase()}` },
            PICKED_UP: { title: '✅ Order Picked Up', body: `Order #${orderId.slice(-6).toUpperCase()} has been picked up.` },
            IN_TRANSIT: { title: '✅ Order Coming To You', body: `Order #${orderId.slice(-6).toUpperCase()} has been picked up and is on the way to you.` },
            ARRIVED: { title: '📍 Rider Arrived', body: `Rider has arrived with order #${orderId.slice(-6).toUpperCase()}.` }, // ← new
            DELIVERED: { title: '🎉 Order Delivered', body: `Order #${orderId.slice(-6).toUpperCase()} was delivered successfully!` },
            CANCELLED: { title: '❌ Order Cancelled', body: `Order #${orderId.slice(-6).toUpperCase()} was cancelled.` },
        };
        const vendorMsg = vendorMessages[newStatus];
        if (vendorMsg) {
            await sendToUser(order.vendor.user.id, { ...vendorMsg, data: { ...baseData, screen: 'vendor_orders' } });
        }
    }
    // → Rider gets notified when assigned
    if (newStatus === 'RIDER_ASSIGNED' && order.rider) {
        await sendToUser(order.rider.user.id, {
            title: '🛒 New Delivery Job!',
            body: `You've been assigned to deliver order #${orderId.slice(-6).toUpperCase()}. Head to ${order.vendor.businessName} now!`,
            data: { type: 'RIDER_ASSIGNED', orderId, screen: 'active_jobs' },
        });
    }
}
// ─── DELIVERY NOTIFICATIONS ───────────────────────────────
async function notifyNewDelivery(deliveryId) {
    const delivery = await prisma_1.prisma.deliveryRequest.findUnique({
        where: { id: deliveryId },
        include: { customer: { select: { name: true } } },
    });
    if (!delivery)
        return;
    // → All online riders
    const onlineRiders = await prisma_1.prisma.rider.findMany({
        where: { availability: 'ONLINE' },
        include: { user: { select: { id: true } } },
    });
    await sendToMany(onlineRiders.map(r => r.user.id), {
        title: '🚀 New Delivery Request!',
        body: `${delivery.itemDescription} — GHS ${delivery.estimatedFee.toFixed(2)} • Tap to accept`,
        data: { type: 'NEW_DELIVERY', deliveryId, screen: 'available_deliveries' },
    });
    // → Admin
    await sendToRole('ADMIN', {
        title: '📦 New Delivery Request',
        body: `From ${delivery.customer.name} — ${delivery.pickupAddress} → ${delivery.destinationAddress}`,
        data: { type: 'NEW_DELIVERY', deliveryId, screen: 'admin_deliveries' },
    });
}
async function notifyDeliveryStatusChange(deliveryId, newStatus) {
    const delivery = await prisma_1.prisma.deliveryRequest.findUnique({
        where: { id: deliveryId },
        include: {
            customer: { select: { id: true, name: true } },
            rider: { include: { user: { select: { id: true, name: true } } } },
        },
    });
    if (!delivery)
        return;
    const DELIVERY_MESSAGES = {
        ACCEPTED: { title: '🛵 Rider Accepted!', body: `${delivery.rider?.user.name ?? 'A rider'} accepted your delivery request!` },
        PICKED_UP: { title: '📦 Item Picked Up', body: 'Your item has been picked up and is on the way!' },
        IN_TRANSIT: { title: '🛵 In Transit', body: 'Your delivery is on the way to you!' },
        DELIVERED: { title: '✅ Delivered!', body: 'Your delivery has been completed successfully!' },
        CANCELLED: { title: '❌ Delivery Cancelled', body: 'Your delivery request was cancelled.' },
    };
    const msg = DELIVERY_MESSAGES[newStatus];
    if (!msg)
        return;
    await sendToUser(delivery.customerId, {
        ...msg,
        data: { type: 'DELIVERY_STATUS', deliveryId, status: newStatus, screen: 'delivery_detail' },
    });
    const [onlineRiders, admins] = await Promise.all([
        prisma_1.prisma.rider.findMany({
            where: { availability: 'ONLINE', user: { telegramChatId: { not: null } } },
            include: { user: { select: { telegramChatId: true } } },
        }),
        prisma_1.prisma.user.findMany({
            where: { role: 'ADMIN', telegramChatId: { not: null } },
            select: { telegramChatId: true },
        }),
    ]);
    const chatIds = [
        ...onlineRiders.map(r => r.user.telegramChatId),
        ...admins.map(a => a.telegramChatId),
    ];
    // await sendTelegramToMany(
    //   chatIds,
    //   `🚀 <b>New Delivery Request</b>\nFrom ${delivery.customer.name}\n${delivery.pickupAddress} → ${delivery.destinationAddress}\nFee: GHS ${delivery.estimatedFee.toFixed(2)}\nTap to accept in the app.`
    // );
}
// ─── VENDOR NOTIFICATIONS ─────────────────────────────────
async function notifyVendorApproved(vendorUserId, businessName) {
    await sendToUser(vendorUserId, {
        title: '🎉 Store Approved!',
        body: `${businessName} is now live on FirstChoice. Customers can find and order from you!`,
        data: { type: 'VENDOR_APPROVED', screen: 'vendor_dashboard' },
    });
}
async function notifyVendorPendingApproval(businessName) {
    await sendToRole('ADMIN', {
        title: '🏪 New Vendor Registration',
        body: `${businessName} is waiting for approval. Review and approve from the admin panel.`,
        data: { type: 'VENDOR_PENDING', screen: 'admin_vendors' },
    });
}
// ─── ERRAND NOTIFICATIONS ─────────────────────────────────
async function notifyNewErrand(errandId) {
    const errand = await prisma_1.prisma.errand.findUnique({
        where: { id: errandId },
        include: { customer: { select: { name: true } } },
    });
    if (!errand)
        return;
    const onlineRiders = await prisma_1.prisma.rider.findMany({
        where: { availability: 'ONLINE' },
        include: { user: { select: { id: true } } },
    });
    await sendToMany(onlineRiders.map(r => r.user.id), {
        title: '🏃 New Errand Request!',
        body: `${errand.description.slice(0, 60)} — Budget: GHS ${errand.budget.toFixed(2)}`,
        data: { type: 'NEW_ERRAND', errandId, screen: 'errands' },
    });
}
async function notifyErrandStatusChange(errandId, newStatus, customerId) {
    const ERRAND_MESSAGES = {
        ACCEPTED: { title: '✅ Errand Accepted', body: 'A rider accepted your errand request!' },
        IN_PROGRESS: { title: '🏃 Errand In Progress', body: 'Your errand is being handled!' },
        COMPLETED: { title: '🎉 Errand Completed!', body: 'Your errand has been completed successfully!' },
        CANCELLED: { title: '❌ Errand Cancelled', body: 'Your errand was cancelled.' },
    };
    const msg = ERRAND_MESSAGES[newStatus];
    if (msg) {
        await sendToUser(customerId, {
            ...msg,
            data: { type: 'ERRAND_STATUS', errandId, status: newStatus, screen: 'errands' },
        });
    }
}
// ─── FCM TOKEN MANAGEMENT ─────────────────────────────────
async function updateFcmToken(userId, token) {
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { fcmToken: token },
    });
}
// notification.service.ts
async function notifyRidersNewOrder(orderId) {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: orderId },
        include: { vendor: { select: { businessName: true } } },
    });
    if (!order)
        return;
    const onlineRiders = await prisma_1.prisma.rider.findMany({
        where: { availability: 'ONLINE' },
        include: { user: { select: { id: true } } },
    });
    if (!onlineRiders.length)
        return;
    await sendToMany(onlineRiders.map(r => r.user.id), {
        title: '🚀 New Order Request!',
        body: `${order.vendor.businessName} — GHS ${order.deliveryFee?.toFixed(2) ?? '0.00'} delivery fee • Tap to accept`,
        data: { type: 'NEW_DELIVERY', orderId: order.id, screen: 'available_deliveries' },
    });
}
// ─── BROADCAST NOTIFICATIONS ──────────────────────────────
async function sendBroadcastNotification(payload) {
    const users = await prisma_1.prisma.user.findMany({
        where: {
            status: 'ACTIVE',
            ...(payload.role && { role: payload.role }),
            OR: [{ webFcmToken: { not: null } }, { fcmToken: { not: null } }],
        },
        select: { id: true },
    });
    await sendToMany(users.map(u => u.id), {
        title: payload.title,
        body: payload.body,
        data: { type: 'BROADCAST', screen: 'home' },
    });
    return { total: users.length };
}
//# sourceMappingURL=notification.service.js.map