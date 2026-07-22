import * as admin from 'firebase-admin';
import { prisma } from '../config/prisma';
import path from 'path';


const serviceAccount = JSON.parse(process.env.FIREBASE_KEY as string);

const app =
    admin.apps.length > 0
        ? admin.app()
        : admin.initializeApp({
              credential: admin.credential.cert(
                  JSON.parse(serviceAccount)
              ),
          });

export default app;

// ─── Core send function ───────────────────────────────────

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

function cleanString(str: any): string {
  if (typeof str !== 'string') return String(str || '');

  return str
    // 1. Normalize unicode characters into standard forms
    .normalize("NFC")
    // 2. Replace stylistic em-dashes or en-dashes with a standard plain hyphen
    .replace(/[\u2014\u2013]/g, "-")
    // 3. Strip out invisible control characters (ASCII 0-31 and 127)
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();
}

async function sendToUser(userId: string, payload: PushPayload): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true, name: true },
    });

    console.log(`SendToUser notification user: ${JSON.stringify(user)}`); 

    const cleanToken = cleanString(user?.fcmToken);
    if (!cleanToken) return false;

    if (!user?.fcmToken) return false;

    // 1. Clean the payload parts carefully up front
    const safeTitle = cleanString(payload.title);
    const safeBody = cleanString(payload.body);
    
    const safeData: Record<string, string> = {};
    if (payload.data) {
      for (const [key, value] of Object.entries(payload.data)) {
        safeData[key] = cleanString(value);
      }
    }

    // 2. Safe log logging
    console.log("CLEANED PAYLOAD:", JSON.stringify({ title: safeTitle, body: safeBody, data: safeData }, null, 2));

    await app.messaging().send({
      token: cleanToken,
      notification: {
        title: safeTitle,
        body: safeBody,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      data: safeData,
      android: {
        priority: "high",
        notification: {
          channelId: "firstchoice_channel",
          priority: "high",
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    });

    return true;
  } catch (err: any) {
    if (err.code === 'messaging/registration-token-not-registered') {
      await prisma.user.update({
        where: { id: userId },
        data: { fcmToken: null },
      }).catch(() => {});
    }
    console.error(`Push failed for user ${userId}:`, err?.message || err);
    return false;
  }
}

async function sendToMany(userIds: string[], payload: PushPayload): Promise<void> {
  await Promise.allSettled(userIds.map(id => sendToUser(id, payload)));
}

async function sendToRole(role: 'VENDOR' | 'RIDER' | 'ADMIN', payload: PushPayload): Promise<void> {
  const users = await prisma.user.findMany({
    where: { role, status: 'ACTIVE', fcmToken: { not: null } },
    select: { id: true },
  });
  await sendToMany(users.map(u => u.id), payload);
}

// ─── ORDER NOTIFICATIONS ──────────────────────────────────

export async function notifyNewOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      vendor:   { include: { user: { select: { id: true } } } },
      customer: { select: { name: true } },
      items:    { include: { product: { select: { name: true } } } },
    },
  });
  if (!order) return;

  const itemSummary = order.items
    .slice(0, 2)
    .map(i => i.product.name)
    .join(', ')
    + (order.items.length > 2 ? ` +${order.items.length - 2} more` : '');

  // → Vendor
  console.log(JSON.stringify(order))
  await sendToUser(order.vendor.user.id, {
    title: 'New Order',
    body:  `${order.customer.name} ordered ${itemSummary} GHS ${order.subtotal.toFixed(2)}`,
    data:  { type: 'NEW_ORDER', orderId, screen: 'orders' },
  });

  // → Admin
  await sendToRole('ADMIN', {
    title: '📦 New Order Received',
    body:  `From ${order.customer.name} at ${order.vendor.businessName} — GHS ${order.totalAmount.toFixed(2)}`,
    data:  { type: 'NEW_ORDER', orderId, screen: 'admin_orders' },
  });
}

export async function notifyOrderStatusChange(
  orderId: string,
  newStatus: string
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { id: true, name: true } },
      vendor:   { include: { user: { select: { id: true } } } },
      rider:    { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!order) return;

  const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
    ACCEPTED:         { title: '✅ Order Accepted', body: `${order.vendor.businessName} accepted your order!` },
    PREPARING:        { title: '👨‍🍳 Being Prepared', body: `${order.vendor.businessName} is preparing your order.` },
    READY_FOR_PICKUP: { title: '📦 Ready for Pickup', body: 'Your order is ready and waiting for a rider.' },
    RIDER_ASSIGNED:   { title: '🛵 Rider Assigned', body: `${order.rider?.user.name ?? 'A rider'} is coming to pick up your order!` },
    PICKED_UP:        { title: '🛵 Order Picked Up', body: 'Your order has been picked up and is on the way!' },
    DELIVERED:        { title: '🎉 Order Delivered!', body: `Your order from ${order.vendor.businessName} has been delivered. Enjoy!` },
    CANCELLED:        { title: '❌ Order Cancelled', body: `Your order from ${order.vendor.businessName} was cancelled.` },
  };

  const msg = STATUS_MESSAGES[newStatus];
  if (!msg) return;

  const baseData = { type: 'ORDER_STATUS', orderId, status: newStatus, screen: 'order_detail' };

  // → Customer always gets notified
  await sendToUser(order.customerId, {
    ...msg,
    data: baseData,
  });

  // → Vendor gets notified on rider assignment, pickup, delivery, cancel
  if (['RIDER_ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'].includes(newStatus)) {
    const vendorMessages: Record<string, { title: string; body: string }> = {
      RIDER_ASSIGNED: { title: '🛵 Rider On The Way', body: `${order.rider?.user.name} is heading to pick up order #${orderId.slice(-6).toUpperCase()}` },
      PICKED_UP:      { title: '✅ Order Picked Up', body: `Order #${orderId.slice(-6).toUpperCase()} has been picked up.` },
      DELIVERED:      { title: '🎉 Order Delivered', body: `Order #${orderId.slice(-6).toUpperCase()} was delivered successfully!` },
      CANCELLED:      { title: '❌ Order Cancelled', body: `Order #${orderId.slice(-6).toUpperCase()} was cancelled.` },
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
      body:  `You've been assigned to deliver order #${orderId.slice(-6).toUpperCase()}. Head to ${order.vendor.businessName} now!`,
      data:  { type: 'RIDER_ASSIGNED', orderId, screen: 'active_jobs' },
    });
  }
}

