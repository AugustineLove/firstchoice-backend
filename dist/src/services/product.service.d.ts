interface VariantGroupInput {
    name: string;
    required?: boolean;
    variants: {
        name: string;
        priceAdjustment?: number;
        available?: boolean;
        images?: string[];
    }[];
}
type IncrementMode = 'multiple' | 'free' | 'halves' | 'custom';
interface AddonInput {
    name: string;
    price?: number;
    available?: boolean;
    incrementable?: boolean;
    incrementMode?: IncrementMode | string;
    customIncrementValue?: number;
}
interface AddonGroupInput {
    name: string;
    minSelect?: number;
    maxSelect?: number;
    addons: AddonInput[];
    incrementable?: boolean;
    incrementMode?: string;
    customIncrementValue?: number;
}
interface AttributeInput {
    key: string;
    value: string;
}
interface CreateProductInput {
    name: string;
    description?: string;
    price: number;
    stock: number;
    images?: string[];
    category: string;
    available?: boolean;
    preparationTime?: number;
    calories?: number;
    weight?: number;
    volume?: number;
    unit?: string;
    brand?: string;
    expiryInfo?: string;
    sku?: string;
    sizes?: string[];
    colors?: string[];
    tags?: string[];
    isPopular?: boolean;
    isFeatured?: boolean;
    variantGroups?: VariantGroupInput[];
    addonGroups?: AddonGroupInput[];
    attributes?: AttributeInput[];
}
export declare function createProduct(userId: string, data: CreateProductInput): Promise<{
    vendor: {
        id: string;
        phone: string;
        rating: number;
        businessName: string;
        businessType: string;
        address: string;
        logo: string | null;
    };
    variantGroups: ({
        variants: {
            name: string;
            id: string;
            images: string[];
            available: boolean;
            groupId: string;
            priceAdjustment: number;
        }[];
    } & {
        name: string;
        id: string;
        productId: string;
        required: boolean;
    })[];
    addonGroups: ({
        addons: {
            name: string;
            id: string;
            price: number;
            available: boolean;
            incrementable: boolean;
            incrementMode: string | null;
            customIncrementValue: number | null;
            groupId: string;
        }[];
    } & {
        name: string;
        id: string;
        productId: string;
        minSelect: number;
        maxSelect: number;
        incrementable: boolean;
        incrementMode: string | null;
        customIncrementValue: number | null;
    })[];
    attributes: {
        id: string;
        productId: string;
        key: string;
        value: string;
    }[];
} & {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    vendorId: string;
    description: string | null;
    images: string[];
    price: number;
    stock: number;
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
export declare function updateProduct(userId: string, productId: string, data: Partial<CreateProductInput>): Promise<({
    vendor: {
        id: string;
        phone: string;
        rating: number;
        businessName: string;
        businessType: string;
        address: string;
        logo: string | null;
    };
    variantGroups: ({
        variants: {
            name: string;
            id: string;
            images: string[];
            available: boolean;
            groupId: string;
            priceAdjustment: number;
        }[];
    } & {
        name: string;
        id: string;
        productId: string;
        required: boolean;
    })[];
    addonGroups: ({
        addons: {
            name: string;
            id: string;
            price: number;
            available: boolean;
            incrementable: boolean;
            incrementMode: string | null;
            customIncrementValue: number | null;
            groupId: string;
        }[];
    } & {
        name: string;
        id: string;
        productId: string;
        minSelect: number;
        maxSelect: number;
        incrementable: boolean;
        incrementMode: string | null;
        customIncrementValue: number | null;
    })[];
    attributes: {
        id: string;
        productId: string;
        key: string;
        value: string;
    }[];
} & {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    vendorId: string;
    description: string | null;
    images: string[];
    price: number;
    stock: number;
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
}) | null>;
export declare function deleteProduct(userId: string, productId: string): Promise<{
    message: string;
}>;
export declare function getProductById(productId: string): Promise<{
    vendor: {
        id: string;
        phone: string;
        rating: number;
        businessName: string;
        businessType: string;
        address: string;
        logo: string | null;
    };
    variantGroups: ({
        variants: {
            name: string;
            id: string;
            images: string[];
            available: boolean;
            groupId: string;
            priceAdjustment: number;
        }[];
    } & {
        name: string;
        id: string;
        productId: string;
        required: boolean;
    })[];
    addonGroups: ({
        addons: {
            name: string;
            id: string;
            price: number;
            available: boolean;
            incrementable: boolean;
            incrementMode: string | null;
            customIncrementValue: number | null;
            groupId: string;
        }[];
    } & {
        name: string;
        id: string;
        productId: string;
        minSelect: number;
        maxSelect: number;
        incrementable: boolean;
        incrementMode: string | null;
        customIncrementValue: number | null;
    })[];
    attributes: {
        id: string;
        productId: string;
        key: string;
        value: string;
    }[];
} & {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    vendorId: string;
    description: string | null;
    images: string[];
    price: number;
    stock: number;
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
export declare function getProductsByVendor(vendorId: string): Promise<({
    vendor: {
        id: string;
        phone: string;
        rating: number;
        businessName: string;
        businessType: string;
        address: string;
        logo: string | null;
    };
    variantGroups: ({
        variants: {
            name: string;
            id: string;
            images: string[];
            available: boolean;
            groupId: string;
            priceAdjustment: number;
        }[];
    } & {
        name: string;
        id: string;
        productId: string;
        required: boolean;
    })[];
    addonGroups: ({
        addons: {
            name: string;
            id: string;
            price: number;
            available: boolean;
            incrementable: boolean;
            incrementMode: string | null;
            customIncrementValue: number | null;
            groupId: string;
        }[];
    } & {
        name: string;
        id: string;
        productId: string;
        minSelect: number;
        maxSelect: number;
        incrementable: boolean;
        incrementMode: string | null;
        customIncrementValue: number | null;
    })[];
    attributes: {
        id: string;
        productId: string;
        key: string;
        value: string;
    }[];
} & {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    vendorId: string;
    description: string | null;
    images: string[];
    price: number;
    stock: number;
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
})[]>;
export declare function getMyProducts(userId: string): Promise<({
    vendor: {
        id: string;
        phone: string;
        rating: number;
        businessName: string;
        businessType: string;
        address: string;
        logo: string | null;
    };
    variantGroups: ({
        variants: {
            name: string;
            id: string;
            images: string[];
            available: boolean;
            groupId: string;
            priceAdjustment: number;
        }[];
    } & {
        name: string;
        id: string;
        productId: string;
        required: boolean;
    })[];
    addonGroups: ({
        addons: {
            name: string;
            id: string;
            price: number;
            available: boolean;
            incrementable: boolean;
            incrementMode: string | null;
            customIncrementValue: number | null;
            groupId: string;
        }[];
    } & {
        name: string;
        id: string;
        productId: string;
        minSelect: number;
        maxSelect: number;
        incrementable: boolean;
        incrementMode: string | null;
        customIncrementValue: number | null;
    })[];
    attributes: {
        id: string;
        productId: string;
        key: string;
        value: string;
    }[];
} & {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    vendorId: string;
    description: string | null;
    images: string[];
    price: number;
    stock: number;
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
})[]>;
export declare function searchProducts(query: string, category?: string): Promise<({
    vendor: {
        id: string;
        phone: string;
        rating: number;
        businessName: string;
        businessType: string;
        address: string;
        logo: string | null;
    };
    variantGroups: ({
        variants: {
            name: string;
            id: string;
            images: string[];
            available: boolean;
            groupId: string;
            priceAdjustment: number;
        }[];
    } & {
        name: string;
        id: string;
        productId: string;
        required: boolean;
    })[];
    addonGroups: ({
        addons: {
            name: string;
            id: string;
            price: number;
            available: boolean;
            incrementable: boolean;
            incrementMode: string | null;
            customIncrementValue: number | null;
            groupId: string;
        }[];
    } & {
        name: string;
        id: string;
        productId: string;
        minSelect: number;
        maxSelect: number;
        incrementable: boolean;
        incrementMode: string | null;
        customIncrementValue: number | null;
    })[];
    attributes: {
        id: string;
        productId: string;
        key: string;
        value: string;
    }[];
} & {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    vendorId: string;
    description: string | null;
    images: string[];
    price: number;
    stock: number;
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
})[]>;
export declare function addAddonGroup(userId: string, productId: string, data: AddonGroupInput): Promise<{
    addons: {
        name: string;
        id: string;
        price: number;
        available: boolean;
        incrementable: boolean;
        incrementMode: string | null;
        customIncrementValue: number | null;
        groupId: string;
    }[];
} & {
    name: string;
    id: string;
    productId: string;
    minSelect: number;
    maxSelect: number;
    incrementable: boolean;
    incrementMode: string | null;
    customIncrementValue: number | null;
}>;
export declare function deleteAddonGroup(userId: string, groupId: string): Promise<{
    message: string;
}>;
export declare function addVariantGroup(userId: string, productId: string, data: VariantGroupInput): Promise<{
    variants: {
        name: string;
        id: string;
        images: string[];
        available: boolean;
        groupId: string;
        priceAdjustment: number;
    }[];
} & {
    name: string;
    id: string;
    productId: string;
    required: boolean;
}>;
export declare function calculateAddonPrice(addon: {
    price: number;
    incrementable: boolean;
    incrementMode: string | null;
    customIncrementValue: number | null;
}, qty: number): number;
export {};
