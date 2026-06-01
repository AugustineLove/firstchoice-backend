import { Request, Response, NextFunction } from 'express';

// Strip keys starting with $ or containing . to prevent injection
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      obj[key] = sanitizeObject(obj[key]);
    }
  }

  return obj;
}

export function sanitizeInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    Object.assign(req.query, sanitizeObject(req.query));
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

// Prevent parameter pollution
export function preventParamPollution(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // If a query param appears multiple times, keep only the last value
  for (const key of Object.keys(req.query)) {
    if (Array.isArray(req.query[key])) {
      const arr = req.query[key] as string[];
      req.query[key] = arr[arr.length - 1] ?? '';
    }
  }
  next();
}