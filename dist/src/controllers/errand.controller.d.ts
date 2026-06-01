import { Request, Response } from 'express';
import { AuthRequest } from '../interface/auth-request.interface.ts';
export declare function createErrand(req: AuthRequest, res: Response): Promise<void>;
export declare function getErrandById(req: AuthRequest, res: Response): Promise<void>;
export declare function updateErrandStatus(req: AuthRequest, res: Response): Promise<void>;
export declare function getAllErrands(req: Request, res: Response): Promise<void>;
