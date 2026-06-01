"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordTransaction = recordTransaction;
exports.getTransactionByOrder = getTransactionByOrder;
exports.getAllTransactions = getAllTransactions;
exports.getTransactionSummary = getTransactionSummary;
const prisma_1 = require("../config/prisma");
async function recordTransaction(userId, data) {
    const order = await prisma_1.prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order)
        throw new Error('Order not found');
    if (order.customerId !== userId)
        throw new Error('You can only record payment for your own orders');
    const existing = await prisma_1.prisma.transaction.findUnique({
        where: { orderId: data.orderId },
    });
    if (existing)
        throw new Error('Transaction already recorded for this order');
    return prisma_1.prisma.$transaction(async (tx) => {
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
async function getTransactionByOrder(orderId, userId) {
    const order = await prisma_1.prisma.order.findUnique({ where: { id: orderId } });
    if (!order)
        throw new Error('Order not found');
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    const isCustomer = order.customerId === userId;
    const isVendor = vendor?.id === order.vendorId;
    const isAdmin = user.role === 'ADMIN';
    if (!isCustomer && !isVendor && !isAdmin)
        throw new Error('Access denied');
    const transaction = await prisma_1.prisma.transaction.findUnique({
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
    if (!transaction)
        throw new Error('No transaction found for this order');
    return transaction;
}
async function getAllTransactions(filters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const where = {
        ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus }),
        ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
    };
    const [transactions, total] = await Promise.all([
        prisma_1.prisma.transaction.findMany({
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
        prisma_1.prisma.transaction.count({ where }),
    ]);
    return {
        transactions,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}
async function getTransactionSummary() {
    const [totalRevenue, totalPaid, totalPending, totalFailed] = await Promise.all([
        prisma_1.prisma.transaction.aggregate({ _sum: { amount: true } }),
        prisma_1.prisma.transaction.aggregate({
            where: { paymentStatus: 'PAID' },
            _sum: { amount: true },
        }),
        prisma_1.prisma.transaction.aggregate({
            where: { paymentStatus: 'PENDING' },
            _sum: { amount: true },
        }),
        prisma_1.prisma.transaction.aggregate({
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
//# sourceMappingURL=transaction.service.js.map