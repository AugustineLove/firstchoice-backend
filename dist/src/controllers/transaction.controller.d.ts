import { Request, Response } from 'express';
import { AuthRequest } from '../interface/auth-request.interface.ts';
export declare function recordTransaction(req: AuthRequest, res: Response): Promise<void>;
export declare function getTransactionByOrder(req: AuthRequest, res: Response): Promise<void>;
export declare function getAllTransactions(req: Request, res: Response): Promise<void>;
export declare function getTransactionSummary(req: Request, res: Response): Promise<void>;
