import { Role } from '@prisma/client';
export declare function registerUser(data: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    role?: Role;
}): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
        name: string;
        id: string;
        phone: string;
        email: string | null;
        role: import("@prisma/client").$Enums.Role;
        status: import("@prisma/client").$Enums.UserStatus;
        createdAt: Date;
    };
}>;
export declare function loginUser(data: {
    phone: string;
    password: string;
}): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        name: string;
        phone: string;
        email: string | null;
        role: import("@prisma/client").$Enums.Role;
        status: "ACTIVE" | "PENDING";
    };
}>;
export declare function refreshAccessToken(token: string): Promise<{
    accessToken: string;
}>;
