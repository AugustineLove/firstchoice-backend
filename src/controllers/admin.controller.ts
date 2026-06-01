import { Request, Response } from 'express';
import * as AdminService from '../services/admin.service';
import { UserStatus, VendorStatus } from '../../generated/prisma/enums';

export async function getOverviewStats(req: Request, res: Response) {
  try {
    const stats = await AdminService.getOverviewStats();
    res.status(200).json({ success: true, data: stats });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getAllUsers(req: Request, res: Response) {
  try {
    const { role, status, search, page, limit } = req.query;
    const result = await AdminService.getAllUsers({
      role: role as string,
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateUserStatus(req: Request, res: Response) {
  try {
    const { status } = req.body;
    if (!status || !['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'status must be ACTIVE, SUSPENDED or PENDING',
      });
      return;
    }
    const user = await AdminService.updateUserStatus(
      req.params.userId as string,
      status as UserStatus
    );
    res.status(200).json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getAllVendors(req: Request, res: Response) {
  try {
    const { status, page, limit } = req.query;
    const result = await AdminService.getAllVendorsAdmin({
      status: status as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateVendorStatus(req: Request, res: Response) {
  try {
    const { status } = req.body;
    if (!status || !['ACTIVE', 'INACTIVE', 'PENDING'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'status must be ACTIVE, INACTIVE or PENDING',
      });
      return;
    }
    const vendor = await AdminService.updateVendorStatus(
      req.params.vendorId as string,
      status as VendorStatus
    );
    res.status(200).json({ success: true, data: vendor });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getAllRiders(req: Request, res: Response) {
  try {
    const { availability, page, limit } = req.query;
    const result = await AdminService.getAllRidersAdmin({
      availability: availability as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function assignRiderToOrder(req: Request, res: Response) {
  try {
    const { riderId } = req.body;
    if (!riderId) {
      res.status(400).json({ success: false, message: 'riderId is required' });
      return;
    }
    const order = await AdminService.assignRiderToOrder(
      req.params.orderId as string,
      riderId
    );
    res.status(200).json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getOrderAnalytics(req: Request, res: Response) {
  try {
    const analytics = await AdminService.getOrderAnalytics();
    res.status(200).json({ success: true, data: analytics });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getRiderAnalytics(req: Request, res: Response) {
  try {
    const analytics = await AdminService.getRiderAnalytics();
    res.status(200).json({ success: true, data: analytics });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}