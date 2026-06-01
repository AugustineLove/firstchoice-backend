import { Response } from 'express';
export declare const sendSuccess: (res: Response, data: any, statusCode?: number, message?: string) => void;
export declare const sendError: (res: Response, message: string, statusCode?: number) => void;
