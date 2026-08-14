import { OrderStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  notifyUser,
  notifyOrderRoom,
  notifyAdmins,
  notifyVendor,
  notifyRiders,
} from '../socket/socket.manager';
import * as NotificationService from './notification.service';
import cloudinary from '../config/cloudinary';
import { sendCustomerMessage } from './message.service';
import { LOGISTICS_MANAGER_NUMBERS } from '../utils/constants';

interface feeData {
  pickupLat?: number,
  pickupLng?: number,
  destLat?: number,
  destLng?: number
}
// In placeOrder, update the items validation and price calculation:

// Same tiered-by-distance table used on the deliveries page / mobile app.
// Used only for SIMPLE (note-based) orders, where there's no subtotal yet
// to base a fee on — we price off distance instead, same as a delivery.
function calculateDeliveryFeeByDistance({
  pickupLat, pickupLng, destLat, destLng,
}: {
  pickupLat?: number | null;
  pickupLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
}) {
  if (
    pickupLat == null ||
    pickupLng == null ||
    destLat == null ||
    destLng == null
  ) {
    return 10; // fallback flat fee if coords missing
  }

  const r = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(destLat - pickupLat);
  const dLng = toRad(destLng - pickupLng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(pickupLat)) *
      Math.cos(toRad(destLat)) *
      Math.sin(dLng / 2) ** 2;

  const km =
    r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (km <= 1) return 5;
  if (km <= 1.5) return 6;
  if (km <= 2) return 7;
  if (km <= 2.5) return 8;
  if (km <= 3) return 9;
  if (km <= 3.5) return 10;
  if (km <= 4) return 11;
  if (km <= 4.5) return 12;
  if (km <= 5) return 13;
  if (km <= 5.5) return 14;
  if (km <= 6) return 15;
  if (km <= 6.5) return 16;
  if (km <= 7) return 17;
  if (km <= 7.5) return 18;
  if (km <= 8) return 19;
  if (km <= 8.5) return 20;
  if (km <= 9) return 21;
  if (km <= 9.5) return 22;
  if (km <= 10) return 23;
  if (km <= 10.5) return 24;
  if (km <= 11) return 25;
  if (km <= 11.5) return 26;
  if (km <= 12) return 27;
  if (km <= 12.5) return 28;
  if (km <= 13) return 29;
  if (km <= 13.5) return 30;
  if (km <= 14) return 31;
  if (km <= 14.5) return 32;
  if (km <= 15) return 33;
  if (km <= 15.5) return 34;
  if (km <= 16) return 35;
  if (km <= 16.5) return 36;
  if (km <= 17) return 37;
  if (km <= 17.5) return 38;
  if (km <= 18) return 39;
  if (km <= 18.5) return 40;
  if (km <= 19) return 41;
  if (km <= 19.5) return 42;
  if (km <= 20) return 43;
  if (km <= 20.5) return 44;
  if (km <= 21) return 45;
  if (km <= 21.5) return 46;
  if (km <= 22) return 47;
  if (km <= 22.5) return 48;
  if (km <= 23) return 49;
  return 50;
}

