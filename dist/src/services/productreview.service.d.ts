interface CreateReviewInput {
    rating: number;
    comment?: string;
    images?: string[];
    orderId?: string;
}
export declare function submitReview(userId: string, productId: string, data: CreateReviewInput): Promise<{
    customer: {
        name: string;
        id: string;
        profileImage: string | null;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    customerId: string;
    rating: number;
    comment: string | null;
    productId: string;
    orderId: string | null;
    images: string[];
}>;
export declare function getProductReviews(productId: string, limit?: number): Promise<({
    customer: {
        name: string;
        id: string;
        profileImage: string | null;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    customerId: string;
    rating: number;
    comment: string | null;
    productId: string;
    orderId: string | null;
    images: string[];
})[]>;
export declare function getProductReviewSummary(productId: string, userId?: string): Promise<{
    average: number;
    count: number;
    breakdown: Record<3 | 1 | 5 | 2 | 4, number>;
    myReview: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        rating: number;
        comment: string | null;
        productId: string;
        orderId: string | null;
        images: string[];
    } | null;
}>;
export declare function deleteReview(userId: string, reviewId: string): Promise<{
    message: string;
}>;
export {};
