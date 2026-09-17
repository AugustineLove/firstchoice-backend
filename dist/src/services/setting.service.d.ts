import { Prisma } from '@prisma/client';
import { TimeWindow } from '../utils/operatingHours.util';
export declare function invalidateSettingsCache(): void;
export declare function getSettings(): Promise<any>;
export declare function updateSettings(data: Partial<{
    errandPricingMode: 'FIXED' | 'PER_ITEM';
    errandFixedPrice: number;
    errandPerItemPrice: number;
    errandPickupLocationId: string | null;
    isClosed: boolean;
    closedMessage: string | null;
}>): Promise<{
    errandPickupLocation: {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        address: string;
        longitude: number;
        latitude: number;
        isActive: boolean;
    } | null;
} & {
    id: number;
    updatedAt: Date;
    errandPricingMode: import("@prisma/client").$Enums.ErrandPricingMode;
    errandFixedPrice: number;
    errandPerItemPrice: number;
    errandPickupLocationId: string | null;
    operatingHours: Prisma.JsonValue | null;
    overrideActive: boolean;
    overrideExpiresAt: Date | null;
    isClosed: boolean;
    closedMessage: string | null;
}>;
export declare function getErrandPricingForCustomers(): Promise<{
    pricingMode: any;
    fixedPrice: any;
    perItemPrice: any;
    pickupLocation: {
        id: any;
        name: any;
        address: any;
        latitude: any;
        longitude: any;
    } | null;
}>;
export declare function updateOperatingHours(hours: Record<string, TimeWindow[]>): Promise<{
    id: number;
    updatedAt: Date;
    errandPricingMode: import("@prisma/client").$Enums.ErrandPricingMode;
    errandFixedPrice: number;
    errandPerItemPrice: number;
    errandPickupLocationId: string | null;
    operatingHours: Prisma.JsonValue | null;
    overrideActive: boolean;
    overrideExpiresAt: Date | null;
    isClosed: boolean;
    closedMessage: string | null;
}>;
export declare function getOperatingStatus(): Promise<{
    open: boolean;
    overrideActive: boolean;
    overrideExpiresAt: null;
    hours: any;
    isClosed: boolean;
    closedMessage: any;
    nextWindow?: undefined;
} | {
    open: boolean;
    overrideActive: boolean;
    overrideExpiresAt: any;
    hours: any;
    isClosed: boolean;
    closedMessage: null;
    nextWindow?: undefined;
} | {
    open: boolean;
    overrideActive: boolean;
    overrideExpiresAt: null;
    nextWindow: TimeWindow | undefined;
    hours: Record<string, TimeWindow[]>;
    isClosed: boolean;
    closedMessage: null;
}>;
export declare function setOperatingOverride(durationMinutes: number): Promise<{
    id: number;
    updatedAt: Date;
    errandPricingMode: import("@prisma/client").$Enums.ErrandPricingMode;
    errandFixedPrice: number;
    errandPerItemPrice: number;
    errandPickupLocationId: string | null;
    operatingHours: Prisma.JsonValue | null;
    overrideActive: boolean;
    overrideExpiresAt: Date | null;
    isClosed: boolean;
    closedMessage: string | null;
}>;
export declare function clearOperatingOverride(): Promise<{
    id: number;
    updatedAt: Date;
    errandPricingMode: import("@prisma/client").$Enums.ErrandPricingMode;
    errandFixedPrice: number;
    errandPerItemPrice: number;
    errandPickupLocationId: string | null;
    operatingHours: Prisma.JsonValue | null;
    overrideActive: boolean;
    overrideExpiresAt: Date | null;
    isClosed: boolean;
    closedMessage: string | null;
}>;
export declare function updateClosingStatus(isClosed: boolean, closedMessage: string | null): Promise<{
    id: number;
    updatedAt: Date;
    errandPricingMode: import("@prisma/client").$Enums.ErrandPricingMode;
    errandFixedPrice: number;
    errandPerItemPrice: number;
    errandPickupLocationId: string | null;
    operatingHours: Prisma.JsonValue | null;
    overrideActive: boolean;
    overrideExpiresAt: Date | null;
    isClosed: boolean;
    closedMessage: string | null;
}>;
