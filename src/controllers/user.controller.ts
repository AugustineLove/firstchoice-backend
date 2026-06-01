import { Request, Response } from 'express';
import * as UserService from '../services/user.service';
import { AuthRequest } from '../interface/auth-request.interface.ts';

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const user = await UserService.getUserById(req.user!.id);
    res.status(200).json({ success: true, data: user });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const { name, email, profileImage } = req.body;
    const user = await UserService.updateProfile(req.user!.id, {
      name,
      email,
      profileImage,
    });
    res.status(200).json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  try {
    const result = await UserService.changePassword(req.user!.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getMyOrders(req: AuthRequest, res: Response) {
  try {
    const orders = await UserService.getUserOrders(req.user!.id);
    res.status(200).json({ success: true, data: orders });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getMyDeliveries(req: AuthRequest, res: Response) {
  try {
    const deliveries = await UserService.getUserDeliveries(req.user!.id);
    res.status(200).json({ success: true, data: deliveries });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getMyErrands(req: AuthRequest, res: Response) {
  try {
    const errands = await UserService.getUserErrands(req.user!.id);
    res.status(200).json({ success: true, data: errands });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}