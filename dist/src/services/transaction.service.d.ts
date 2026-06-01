import { PaymentMethod, PaymentStatus } from '@prisma/client';
export declare function recordTransaction(userId: string, data: {
    orderId: string;
    paymentMethod: PaymentMethod;
    amount: number;
}): Promise<{
    id: string;
    paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
    paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
    orderId: string;
    amount: number;
    recordedAt: Date;
}>;
export declare function getTransactionByOrder(orderId: string, userId: string): Promise<{
    order: {
        vendor: {
            businessName: string;
        };
        customer: {
            name: string;
            phone: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        vendorId: string;
        riderId: string | null;
        subtotal: number;
        deliveryFee: number;
        totalAmount: number;
        orderType: import("@prisma/client").$Enums.OrderType;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        orderStatus: import("@prisma/client").$Enums.OrderStatus;
        deliveryAddress: string;
        notes: string | null;
    };
} & {
    id: string;
    paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
    paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
    orderId: string;
    amount: number;
    recordedAt: Date;
}>;
export declare function getAllTransactions(filters: {
    paymentStatus?: PaymentStatus;
    paymentMethod?: PaymentMethod;
    page?: number;
    limit?: number;
}): Promise<{
    transactions: ({
        order: {
            vendor: {
                businessName: string;
            };
            customer: {
                name: string;
                phone: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            customerId: string;
            vendorId: string;
            riderId: string | null;
            subtotal: number;
            deliveryFee: number;
            totalAmount: number;
            orderType: import("@prisma/client").$Enums.OrderType;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
            orderStatus: import("@prisma/client").$Enums.OrderStatus;
            deliveryAddress: string;
            notes: string | null;
        };
    } & {
        id: string;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        orderId: string;
        amount: number;
        recordedAt: Date;
    })[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
export declare function getTransactionSummary(): Promise<{
    totalRevenue: number;
    totalPaid: number;
    totalPending: number;
    totalFailed: number;
}>;
