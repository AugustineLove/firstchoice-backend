import { Request, Response } from 'express';
import * as AuthService from '../services/auth.service';
import { validateRegister, validateLogin, validateForgotPassword, validateResetPassword } from '../validators/auth.validator';
import { User } from '@prisma/client';
import { AuthRequest } from '../interface/auth-request.interface.ts';
import { prisma } from '../config/prisma';

export async function register(req: Request, res: Response) {
  console.log(req.body)
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
  try {
    const rawUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id:true, name:true, phone:true, email:true, role:true, status:true, profileImage:true },
    });
    if (!rawUser) { res.status(404).json({ success:false, message:'User not found' }); return; }

    const vendor = await prisma.vendor.findUnique({
      where: { userId: rawUser.id },
      select: { id: true },
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...rawUser,
          hasVendorProfile: vendor !== null,  // ← actual DB check
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function resetPassword(req: Request, res: Response) {
  const error = validateResetPassword(req.body);
  if (error) { res.status(400).json({ success: false, message: error }); return; }
  try {
    await AuthService.resetPassword(req.body.phone, req.body.otp, req.body.newPassword);
    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  if (!req.body.phone) { res.status(400).json({ success: false, message: 'Phone number is required' }); return; }
  try {
    const result = await AuthService.requestPasswordReset(req.body.phone);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function syncResetPassword(req: Request, res: Response) {
  const { idToken, newPassword } = req.body;
  if (!idToken || !newPassword || newPassword.length < 6) {
    res.status(400).json({ success: false, message: 'Invalid request' });
    return;
  }
  try {
    await AuthService.syncResetPassword(idToken, newPassword);
    res.status(200).json({ success: true, message: 'Password synced' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}