import { Response } from 'express';
import { AuthRequest } from '../interface/auth-request.interface.ts';
export declare function getMe(req: AuthRequest, res: Response): Promise<void>;
export declare function updateProfile(req: AuthRequest, res: Response): Promise<void>;
export declare function uploadAvatar(req: AuthRequest, res: Response): Promise<void>;
export declare function changePassword(req: AuthRequest, res: Response): Promise<void>;
export declare function getMyOrders(req: AuthRequest, res: Response): Promise<void>;
export declare function getMyDeliveries(req: AuthRequest, res: Response): Promise<void>;
export declare function getMyErrands(req: AuthRequest, res: Response): Promise<void>;
