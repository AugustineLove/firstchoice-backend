import { PaymentMethod, PaymentStatus } from '../../generated/prisma/enums';
import { prisma } from '../config/prisma';

export async function recordTransaction(
  userId: string,
  data: {
    orderId: string;
    paymentMethod: PaymentMethod;
    amount: number;
  }
) {
  const order = await prisma.order.findUnique({ where: { id: data.orderId } });
  if (!order) throw new Error('Order not found');
  if (order.customerId !== userId)
    throw new Error('You can only record payment for your own orders');

  const existing = await prisma.transaction.findUnique({
    where: { orderId: data.orderId },
  });
  if (existing) throw new Error('Transaction already recorded for this order');

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        orderId: data.orderId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentStatus: 'PAID',
      },
    });

    await tx.order.update({
      where: { id: data.orderId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: data.paymentMethod,
      },
    });

    return transaction;
  });
}

export async function getTransactionByOrder(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const vendor = await prisma.vendor.findUnique({ where: { userId } });

  const isCustomer = order.customerId === userId;
  const isVendor = vendor?.id === order.vendorId;
  const isAdmin = user.role === 'ADMIN';

  if (!isCustomer && !isVendor && !isAdmin)
    throw new Error('Access denied');

  const transaction = await prisma.transaction.findUnique({
    where: { orderId },
    include: {
      order: {
        include: {
          customer: { select: { name: true, phone: true } },
          vendor: { select: { businessName: true } },
        },
      },
    },
  });

  if (!transaction) throw new Error('No transaction found for this order');
  return transaction;
}

export async function getAllTransactions(filters: {
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus }),
    ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { recordedAt: 'desc' },
      include: {
        order: {
          include: {
            customer: { select: { name: true, phone: true } },
            vendor: { select: { businessName: true } },
          },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getTransactionSummary() {
  const [totalRevenue, totalPaid, totalPending, totalFailed] =
    await Promise.all([
      prisma.transaction.aggregate({ _sum: { amount: true } }),
      prisma.transaction.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { paymentStatus: 'PENDING' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { paymentStatus: 'FAILED' },
        _sum: { amount: true },
      }),
    ]);

  return {
    totalRevenue: totalRevenue._sum.amount || 0,
    totalPaid: totalPaid._sum.amount || 0,
    totalPending: totalPending._sum.amount || 0,
    totalFailed: totalFailed._sum.amount || 0,
  };
}