export async function placeOrder(
  customerId: string,
  data: {
    vendorId: string;

    // ── legacy structured flow (unchanged, still fully supported) ──
    items?: {
      productId: string;
      quantity: number;
      selectedVariants?: { groupName: string; variantName: string; priceAdjustment: number }[];
      selectedAddons?: { groupName: string; addonName: string; price: number }[];
      itemNotes?: string;
    }[];
    subtotal?: any;

    // ── new simple flow ──
    note?: string;

    // shared by both flows
    recipientName?: string;
    recipientPhone?: string;
    deliveryAddress: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    paymentMethod: 'CASH' | 'MOMO';
    notes?: string;
  }
) {
  const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
  if (!vendor) throw new Error('Vendor not found');
  if (vendor.status !== 'ACTIVE') throw new Error('This vendor is currently unavailable');

  const hasStructuredItems = Array.isArray(data.items) && data.items.length > 0;
console.log(`Sub total: ${data.subtotal}`);
  // ═══════════════════════════════════════════════════════
  // LEGACY FLOW — untouched. Kicks in only when items[] is sent.
  // ═══════════════════════════════════════════════════════
  if (hasStructuredItems) {
    const productIds = data.items!.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, vendorId: data.vendorId },
    });

    if (products.length !== data.items!.length)
      throw new Error('One or more products not found');

    for (const item of data.items!) {
      const product = products.find(p => p.id === item.productId)!;
      if (!product.available) throw new Error(`Product unavailable: ${product.name}`);
      if (product.stock < item.quantity) throw new Error(`Insufficient stock: ${product.name}`);
    }

    const orderItems = data.items!.map(item => {
      const product = products.find(p => p.id === item.productId)!;
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
    } as feeData;

    const deliveryFee = calculateDeliveryFeeByDistance(calculationData);
    const totalAmount = data.subtotal + deliveryFee;

    const order = await prisma.$transaction(async (tx) => {
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
          customer: { select: { id: true, name: true, phone: true } },
          items: { include: { product: { select: { name: true, images: true } } } },
          vendor: { select: { businessName: true, logo: true, phone: true } },
        },
      });

      for (const item of data.items!) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newOrder;
    }, { timeout: 15000, maxWait: 30000 });
    
    sendCustomerMessage({
      messageTo: LOGISTICS_MANAGER_NUMBERS,
      messageFrom: 'FirstChoice',
      message: `New order placed: ${order.vendor.businessName} → ${order.deliveryAddress}.\nDelivery Fee: GHS ${order.deliveryFee?.toFixed(2)}\nTotal: GHS ${order.totalAmount?.toFixed(2)}.`,
    });
      notifyRiders('delivery:new_request', order);
    await NotificationService.notifyNewOrder(order.id);
    await NotificationService.notifyRidersNewOrder(order.id); 
    console.log('Order placed successfully, sending message to logistics managers...');
   
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

  const order = await prisma.order.create({
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
      subtotal: data.subtotal,          // unknown until vendor confirms
      deliveryFee,
      totalAmount: deliveryFee, // updated once vendor sets item pricing
      orderType: 'MARKETPLACE',
       orderStatus: 'PENDING',
    },
    include: {
      vendor: { select: { businessName: true, logo: true, phone: true } },
    },
  });
    sendCustomerMessage({
      messageTo: LOGISTICS_MANAGER_NUMBERS,
      messageFrom: 'FirstChoice',
      message: `New order placed: ${order.vendor.businessName} → ${order.deliveryAddress}.\nDelivery Fee: GHS ${order.deliveryFee?.toFixed(2)}\nTotal: GHS ${order.totalAmount?.toFixed(2)}.`,
    });
  notifyRiders('delivery:new_request', order);
  notifyAdmins('admin:order_ready_for_dispatch', {
    orderId: order.id,
    vendorId: order.vendorId,
    timestamp: new Date(),
  });
  await NotificationService.notifyNewOrder(order.id);
  await NotificationService.notifyRidersNewOrder(order.id);
  return order;
}

export async function getOrderById(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
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

  if (!order) throw new Error('Order not found');

  // Only the customer, vendor, assigned rider, or admin can view
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  const rider = await prisma.rider.findUnique({ where: { userId } });

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
const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING:         ['RIDER_ASSIGNED', 'CANCELLED'],
  RIDER_ASSIGNED:  ['PICKED_UP', 'CANCELLED'],
  PICKED_UP:       ['IN_TRANSIT', 'CANCELLED'],   // ← added
  IN_TRANSIT:      ['DELIVERED'],
  DELIVERED:       [],
  CANCELLED:       [],
  ACCEPTED:        [],
};

export async function updateOrderStatus(
  orderId: string,
  userId: string,
  newStatus: OrderStatus
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { vendor: true },
  });
  if (!order) throw new Error('Order not found');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  const rider = await prisma.rider.findUnique({ where: { userId } });

  // Role-based permission checks
  if (newStatus === 'PICKED_UP' || newStatus === 'DELIVERED') {
    if (rider?.id !== order.riderId)
      throw new Error('Only the assigned rider can update to this status');
  }

  // ── Rider self-assignment is a special path, not a plain transition ──
  if (newStatus === 'RIDER_ASSIGNED') {
    if (!rider) throw new Error('Only riders can accept orders');
    if (order.riderId) throw new Error('Order has already been assigned');

    await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: orderId } });
      if (!current || current.riderId) {
        throw new Error('Order already assigned');
      }
      await tx.order.update({
        where: { id: orderId },
        data: { riderId: rider.id, orderStatus: 'RIDER_ASSIGNED' },
      });
    });

    await emitOrderEvent(orderId, 'RIDER_ASSIGNED');
    await NotificationService.notifyOrderStatusChange(orderId, 'RIDER_ASSIGNED');
    return;
  }

  // ── Cancel permission + eligible states ──
  if (newStatus === 'CANCELLED') {
    const isCustomer = order.customerId === userId;
    const isAdmin = user.role === 'ADMIN';
    const isAssignedRider = !!rider && rider.id === order.riderId;
    if (!isCustomer && !isAdmin && !isAssignedRider)
      throw new Error('Only the customer, admin, or assigned rider can cancel');
    if (!['PENDING', 'RIDER_ASSIGNED', 'PICKED_UP'].includes(order.orderStatus))
      throw new Error('Order can no longer be cancelled');
  }

  if (newStatus === 'PENDING') {
    notifyRiders('delivery:new_request', {
      type: 'NEW_DELIVERY',
      orderId: order.id,
      pickupAddress: vendor?.address,
      destinationAddress: order.deliveryAddress,
      itemDescription: order.notes,
      estimatedFee: order.deliveryFee,
      paymentMethod: order.paymentMethod,
      customer: { name: order.recipientName, phone: order.recipientPhone },
      createdAt: order.createdAt,
    });
  }

  // ── Validate the transition against the state machine ──
  const allowed = validTransitions[order.orderStatus];
  if (!allowed.includes(newStatus))
    throw new Error(`Cannot transition from ${order.orderStatus} to ${newStatus}`);

  // ── Apply it, freeing the rider if this was a cancel ──
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId },
      data: { orderStatus: newStatus },
      include: {
        items: { include: { product: { select: { name: true } } } },
        vendor: { select: { businessName: true } },
        rider: { select: { user: { select: { name: true, phone: true } } } },
      },
    });

    if (newStatus === 'CANCELLED' && order.riderId) {
      await tx.rider.update({
        where: { id: order.riderId },
        data: { availability: 'ONLINE' },
      });
    }

    return result;
  });

  await emitOrderEvent(orderId, newStatus);
  await NotificationService.notifyOrderStatusChange(orderId, newStatus);

  return updated;
}

