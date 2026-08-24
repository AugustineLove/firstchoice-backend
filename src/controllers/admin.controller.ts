import { Request, Response } from 'express';
import * as AdminService from '../services/admin.service';
import * as NotificationService from '../services/notification.service';
import { UserStatus, VendorStatus } from '@prisma/client';
import { getRiderInsights, getRiderJobsPaginated } from '../services/rider.service';


function handleError(res: Response, err: any) {
  res.status(400).json({ success: false, message: err.message || 'Something went wrong' });
}

export async function getOverviewStats(req: Request, res: Response) {
  try {
    const stats = await AdminService.getAdminOverview();
    res.status(200).json({ success: true, data: stats });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function overview(req: Request, res: Response) {
  try {
    const data = await AdminService.getAdminOverview();
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
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

export async function updateVendorProfile(
  req: Request<{ vendorId: string }>,
  res: Response
) {
  try {
    const data = await AdminService.updateVendorProfile(
      req.params.vendorId,
      req.body
    );

    res.json({ success: true, data });

  } catch (err) {
    handleError(res, err);
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

export async function addVendorProduct(req: Request<{ vendorId: string}>, res: Response) {
  try {
    const data = await AdminService.createProductForVendor(req.params.vendorId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function deleteVendorProduct(req: Request< { productId: string} >, res: Response) {
  try {
    const data = await AdminService.deleteProductAdmin(req.params.productId);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
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

export async function createVendor(req: Request, res: Response) {
  try {
    const { vendor, tempPassword } = await AdminService.createVendorWithOwner(req.body);
    res.status(201).json({ success: true, data: vendor, tempPassword });
  } catch (err) { handleError(res, err); }
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

export async function broadcastNotification(req: Request, res: Response) {
  try {
    const { title, message, role } = req.body;
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }
    const result = await NotificationService.sendBroadcastNotification({
      title: title.trim(),
      body: message.trim(),
      role: role || undefined,
    });
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to send broadcast' });
  }
}


export async function riderInsights(req: Request, res: Response) {
  try {
    const data = await getRiderInsights(req.params.id as string);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
}

export async function riderJobHistory(req: Request, res: Response) {
  try {
    const { page, limit, kind, status } = req.query;
    const data = await getRiderJobsPaginated(req.params.id as string, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      kind: kind as any,
      status: status as string | undefined,
    });
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
}