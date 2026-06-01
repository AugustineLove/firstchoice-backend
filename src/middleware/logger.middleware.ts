import morgan from 'morgan';
import { Request, Response } from 'express';
import { AuthRequest } from '../interface/auth-request.interface.ts';

// Custom token — log user id if authenticated
morgan.token('user-id', (req: AuthRequest) => {
  return req.user?.id || 'guest';
});

morgan.token('body', (req: Request) => {
  const body = { ...req.body };
  // Never log passwords
  if (body.password) body.password = '***';
  if (body.currentPassword) body.currentPassword = '***';
  if (body.newPassword) body.newPassword = '***';
  return JSON.stringify(body);
});

// Development — verbose
export const devLogger = morgan(
  ':method :url :status :response-time ms — user::user-id'
);

// Production — minimal
export const prodLogger = morgan(
  ':method :url :status :response-time ms'
);

export const logger = process.env.NODE_ENV === 'production'
  ? prodLogger
  : devLogger;