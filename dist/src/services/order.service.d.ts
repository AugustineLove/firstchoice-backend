import { OrderStatus } from '@prisma/client';
export declare function placeOrder(customerId: string, data: {
    vendorId: string;
    items: {
        productId: string;
        quantity: number;
        selectedVariants?: {
            groupName: string;
            variantName: string;
            priceAdjustment: number;
        }[];
        selectedAddons?: {
            groupName: string;
            addonName: string;
            price: number;
        }[];
        itemNotes?: string;
    }[];
    deliveryAddress: string;
    paymentMethod: 'CASH' | 'MOMO';
    notes?: string;
}): Promise<{
    vendor: {
        phone: string;
        businessName: string;
        logo: string | null;
    };
    items: ({
        product: {
            name: string;
            images: string[];
        };
    } & {
        id: string;
        orderId: string;
        productId: string;
        quantity: number;
        unitPrice: number;
        selectedVariants: import("@prisma/client/runtime/library").JsonValue | null;
        selectedAddons: import("@prisma/client/runtime/library").JsonValue | null;
        itemNotes: string | null;
    })[];
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
}>;
export declare function getOrderById(orderId: string, userId: string): Promise<{
    rider: {
        user: {
            name: string;
            phone: string;
        };
        currentLatitude: number | null;
        currentLongitude: number | null;
    } | null;
    vendor: {
        phone: string;
        businessName: string;
        address: string;
        logo: string | null;
    };
    customer: {
        name: string;
        phone: string;
    };
    items: ({
        product: {
            name: string;
            price: number;
            images: string[];
        };
    } & {
        id: string;
        orderId: string;
        productId: string;
        quantity: number;
        unitPrice: number;
        selectedVariants: import("@prisma/client/runtime/library").JsonValue | null;
        selectedAddons: import("@prisma/client/runtime/library").JsonValue | null;
        itemNotes: string | null;
    })[];
    transaction: {
        id: string;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        orderId: string;
        amount: number;
        recordedAt: Date;
    } | null;
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
}>;
export declare function updateOrderStatus(orderId: string, userId: string, newStatus: OrderStatus): Promise<{
    rider: {
        user: {
            name: string;
            phone: string;
        };
    } | null;
    vendor: {
        businessName: string;
    };
    items: ({
        product: {
            name: string;
        };
    } & {
        id: string;
        orderId: string;
        productId: string;
        quantity: number;
        unitPrice: number;
        selectedVariants: import("@prisma/client/runtime/library").JsonValue | null;
        selectedAddons: import("@prisma/client/runtime/library").JsonValue | null;
        itemNotes: string | null;
    })[];
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
}>;
export declare function cancelOrder(orderId: string, userId: string): Promise<{
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
}>;
export declare function getAllOrders(filters: {
    status?: OrderStatus;
    vendorId?: string;
    customerId?: string;
    page?: number;
    limit?: number;
}): Promise<{
    orders: ({
        rider: {
            user: {
                name: string;
                phone: string;
            };
        } | null;
        vendor: {
            businessName: string;
        };
        customer: {
            name: string;
            phone: string;
        };
        items: ({
            product: {
                name: string;
            };
        } & {
            id: string;
            orderId: string;
            productId: string;
            quantity: number;
            unitPrice: number;
            selectedVariants: import("@prisma/client/runtime/library").JsonValue | null;
            selectedAddons: import("@prisma/client/runtime/library").JsonValue | null;
            itemNotes: string | null;
        })[];
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
    })[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
