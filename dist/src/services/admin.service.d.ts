import { UserStatus, VendorStatus } from '@prisma/client';
export declare function getOverviewStats(): Promise<{
    users: {
        total: number;
    };
    riders: {
        total: number;
        active: number;
    };
    vendors: {
        total: number;
    };
    orders: {
        total: number;
        today: number;
        pending: number;
    };
    deliveries: {
        total: number;
        today: number;
    };
    errands: {
        total: number;
    };
    revenue: {
        total: number;
        today: number;
    };
}>;
export declare function getAllUsers(filters: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
}): Promise<{
    users: {
        name: string;
        id: string;
        phone: string;
        email: string | null;
        role: import("@prisma/client").$Enums.Role;
        profileImage: string | null;
        status: import("@prisma/client").$Enums.UserStatus;
        createdAt: Date;
        rider: {
            availability: import("@prisma/client").$Enums.RiderAvailability;
            totalDeliveries: number;
            rating: number;
        } | null;
        vendor: {
            status: import("@prisma/client").$Enums.VendorStatus;
            businessName: string;
        } | null;
    }[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
export declare function updateUserStatus(userId: string, status: UserStatus): Promise<{
    name: string;
    id: string;
    phone: string;
    role: import("@prisma/client").$Enums.Role;
    status: import("@prisma/client").$Enums.UserStatus;
}>;
export declare function getAllVendorsAdmin(filters: {
    status?: string;
    page?: number;
    limit?: number;
}): Promise<{
    vendors: ({
        user: {
            name: string;
            phone: string;
            email: string | null;
            status: import("@prisma/client").$Enums.UserStatus;
        };
        _count: {
            orders: number;
            products: number;
        };
    } & {
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
    })[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
export declare function updateVendorStatus(vendorId: string, status: VendorStatus): Promise<{
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
}>;
export declare function getAllRidersAdmin(filters: {
    availability?: string;
    page?: number;
    limit?: number;
}): Promise<{
    riders: ({
        user: {
            name: string;
            phone: string;
            email: string | null;
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
    })[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
export declare function assignRiderToOrder(orderId: string, riderId: string): Promise<{
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
}>;
export declare function getOrderAnalytics(): Promise<{
    byStatus: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.OrderGroupByOutputType, "orderStatus"[]> & {
        _count: {
            id: number;
        };
    })[];
    last7Days: {
        createdAt: Date;
        totalAmount: number;
        orderStatus: import("@prisma/client").$Enums.OrderStatus;
    }[];
    topVendors: {
        vendor: {
            id: string;
            businessName: string;
        } | undefined;
        vendorId: string;
        _count: {
            id: number;
        };
        _sum: {
            totalAmount: number | null;
        };
    }[];
}>;
export declare function getRiderAnalytics(): Promise<{
    topRiders: ({
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
    })[];
    availabilitySummary: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.RiderGroupByOutputType, "availability"[]> & {
        _count: {
            id: number;
        };
    })[];
}>;
export declare function createVendorWithOwner(data: {
    businessName: string;
    businessType: string;
    address: string;
    phone: string;
    openingHours?: string;
    logo?: string;
    ownerName: string;
    ownerPhone: string;
    ownerEmail?: string;
    password?: string;
}): Promise<{
    vendor: {
        user: {
            name: string;
            id: string;
            phone: string;
            email: string | null;
        };
    } & {
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
    tempPassword: string;
}>;
export declare function updateVendorProfile(vendorId: string, data: {
    businessName?: string;
    businessType?: string;
    address?: string;
    phone?: string;
    openingHours?: string;
    logo?: string;
}): Promise<{
    user: {
        name: string;
        phone: string;
        email: string | null;
    };
} & {
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
}>;
export declare function createProductForVendor(vendorId: string, data: {
    name: string;
    category: string;
    price: number;
    stock?: number;
    images?: string[];
    available?: boolean;
}): Promise<{
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
}>;
export declare function deleteProductAdmin(productId: string): Promise<{
    message: string;
}>;
