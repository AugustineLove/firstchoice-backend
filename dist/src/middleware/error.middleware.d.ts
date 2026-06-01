import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode: number);
}
export declare function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void;
export declare function notFoundHandler(req: Request, res: Response): void;
