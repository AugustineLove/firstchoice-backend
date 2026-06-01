import { Request, Response } from 'express';
import { AuthRequest } from '../interface/auth-request.interface.ts';
export declare function registerVendor(req: AuthRequest, res: Response): Promise<void>;
export declare function getMyVendorProfile(req: AuthRequest, res: Response): Promise<void>;
export declare function updateVendorProfile(req: AuthRequest, res: Response): Promise<void>;
export declare function getAllVendors(req: Request, res: Response): Promise<void>;
export declare function getVendorById(req: Request, res: Response): Promise<void>;
export declare function getVendorOrders(req: AuthRequest, res: Response): Promise<void>;
export declare function getVendorStats(req: AuthRequest, res: Response): Promise<void>;