// ─── DELIVERY NOTIFICATIONS ───────────────────────────────

export async function notifyNewDelivery(deliveryId: string): Promise<void> {
  const delivery = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryId },
    include: { customer: { select: { name: true } } },
  });
  if (!delivery) return;

  // → All online riders
  const onlineRiders = await prisma.rider.findMany({
    where: { availability: 'ONLINE' },
    include: { user: { select: { id: true } } },
  });

  await sendToMany(onlineRiders.map(r => r.user.id), {
    title: '🚀 New Delivery Request!',
    body:  `${delivery.itemDescription} — GHS ${delivery.estimatedFee.toFixed(2)} • Tap to accept`,
    data:  { type: 'NEW_DELIVERY', deliveryId, screen: 'available_deliveries' },
  });

  // → Admin
  await sendToRole('ADMIN', {
    title: '📦 New Delivery Request',
    body:  `From ${delivery.customer.name} — ${delivery.pickupAddress} → ${delivery.destinationAddress}`,
    data:  { type: 'NEW_DELIVERY', deliveryId, screen: 'admin_deliveries' },
  });
}

export async function notifyDeliveryStatusChange(
  deliveryId: string,
  newStatus: string
): Promise<void> {
  const delivery = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryId },
    include: {
      customer: { select: { id: true } },
      rider:    { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!delivery) return;

  const DELIVERY_MESSAGES: Record<string, { title: string; body: string }> = {
    ACCEPTED:   { title: '🛵 Rider Accepted!', body: `${delivery.rider?.user.name ?? 'A rider'} accepted your delivery request!` },
    PICKED_UP:  { title: '📦 Item Picked Up', body: 'Your item has been picked up and is on the way!' },
    IN_TRANSIT: { title: '🛵 In Transit', body: 'Your delivery is on the way to you!' },
    DELIVERED:  { title: '✅ Delivered!', body: 'Your delivery has been completed successfully!' },
    CANCELLED:  { title: '❌ Delivery Cancelled', body: 'Your delivery request was cancelled.' },
  };

  const msg = DELIVERY_MESSAGES[newStatus];
  if (!msg) return;

  await sendToUser(delivery.customerId, {
    ...msg,
    data: { type: 'DELIVERY_STATUS', deliveryId, status: newStatus, screen: 'delivery_detail' },
  });
}

// ─── VENDOR NOTIFICATIONS ─────────────────────────────────

export async function notifyVendorApproved(vendorUserId: string, businessName: string): Promise<void> {
  await sendToUser(vendorUserId, {
    title: '🎉 Store Approved!',
    body:  `${businessName} is now live on FirstChoice. Customers can find and order from you!`,
    data:  { type: 'VENDOR_APPROVED', screen: 'vendor_dashboard' },
  });
}

export async function notifyVendorPendingApproval(businessName: string): Promise<void> {
  await sendToRole('ADMIN', {
    title: '🏪 New Vendor Registration',
    body:  `${businessName} is waiting for approval. Review and approve from the admin panel.`,
    data:  { type: 'VENDOR_PENDING', screen: 'admin_vendors' },
  });
}

// ─── ERRAND NOTIFICATIONS ─────────────────────────────────

export async function notifyNewErrand(errandId: string): Promise<void> {
  const errand = await prisma.errand.findUnique({
    where: { id: errandId },
    include: { customer: { select: { name: true } } },
  });
  if (!errand) return;

  const onlineRiders = await prisma.rider.findMany({
    where: { availability: 'ONLINE' },
    include: { user: { select: { id: true } } },
  });

  await sendToMany(onlineRiders.map(r => r.user.id), {
    title: '🏃 New Errand Request!',
    body:  `${errand.description.slice(0, 60)} — Budget: GHS ${errand.budget.toFixed(2)}`,
    data:  { type: 'NEW_ERRAND', errandId, screen: 'errands' },
  });
}

export async function notifyErrandStatusChange(
  errandId: string,
  newStatus: string,
  customerId: string
): Promise<void> {
  const ERRAND_MESSAGES: Record<string, { title: string; body: string }> = {
    ACCEPTED:    { title: '✅ Errand Accepted', body: 'A rider accepted your errand request!' },
    IN_PROGRESS: { title: '🏃 Errand In Progress', body: 'Your errand is being handled!' },
    COMPLETED:   { title: '🎉 Errand Completed!', body: 'Your errand has been completed successfully!' },
    CANCELLED:   { title: '❌ Errand Cancelled', body: 'Your errand was cancelled.' },
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

export async function updateFcmToken(userId: string, token: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { fcmToken: token },
  });
}