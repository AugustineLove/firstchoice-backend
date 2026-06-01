export declare function registerVendor(userId: string, data: {
    businessName: string;
    businessType: string;
    address: string;
    phone: string;
    logo?: string;
    openingHours?: string;
}): Promise<{
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
}>;
export declare function getVendorProfile(vendorId: string): Promise<{
    user: {
        name: string;
        phone: string;
        email: string | null;
    };
    products: {
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
    }[];
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
}>;
export declare function getMyVendorProfile(userId: string): Promise<{
    products: {
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
    }[];
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
}>;
export declare function updateVendorProfile(userId: string, data: {
    businessName?: string;
    businessType?: string;
    address?: string;
    phone?: string;
    logo?: string;
    openingHours?: string;
}): Promise<{
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
}>;
export declare function getAllVendors(filters: {
    businessType?: string;
    search?: string;
}): Promise<{
    id: string;
    status: import("@prisma/client").$Enums.VendorStatus;
    rating: number;
    businessName: string;
    businessType: string;
    address: string;
    logo: string | null;
    openingHours: string | null;
}[]>;
export declare function getVendorOrders(userId: string): Promise<({
    rider: {
        user: {
            name: string;
            phone: string;
        };
    } | null;
    customer: {
        name: string;
        phone: string;
    };
    items: ({
        product: {
            name: string;
            price: number;
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
})[]>;
export declare function getVendorStats(userId: string): Promise<{
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    totalProducts: number;
    totalRevenue: number;
}>;
