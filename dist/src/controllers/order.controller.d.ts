import { Request, Response } from 'express';
import { AuthRequest } from '../interface/auth-request.interface.ts';
export declare function placeOrder(req: AuthRequest, res: Response): Promise<void>;
export declare function getOrderById(req: AuthRequest, res: Response): Promise<void>;
export declare function updateOrderStatus(req: AuthRequest, res: Response): Promise<void>;
export declare function cancelOrder(req: AuthRequest, res: Response): Promise<void>;
export declare function getAllOrders(req: Request, res: Response): Promise<void>;
