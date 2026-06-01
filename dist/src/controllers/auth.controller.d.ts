import { Request, Response } from 'express';
import { AuthRequest } from '../interface/auth-request.interface.ts';
export declare function register(req: Request, res: Response): Promise<void>;
export declare function login(req: Request, res: Response): Promise<void>;
export declare function refresh(req: Request, res: Response): Promise<void>;
export declare function me(req: AuthRequest, res: Response): Promise<void>;
