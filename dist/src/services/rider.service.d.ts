export declare function registerRider(userId: string, data: {
    bikeType: string;
    licenseNumber?: string;
}): Promise<{
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
    userId: string;
    bikeType: string;
    licenseNumber: string | null;
    availability: import("@prisma/client").$Enums.RiderAvailability;
    currentLatitude: number | null;
    currentLongitude: number | null;
    totalDeliveries: number;
    rating: number;
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
    userId: string;
    bikeType: string;
    licenseNumber: string | null;
    availability: import("@prisma/client").$Enums.RiderAvailability;
    currentLatitude: number | null;
    currentLongitude: number | null;
    totalDeliveries: number;
    rating: number;
    earnings: number;
}>;
export declare function toggleAvailability(userId: string, availability: 'ONLINE' | 'OFFLINE'): Promise<{
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
}>;
export declare function updateRiderLocation(userId: string, data: {
    latitude: number;
    longitude: number;
}): Promise<{
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
    userId: string;
    bikeType: string;
    licenseNumber: string | null;
    availability: import("@prisma/client").$Enums.RiderAvailability;
    currentLatitude: number | null;
    currentLongitude: number | null;
    totalDeliveries: number;
    rating: number;
    earnings: number;
})[]>;
export declare function getRiderEarnings(userId: string): Promise<{
    totalEarnings: number;
    totalDeliveries: number;
    rating: number;
    completedOrders: number;
    completedDeliveries: number;
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
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        recipientName: string | null;
        recipientPhone: string | null;
        imageUrl: string | null;
        pickupLatitude: number | null;
        pickupLongitude: number | null;
        assignedRiderId: string | null;
        pickupAddress: string;
        destinationAddress: string;
        destinationLatitude: number | null;
        destinationLongitude: number | null;
        itemDescription: string;
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
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        recipientName: string | null;
        recipientPhone: string | null;
        imageUrl: string | null;
        pickupLatitude: number | null;
        pickupLongitude: number | null;
        assignedRiderId: string | null;
        pickupAddress: string;
        destinationAddress: string;
        destinationLatitude: number | null;
        destinationLongitude: number | null;
        itemDescription: string;
        estimatedFee: number;
    })[];
}>;