export async function cancelOrder(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  if (order.customerId !== userId)
    throw new Error('You can only cancel your own orders');

  const cancellable: OrderStatus[] = ['PENDING', 'ACCEPTED'];
  if (!cancellable.includes(order.orderStatus))
    throw new Error('This order can no longer be cancelled');

  return prisma.$transaction(async (tx) => {
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

export async function getAllOrders(filters: {
  status?: OrderStatus;
  vendorId?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(filters.status && { orderStatus: filters.status }),
    ...(filters.vendorId && { vendorId: filters.vendorId }),
    ...(filters.customerId && { customerId: filters.customerId }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        // This is actually the User who placed the order
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
          },
        },

        // Vendor
        vendor: {
          select: {
            id: true,
            businessName: true,
            phone: true,
            address: true,
            logo: true,
          },
        },

        // Rider
        rider: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },

        // Ordered products
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
              },
            },
          },
        },
      },
    }),

    prisma.order.count({
      where,
    }),
  ]);

  console.log(`Orders: ${orders.length}`);

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

async function emitOrderEvent(orderId: string, status: OrderStatus) {
  const order = await prisma.order.findUnique({
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

  if (!order) return;

  const payload = {
    orderId,
    status,
    timestamp: new Date(),
  };

  // Notify customer
  notifyUser(order.customerId, 'order:status_update', payload);

  // Notify order room (customer tracking + rider)
  notifyOrderRoom(orderId, 'order:status_update', payload);

  // Notify vendor room
  notifyVendor(order.vendorId, 'order:status_update', payload);

  // Notify admins
  notifyAdmins('admin:order_update', payload);

  // New order — notify all riders
  if (status === 'PENDING') {
    notifyAdmins('admin:order_ready_for_dispatch', {
      orderId,
      vendorId: order.vendorId,
      timestamp: new Date(),
    });
  }
}

// In your orders route/controller, add:
export async function getOrdersReadyForPickup() {
  console.log('here in the get orders ready for pickup');

  return prisma.order.findMany({
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
export async function riderAcceptOrder(orderId: string, riderUserId: string) {
  const rider = await prisma.rider.findUnique({ where: { userId: riderUserId } });
  if (!rider) throw new Error('Rider profile not found');
  if (rider.availability !== 'ONLINE') throw new Error('You must be online to accept');
  const user = await prisma.user.findUnique({ where: {id: rider.userId}});
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    if (order.orderStatus !== 'PENDING') throw new Error('Order already taken');
    if (order.riderId) throw new Error('Order already assigned');

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

    notifyUser(order.customerId, 'delivery:rider_accepted', {
        deliveryId:   order.id,
        riderName:   user?.name,
        riderPhone:   user?.phone,
        status:       'ACCEPTED',
        timestamp:    new Date(),
      });
    return updated;
  });
  
}

export async function attachOrderImage(orderId: string, customerId: string, imageBuffer: Buffer) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  if (order.customerId !== customerId) throw new Error('Not authorized to modify this order');

  const uploadResult: any = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'firstchoice/orders', transformation: [{ width: 1000, crop: 'limit' }] },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(imageBuffer);
  });

  return prisma.order.update({
    where: { id: orderId },
    data: { imageUrl: uploadResult.secure_url },
  });
} 