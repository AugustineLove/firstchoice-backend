import { Request, Response } from 'express';
export declare function getErrandSettings(req: Request, res: Response): Promise<void>;
export declare function getAdminSettings(req: Request, res: Response): Promise<void>;
export declare function patchAdminSettings(req: Request, res: Response): Promise<void>;
export declare function getOperatingStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateOperatingHours(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function setOperatingOverride(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function clearOperatingOverride(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
