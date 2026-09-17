export interface TimeWindow {
    start: string;
    end: string;
}
export declare const TIMEZONE = "Africa/Accra";
export declare const DEFAULT_OPERATING_HOURS: Record<string, TimeWindow[]>;
export declare function getAccraDayAndMinutes(): {
    day: number;
    minutes: number;
};
export declare function toMinutes(hhmm: string): number;
export declare function formatTime(hhmm: string): string;
export declare function isWithinOperatingHours(hours: Record<string, TimeWindow[]>): {
    open: boolean;
    nextWindow?: TimeWindow;
};
export declare function validateOperatingHours(hours: unknown): hours is Record<string, TimeWindow[]>;
