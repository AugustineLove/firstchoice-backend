import { ErrandStatus } from '@prisma/client';
export declare function createErrand(customerId: string, data: {
    description: string;
    instructions?: string;
    budget: number;
    pickupLocation?: string;
}): Promise<{
    id: string;
    status: import("@prisma/client").$Enums.ErrandStatus;
    createdAt: Date;
    updatedAt: Date;
    customerId: string;
    description: string;
    instructions: string | null;
    budget: number;
    pickupLocation: string | null;
}>;
export declare function getErrandById(errandId: string, userId: string): Promise<{
    customer: {
        name: string;
        phone: string;
    };
} & {
    id: string;
    status: import("@prisma/client").$Enums.ErrandStatus;
    createdAt: Date;
    updatedAt: Date;
    customerId: string;
    description: string;
    instructions: string | null;
    budget: number;
    pickupLocation: string | null;
}>;
export declare function updateErrandStatus(errandId: string, userId: string, newStatus: ErrandStatus): Promise<{
    customer: {
        name: string;
        phone: string;
    };
} & {
    id: string;
    status: import("@prisma/client").$Enums.ErrandStatus;
    createdAt: Date;
    updatedAt: Date;
    customerId: string;
    description: string;
    instructions: string | null;
    budget: number;
    pickupLocation: string | null;
}>;
export declare function getAllErrands(filters: {
    status?: ErrandStatus;
    page?: number;
    limit?: number;
}): Promise<{
    errands: ({
        customer: {
            name: string;
            phone: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.ErrandStatus;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        description: string;
        instructions: string | null;
        budget: number;
        pickupLocation: string | null;
    })[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
