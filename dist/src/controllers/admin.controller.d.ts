import { Request, Response } from 'express';
export declare function getOverviewStats(req: Request, res: Response): Promise<void>;
export declare function getAllUsers(req: Request, res: Response): Promise<void>;
export declare function updateUserStatus(req: Request, res: Response): Promise<void>;
export declare function getAllVendors(req: Request, res: Response): Promise<void>;
export declare function updateVendorProfile(req: Request<{
    vendorId: string;
}>, res: Response): Promise<void>;
export declare function updateVendorStatus(req: Request, res: Response): Promise<void>;
export declare function addVendorProduct(req: Request<{
    vendorId: string;
}>, res: Response): Promise<void>;
export declare function deleteVendorProduct(req: Request<{
    productId: string;
}>, res: Response): Promise<void>;
export declare function getAllRiders(req: Request, res: Response): Promise<void>;
export declare function createVendor(req: Request, res: Response): Promise<void>;
export declare function assignRiderToOrder(req: Request, res: Response): Promise<void>;
export declare function getOrderAnalytics(req: Request, res: Response): Promise<void>;
export declare function getRiderAnalytics(req: Request, res: Response): Promise<void>;
