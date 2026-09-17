import { Response } from 'express';
import { AuthRequest } from '../interface/auth-request.interface.ts';
export declare function submitRating(req: AuthRequest, res: Response): Promise<void>;
export declare function getRatingSummary(req: AuthRequest, res: Response): Promise<void>;
export declare function getRatings(req: AuthRequest, res: Response): Promise<void>;
