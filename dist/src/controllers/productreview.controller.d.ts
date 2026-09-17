import { Request, Response } from 'express';
import { AuthRequest } from '../interface/auth-request.interface.ts';
export declare function submitReview(req: AuthRequest, res: Response): Promise<void>;
export declare function getProductReviews(req: Request, res: Response): Promise<void>;
export declare function getProductReviewSummary(req: AuthRequest, res: Response): Promise<void>;
export declare function deleteReview(req: AuthRequest, res: Response): Promise<void>;
