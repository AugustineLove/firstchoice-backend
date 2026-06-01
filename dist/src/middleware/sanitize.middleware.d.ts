import { Request, Response, NextFunction } from 'express';
export declare function sanitizeInput(req: Request, res: Response, next: NextFunction): void;
export declare function preventParamPollution(req: Request, res: Response, next: NextFunction): void;
