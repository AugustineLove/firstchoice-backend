import { Request, Response } from 'express';
import * as AuthService from '../services/auth.service';
import { validateRegister, validateLogin, validateForgotPassword, validateResetPassword } from '../validators/auth.validator';
import { User } from '@prisma/client';
import { AuthRequest } from '../interface/auth-request.interface.ts';
import { prisma } from '../config/prisma';



export const h =
  (fn: (req: AuthRequest) => Promise<unknown>, okStatus = 200) =>
  async (req: AuthRequest, res: Response) => {
    try {
      res.status(okStatus).json({ success: true, data: await fn(req) });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message || 'Something went wrong' });
    }
  };