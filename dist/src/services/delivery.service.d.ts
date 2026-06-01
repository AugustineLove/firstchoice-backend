import { DeliveryStatus } from '@prisma/client';
export declare function getDeliveryById(deliveryId: string, userId: string): Promise<{
    rider: ({
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
    }) | null;
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
    assignedRiderId: string | null;
    pickupAddress: string;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
    destinationAddress: string;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
    itemDescription: string;
    estimatedFee: number;
}>;
export declare function assignRiderToDelivery(deliveryId: string, riderId: string): Promise<{
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
    assignedRiderId: string | null;
    pickupAddress: string;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
    destinationAddress: string;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
    itemDescription: string;
    estimatedFee: number;
}>;
export declare function getAllDeliveries(filters: {
    status?: DeliveryStatus;
    page?: number;
    limit?: number;
}): Promise<{
    deliveries: ({
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
        assignedRiderId: string | null;
        pickupAddress: string;
        pickupLatitude: number | null;
        pickupLongitude: number | null;
        destinationAddress: string;
        destinationLatitude: number | null;
        destinationLongitude: number | null;
        itemDescription: string;
        estimatedFee: number;
    })[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
export declare function getAllLocations(): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    address: string;
    latitude: number;
    longitude: number;
    isActive: boolean;
}[]>;
export declare function searchLocations(query: string): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    address: string;
    latitude: number;
    longitude: number;
    isActive: boolean;
}[]>;
export declare function createLocation(data: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
}): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    address: string;
    latitude: number;
    longitude: number;
    isActive: boolean;
}>;
export declare function updateLocation(id: string, data: Partial<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    isActive: boolean;
}>): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    address: string;
    latitude: number;
    longitude: number;
    isActive: boolean;
}>;
export declare function deleteLocation(id: string): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    address: string;
    latitude: number;
    longitude: number;
    isActive: boolean;
}>;
export declare function createDeliveryRequest(customerId: string, data: {
    pickupAddress: string;
    pickupLatitude?: number;
    pickupLongitude?: number;
    destinationAddress: string;
    destinationLatitude?: number;
    destinationLongitude?: number;
    itemDescription: string;
    paymentMethod: 'CASH' | 'MOMO';
}): Promise<{
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
    assignedRiderId: string | null;
    pickupAddress: string;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
    destinationAddress: string;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
    itemDescription: string;
    estimatedFee: number;
}>;
export declare function riderAcceptDelivery(deliveryId: string, riderUserId: string): Promise<{
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
    customer: {
        name: string;
        id: string;
        phone: string;
    };
} & {
    id: string;
    status: import("@prisma/client").$Enums.DeliveryStatus;
    createdAt: Date;
    updatedAt: Date;
    customerId: string;
    paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
    assignedRiderId: string | null;
    pickupAddress: string;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
    destinationAddress: string;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
    itemDescription: string;
    estimatedFee: number;
}>;
export declare function updateDeliveryStatus(deliveryId: string, userId: string, newStatus: DeliveryStatus): Promise<{
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
    customer: {
        name: string;
        id: string;
        phone: string;
    };
} & {
    id: string;
    status: import("@prisma/client").$Enums.DeliveryStatus;
    createdAt: Date;
    updatedAt: Date;
    customerId: string;
    paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
    assignedRiderId: string | null;
    pickupAddress: string;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
    destinationAddress: string;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
    itemDescription: string;
    estimatedFee: number;
}>;
export declare function getPendingDeliveries(): Promise<({
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
    assignedRiderId: string | null;
    pickupAddress: string;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
    destinationAddress: string;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
    itemDescription: string;
    estimatedFee: number;
})[]>;
export declare function getRiderJobs(riderUserId: string): Promise<{
    active: ({
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
        assignedRiderId: string | null;
        pickupAddress: string;
        pickupLatitude: number | null;
        pickupLongitude: number | null;
        destinationAddress: string;
        destinationLatitude: number | null;
        destinationLongitude: number | null;
        itemDescription: string;
        estimatedFee: number;
    })[];
    history: ({
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
        assignedRiderId: string | null;
        pickupAddress: string;
        pickupLatitude: number | null;
        pickupLongitude: number | null;
        destinationAddress: string;
        destinationLatitude: number | null;
        destinationLongitude: number | null;
        itemDescription: string;
        estimatedFee: number;
    })[];
}>;
