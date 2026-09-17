type DayHours = {
    start: string;
    end: string;
}[];
type WeeklyHours = Record<string, DayHours>;
export declare function isWithinHours(hours: WeeklyHours | null | undefined, at?: Date): boolean;
export {};
