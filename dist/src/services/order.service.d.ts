import { OrderStatus } from '@prisma/client';
export declare function placeOrder(customerId: string, data: {
    vendorId: string;
    items?: {
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
    subtotal?: any;
    note?: string;
    recipientName?: string;
    recipientPhone?: string;
    deliveryAddress: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    paymentMethod: 'CASH' | 'MOMO';
    notes?: string;
}): Promise<{
    vendor: {
        phone: string;
        businessName: string;
        logo: string | null;
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
    recipientName: string | null;
    recipientPhone: string | null;
    deliveryAddress: string;
    imageUrl: string | null;
    vendorAddress: string | null;
    notes: string | null;
    deliveryLatitude: number | null;
    deliveryLongitude: number | null;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
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
    recipientName: string | null;
    recipientPhone: string | null;
    deliveryAddress: string;
    imageUrl: string | null;
    vendorAddress: string | null;
    notes: string | null;
    deliveryLatitude: number | null;
    deliveryLongitude: number | null;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
}>;
export declare function updateOrderStatus(orderId: string, userId: string, newStatus: OrderStatus): Promise<({
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
    recipientName: string | null;
    recipientPhone: string | null;
    deliveryAddress: string;
    imageUrl: string | null;
    vendorAddress: string | null;
    notes: string | null;
    deliveryLatitude: number | null;
    deliveryLongitude: number | null;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
}) | undefined>;
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
    recipientName: string | null;
    recipientPhone: string | null;
    deliveryAddress: string;
    imageUrl: string | null;
    vendorAddress: string | null;
    notes: string | null;
    deliveryLatitude: number | null;
    deliveryLongitude: number | null;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
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
        recipientName: string | null;
        recipientPhone: string | null;
        deliveryAddress: string;
        imageUrl: string | null;
        vendorAddress: string | null;
        notes: string | null;
        deliveryLatitude: number | null;
        deliveryLongitude: number | null;
        pickupLatitude: number | null;
        pickupLongitude: number | null;
    })[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
export declare function getOrdersReadyForPickup(): Promise<({
    rider: {
        id: string;
        createdAt: Date;
        userId: string;
        bikeType: string;
        licenseNumber: string | null;
        availability: import("@prisma/client").$Enums.RiderAvailability;
        currentLatitude: number | null;
        currentLongitude: number | null;
        totalDeliveries: number;
        rating: number;
        earnings: number;
    } | null;
    vendor: {
        id: string;
        phone: string;
        status: import("@prisma/client").$Enums.VendorStatus;
        createdAt: Date;
        userId: string;
        rating: number;
        businessName: string;
        businessType: string;
        address: string;
        logo: string | null;
        openingHours: string | null;
        longitude: string | null;
        latitude: string | null;
    };
    customer: {
        name: string;
        id: string;
        phone: string;
        email: string | null;
        passwordHash: string;
        role: import("@prisma/client").$Enums.Role;
        profileImage: string | null;
        status: import("@prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        fcmToken: string | null;
        fcmUpdatedAt: Date | null;
        resetPasswordToken: string | null;
        resetPasswordExpiry: Date | null;
        firebaseUid: string | null;
    };
    items: ({
        product: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            vendorId: string;
            description: string | null;
            price: number;
            stock: number;
            images: string[];
            category: string;
            available: boolean;
            preparationTime: number | null;
            calories: number | null;
            weight: number | null;
            volume: number | null;
            unit: string | null;
            brand: string | null;
            expiryInfo: string | null;
            sku: string | null;
            sizes: string[];
            colors: string[];
            tags: string[];
            isPopular: boolean;
            isFeatured: boolean;
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
    recipientName: string | null;
    recipientPhone: string | null;
    deliveryAddress: string;
    imageUrl: string | null;
    vendorAddress: string | null;
    notes: string | null;
    deliveryLatitude: number | null;
    deliveryLongitude: number | null;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
})[]>;
export declare function riderAcceptOrder(orderId: string, riderUserId: string): Promise<{
    rider: ({
        user: {
            name: string;
            phone: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        bikeType: string;
        licenseNumber: string | null;
        availability: import("@prisma/client").$Enums.RiderAvailability;
        currentLatitude: number | null;
        currentLongitude: number | null;
        totalDeliveries: number;
        rating: number;
        earnings: number;
    }) | null;
    vendor: {
        businessName: string;
        address: string;
    };
    customer: {
        name: string;
        id: string;
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
    recipientName: string | null;
    recipientPhone: string | null;
    deliveryAddress: string;
    imageUrl: string | null;
    vendorAddress: string | null;
    notes: string | null;
    deliveryLatitude: number | null;
    deliveryLongitude: number | null;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
}>;
export declare function attachOrderImage(orderId: string, customerId: string, imageBuffer: Buffer): Promise<{
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
    recipientName: string | null;
    recipientPhone: string | null;
    deliveryAddress: string;
    imageUrl: string | null;
    vendorAddress: string | null;
    notes: string | null;
    deliveryLatitude: number | null;
    deliveryLongitude: number | null;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
}>;
