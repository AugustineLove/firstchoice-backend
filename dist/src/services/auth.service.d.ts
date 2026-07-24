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
        id: any;
        name: any;
        phone: any;
        email: any;
        role: any;
        status: any;
        profileImage: any;
        hasVendorProfile: boolean;
    };
}>;
export declare function loginUser(data: {
    phone: string;
    password: string;
}): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
        id: any;
        name: any;
        phone: any;
        email: any;
        role: any;
        status: any;
        profileImage: any;
        hasVendorProfile: boolean;
    };
}>;
export declare function refreshAccessToken(token: string): Promise<{
    accessToken: string;
}>;
export declare function resetPassword(token: string, newPassword: string): Promise<{
    message: string;
}>;
export declare function resetPasswordEmail(phone: string): Promise<{
    message: string;
}>;
