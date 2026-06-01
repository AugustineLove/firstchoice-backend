import { Request, Response } from 'express';
import * as AuthService from '../services/auth.service';
import { validateRegister, validateLogin } from '../validators/auth.validator';
import { User } from '../../generated/prisma/client';
import { AuthRequest } from '../interface/auth-request.interface.ts';

export async function register(req: Request, res: Response) {
  const error = validateRegister(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error });
    return;
  }

  try {
    const result = await AuthService.registerUser(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function login(req: Request, res: Response) {
  console.log(req.body);
  const error = validateLogin(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error });
    return;
  }
  try {
    const result = await AuthService.loginUser(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, message: err.message });
  }
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ success: false, message: 'Refresh token required' });
    return;
  }

  try {
    const result = await AuthService.refreshAccessToken(refreshToken);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, message: err.message });
  }
}

export async function me(req: AuthRequest, res: Response) {
  res.status(200).json({ success: true, data: { user: req.user } });
}