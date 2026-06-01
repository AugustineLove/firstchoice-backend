import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from '../interface/auth-request.interface.ts';
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function authorize(...roles: Role[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
