import { OrderStatus } from '../../generated/prisma/enums';
import { prisma } from '../config/prisma';
import {
  notifyUser,
  notifyOrderRoom,
  notifyAdmins,
  notifyVendor,
} from '../socket/socket.manager';

export async function placeOrder(
  customerId: string,
  data: {
    vendorId: string;
    items: { productId: string; quantity: number }[];
    deliveryAddress: string;
    paymentMethod: 'CASH' | 'MOMO';
    notes?: string;
  }
) {
  // 1. Verify vendor exists and is active
  const vendor = await prisma.vendor.findUnique({
    where: { id: data.vendorId },
  });
  if (!vendor) throw new Error('Vendor not found');
  if (vendor.status !== 'ACTIVE')
    throw new Error('This vendor is currently unavailable');

  // 2. Fetch and validate all products
  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, vendorId: data.vendorId },
  });

  if (products.length !== data.items.length)
    throw new Error('One or more products not found or do not belong to this vendor');

  for (const item of data.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    if (!product.available) throw new Error(`Product is unavailable: ${product.name}`);
    if (product.stock < item.quantity)
      throw new Error(`Insufficient stock for: ${product.name}`);
  }

  // 3. Calculate totals
  const orderItems = data.items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: product.price,
    };
  });

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const deliveryFee = calculateDeliveryFee(subtotal);
  const totalAmount = subtotal + deliveryFee;

  // 4. Create order + items + deduct stock in a transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        customerId,
        vendorId: data.vendorId,
        deliveryAddress: data.deliveryAddress,
        paymentMethod: data.paymentMethod,
        notes: data.notes || null,
        subtotal,
        deliveryFee,
        totalAmount,
        orderType: 'MARKETPLACE',
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: { product: { select: { name: true, images: true } } },
        },
        vendor: { select: { businessName: true, logo: true, phone: true } },
      },
    });

    // Deduct stock
    for (const item of data.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Notify vendor of new order
  notifyVendor(data.vendorId, 'vendor:new_order', {
    orderId: order.id,
    customerName: order.items[0]?.product?.name,
    totalAmount: order.totalAmount,
    timestamp: new Date(),
  });

  notifyAdmins('admin:new_order', {
    orderId: order.id,
    vendorId: data.vendorId,
    totalAmount: order.totalAmount,
    timestamp: new Date(),
  });

    return newOrder;
  });

  return order;
}

function calculateDeliveryFee(subtotal: number): number {
  // Base fee: 5 GHS, +2 GHS for every 50 GHS order value
  const base = 5;
  const extra = Math.floor(subtotal / 50) * 2;
  return base + extra;
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
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP'],
  READY_FOR_PICKUP: ['RIDER_ASSIGNED'],
  RIDER_ASSIGNED: ['PICKED_UP'],
  PICKED_UP: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
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
  if (newStatus === 'ACCEPTED' || newStatus === 'PREPARING' || newStatus === 'READY_FOR_PICKUP') {
    if (vendor?.id !== order.vendorId)
      throw new Error('Only the vendor can update to this status');
  }

  if (newStatus === 'PICKED_UP' || newStatus === 'DELIVERED') {
    if (rider?.id !== order.riderId)
      throw new Error('Only the assigned rider can update to this status');
  }

  if (newStatus === 'RIDER_ASSIGNED' && user.role !== 'ADMIN')
    throw new Error('Only admin can assign riders');

  if (newStatus === 'CANCELLED') {
    const cancellable = ['PENDING', 'ACCEPTED'];
    if (!cancellable.includes(order.orderStatus))
      throw new Error('Order can no longer be cancelled');
  }

  // Validate transition
  const allowed = validTransitions[order.orderStatus];
  if (!allowed.includes(newStatus))
    throw new Error(
      `Cannot transition from ${order.orderStatus} to ${newStatus}`
    );

  await emitOrderEvent(orderId, newStatus);

  return prisma.order.update({
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
    prisma.order.count({ where }),
  ]);

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
  if (status === 'READY_FOR_PICKUP') {
    notifyAdmins('admin:order_ready_for_dispatch', {
      orderId,
      vendorId: order.vendorId,
      timestamp: new Date(),
    });
  }
}