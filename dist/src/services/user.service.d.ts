export declare function getUserById(id: string): Promise<{
    name: string;
    id: string;
    phone: string;
    email: string | null;
    role: import("@prisma/client").$Enums.Role;
    profileImage: string | null;
    status: import("@prisma/client").$Enums.UserStatus;
    createdAt: Date;
    rider: {
        id: string;
        bikeType: string;
        availability: import("@prisma/client").$Enums.RiderAvailability;
        totalDeliveries: number;
        rating: number;
        earnings: number;
    } | null;
    vendor: {
        id: string;
        status: import("@prisma/client").$Enums.VendorStatus;
        rating: number;
        businessName: string;
        businessType: string;
    } | null;
}>;
export declare function updateProfile(id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    profileImage?: string;
}): Promise<{
    name: string;
    id: string;
    phone: string;
    email: string | null;
    role: import("@prisma/client").$Enums.Role;
    profileImage: string | null;
    status: import("@prisma/client").$Enums.UserStatus;
}>;
export declare function changePassword(id: string, data: {
    currentPassword: string;
    newPassword: string;
}): Promise<{
    message: string;
}>;
export declare function getUserOrders(id: string): Promise<({
    rider: {
        user: {
            name: string;
            phone: string;
        };
    } | null;
    vendor: {
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
export declare function getUserDeliveries(id: string): Promise<({
    rider: {
        user: {
            name: string;
            phone: string;
        };
    } | null;
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
})[]>;
export declare function getUserErrands(id: string): Promise<{
    id: string;
    status: import("@prisma/client").$Enums.ErrandStatus;
    createdAt: Date;
    updatedAt: Date;
    customerId: string;
    description: string;
    instructions: string | null;
    budget: number;
    pickupLocation: string | null;
}[]>;
