export declare function registerRider(userId: string, data: {
    bikeType: string;
    licenseNumber?: string;
}): Promise<{
    id: string;
    createdAt: Date;
    rating: number;
    userId: string;
    bikeType: string;
    licenseNumber: string | null;
    availability: import("@prisma/client").$Enums.RiderAvailability;
    currentLatitude: number | null;
    currentLongitude: number | null;
    totalDeliveries: number;
    earnings: number;
}>;
export declare function getRiderProfile(riderId: string): Promise<{
    user: {
        name: string;
        phone: string;
        email: string | null;
        profileImage: string | null;
        status: import("@prisma/client").$Enums.UserStatus;
    };
} & {
    id: string;
    createdAt: Date;
    rating: number;
    userId: string;
    bikeType: string;
    licenseNumber: string | null;
    availability: import("@prisma/client").$Enums.RiderAvailability;
    currentLatitude: number | null;
    currentLongitude: number | null;
    totalDeliveries: number;
    earnings: number;
}>;
export declare function getMyRiderProfile(userId: string): Promise<{
    user: {
        name: string;
        phone: string;
        email: string | null;
        profileImage: string | null;
    };
} & {
    id: string;
    createdAt: Date;
    rating: number;
    userId: string;
    bikeType: string;
    licenseNumber: string | null;
    availability: import("@prisma/client").$Enums.RiderAvailability;
    currentLatitude: number | null;
    currentLongitude: number | null;
    totalDeliveries: number;
    earnings: number;
}>;
export declare function toggleAvailability(userId: string, availability: 'ONLINE' | 'OFFLINE'): Promise<{
    id: string;
    createdAt: Date;
    rating: number;
    userId: string;
    bikeType: string;
    licenseNumber: string | null;
    availability: import("@prisma/client").$Enums.RiderAvailability;
    currentLatitude: number | null;
    currentLongitude: number | null;
    totalDeliveries: number;
    earnings: number;
}>;
export declare function updateRiderLocation(userId: string, data: {
    latitude: number;
    longitude: number;
}): Promise<{
    id: string;
    createdAt: Date;
    rating: number;
    userId: string;
    bikeType: string;
    licenseNumber: string | null;
    availability: import("@prisma/client").$Enums.RiderAvailability;
    currentLatitude: number | null;
    currentLongitude: number | null;
    totalDeliveries: number;
    earnings: number;
}>;
export declare function getAvailableRiders(): Promise<({
    user: {
        name: string;
        phone: string;
        profileImage: string | null;
    };
} & {
    id: string;
    createdAt: Date;
    rating: number;
    userId: string;
    bikeType: string;
    licenseNumber: string | null;
    availability: import("@prisma/client").$Enums.RiderAvailability;
    currentLatitude: number | null;
    currentLongitude: number | null;
    totalDeliveries: number;
    earnings: number;
})[]>;
export declare function getRiderEarnings(userId: string): Promise<{
    rating: number;
    allTime: {
        total: number;
        orders: number;
        deliveries: number;
        ordersCount: number;
        deliveriesCount: number;
    };
    today: {
        total: number;
        orders: number;
        deliveries: number;
        ordersCount: number;
        deliveriesCount: number;
    };
}>;
export declare function getRiderActiveJobs(userId: string): Promise<{
    activeOrders: ({
        vendor: {
            businessName: string;
            address: string;
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
            productId: string;
            orderId: string;
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
    activeDeliveries: ({
        customer: {
            name: string;
            phone: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.DeliveryStatus;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        deliveryFee: number;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        recipientName: string | null;
        recipientPhone: string | null;
        imageUrl: string | null;
        pickupLatitude: number | null;
        pickupLongitude: number | null;
        assignedRiderId: string | null;
        type: import("@prisma/client").$Enums.DeliveryKind;
        pickupAddress: string;
        destinationAddress: string;
        destinationLatitude: number | null;
        destinationLongitude: number | null;
        itemDescription: string;
        errandItems: import("@prisma/client/runtime/library").JsonValue | null;
        itemsEstimatedTotal: number;
        errandFee: number;
        estimatedFee: number;
    })[];
}>;
export declare function getRiderJobHistory(userId: string): Promise<{
    completedOrders: ({
        vendor: {
            businessName: string;
            address: string;
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
    completedDeliveries: ({
        customer: {
            name: string;
            phone: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.DeliveryStatus;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        deliveryFee: number;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        recipientName: string | null;
        recipientPhone: string | null;
        imageUrl: string | null;
        pickupLatitude: number | null;
        pickupLongitude: number | null;
        assignedRiderId: string | null;
        type: import("@prisma/client").$Enums.DeliveryKind;
        pickupAddress: string;
        destinationAddress: string;
        destinationLatitude: number | null;
        destinationLongitude: number | null;
        itemDescription: string;
        errandItems: import("@prisma/client/runtime/library").JsonValue | null;
        itemsEstimatedTotal: number;
        errandFee: number;
        estimatedFee: number;
    })[];
}>;
export declare function getRiderInsights(riderId: string): Promise<{
    profile: {
        id: string;
        name: string;
        phone: string;
        email: string | null;
        profileImage: string | null;
        accountStatus: import("@prisma/client").$Enums.UserStatus;
        joined: Date;
        bikeType: string;
        licenseNumber: string | null;
        availability: import("@prisma/client").$Enums.RiderAvailability;
        rating: number;
        currentLatitude: number | null;
        currentLongitude: number | null;
    };
    summary: {
        totalEarnings: number;
        todayEarnings: number;
        weekEarnings: number;
        totalJobsEver: number;
        totalDelivered: number;
        totalCancelled: number;
        completionRate: number;
        activeJobs: number;
    };
    charts: {
        dailyEarnings: {
            date: string;
            orders: number;
            deliveries: number;
            total: number;
            jobCount: number;
        }[];
        weekdayBreakdown: {
            day: string;
            jobs: number;
        }[];
        jobTypeBreakdown: {
            type: string;
            count: number;
        }[];
        statusBreakdown: {
            status: string;
            count: number;
        }[];
    };
    recentActivity: ({
        id: string;
        kind: "order";
        status: import("@prisma/client").$Enums.OrderStatus;
        amount: number;
        counterparty: string;
        note: string;
        date: Date;
    } | {
        id: string;
        kind: "delivery";
        status: import("@prisma/client").$Enums.DeliveryStatus;
        amount: number;
        counterparty: string;
        note: import("@prisma/client").$Enums.DeliveryKind;
        date: Date;
    })[];
}>;
export declare function getRiderJobsPaginated(riderId: string, filters: {
    page?: number;
    limit?: number;
    kind?: 'order' | 'delivery';
    status?: string;
}): Promise<{
    jobs: ({
        id: string;
        kind: "order";
        status: import("@prisma/client").$Enums.OrderStatus;
        amount: number;
        totalAmount: number;
        customer: {
            name: string;
            phone: string;
        };
        counterparty: string;
        from: string | null;
        to: string;
        createdAt: Date;
        updatedAt: Date;
    } | {
        id: string;
        kind: "delivery";
        status: import("@prisma/client").$Enums.DeliveryStatus;
        amount: number;
        totalAmount: number;
        customer: {
            name: string;
            phone: string;
        };
        counterparty: import("@prisma/client").$Enums.DeliveryKind;
        from: string;
        to: string;
        createdAt: Date;
        updatedAt: Date;
    })[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
