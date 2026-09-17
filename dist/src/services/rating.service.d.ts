export declare function submitVendorRating(vendorId: string, customerId: string, rating: number, comment?: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    customerId: string;
    vendorId: string;
    rating: number;
    comment: string | null;
}>;
export declare function getVendorRatingSummary(vendorId: string, customerId?: string): Promise<{
    average: number;
    count: number;
    myRating: {
        rating: number;
        comment: string | null;
        createdAt: Date;
    } | null;
}>;
export declare function getVendorRatings(vendorId: string, page?: number, limit?: number): Promise<{
    ratings: ({
        customer: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        vendorId: string;
        rating: number;
        comment: string | null;
    })[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
