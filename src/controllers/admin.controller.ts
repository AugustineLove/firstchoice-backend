import { Request, Response } from 'express';
import * as AdminService from '../services/admin.service';
import * as NotificationService from '../services/notification.service';
import { AdminActionType, DeliveryStatus, OrderStatus, UserStatus, VendorStatus } from '@prisma/client';
import { getRiderInsights, getRiderJobsPaginated } from '../services/rider.service';
import { AuthRequest } from '../interface/auth-request.interface.ts';
import { getAdminActionLogs, logAdminAction } from '../services/adminLog.service';
import { assignRiderToManualJob, createManualJobService, parseOffBookText, updateManualJobStatus } from '../services/manualjob.service';

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

export async function updateUserStatus(req: AuthRequest, res: Response) {
  try {
    const { status } = req.body;
    if (!status || !['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
      res.status(400).json({ success: false, message: 'status must be ACTIVE, SUSPENDED or PENDING' });
      return;
    }
    const user = await AdminService.updateUserStatus(req.params.userId as string, status as UserStatus);

    await logAdminAction({
      adminId: req.user!.id,
      action: AdminActionType.USER_STATUS_CHANGE,
      targetType: 'User',
      targetId: user.id,
      summary: `Set ${user.name}'s status to ${status}`,
      metadata: { newStatus: status },
    });

    res.status(200).json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateVendorStatus(req: AuthRequest, res: Response) {
  try {
    const { status } = req.body;
    if (!status || !['ACTIVE', 'INACTIVE', 'PENDING'].includes(status)) {
      res.status(400).json({ success: false, message: 'status must be ACTIVE, INACTIVE or PENDING' });
      return;
    }
    const vendor = await AdminService.updateVendorStatus(req.params.vendorId as string, status as VendorStatus);

    await logAdminAction({
      adminId: req.user!.id,
      action: AdminActionType.VENDOR_STATUS_CHANGE,
      targetType: 'Vendor',
      targetId: vendor.id,
      summary: `Set ${vendor.businessName}'s status to ${status}`,
      metadata: { newStatus: status },
    });

    res.status(200).json({ success: true, data: vendor });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateVendorProfile(req: AuthRequest, res: Response) {
  try {
    const data = await AdminService.updateVendorProfile(req.params.vendorId as string, req.body);

    await logAdminAction({
      adminId: req.user!.id,
      action: AdminActionType.VENDOR_PROFILE_UPDATED,
      targetType: 'Vendor',
      targetId: req.params.vendorId as string,
      summary: `Updated ${data.businessName}'s profile`,
      metadata: { fields: Object.keys(req.body) },
    });

    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

export async function addVendorProduct(req: AuthRequest, res: Response) {
  try {
    const data = await AdminService.createProductForVendor(req.params.vendorId as string, req.body);

    await logAdminAction({
      adminId: req.user!.id,
      action: AdminActionType.PRODUCT_CREATED,
      targetType: 'Product',
      targetId: data.id,
      summary: `Added product "${data.name}" for vendor`,
      metadata: { vendorId: req.params.vendorId },
    });

    res.status(201).json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function deleteVendorProduct(req: AuthRequest, res: Response) {
  try {
    const data = await AdminService.deleteProductAdmin(req.params.productId as string);

    await logAdminAction({
      adminId: req.user!.id,
      action: AdminActionType.PRODUCT_DELETED,
      targetType: 'Product',
      targetId: req.params.productId as string,
      summary: `Deleted a product`,
    });

    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function createVendor(req: AuthRequest, res: Response) {
  try {
    const { vendor, tempPassword } = await AdminService.createVendorWithOwner(req.body);

    await logAdminAction({
      adminId: req.user!.id,
      action: AdminActionType.VENDOR_CREATED,
      targetType: 'Vendor',
      targetId: vendor.id,
      summary: `Created vendor "${vendor.businessName}"`,
    });

    res.status(201).json({ success: true, data: vendor, tempPassword });
  } catch (err) { handleError(res, err); }
}

export async function assignRiderToOrder(req: AuthRequest, res: Response) {
  try {
    const { riderId } = req.body;
    if (!riderId) {
      res.status(400).json({ success: false, message: 'riderId is required' });
      return;
    }
    const order = await AdminService.assignRiderToOrder(req.params.orderId as string, riderId);

    await logAdminAction({
      adminId: req.user!.id,
      action: AdminActionType.ORDER_RIDER_ASSIGN,
      targetType: 'Order',
      targetId: order.id,
      summary: `Assigned ${order.rider?.user?.name || 'a rider'} to order #${order.id.slice(-6).toUpperCase()}`,
      metadata: { riderId },
    });

    res.status(200).json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function assignRiderToDelivery(req: AuthRequest, res: Response) {
  try {
    const { riderId } = req.body;
    const deliveryId = (req.params.deliveryId || req.params.id) as string;
    if (!deliveryId) { res.status(400).json({ success: false, message: 'deliveryId is required' }); return; }
    if (!riderId) { res.status(400).json({ success: false, message: 'riderId is required' }); return; }

    const delivery = await AdminService.assignRiderToDelivery(deliveryId, riderId);

    await logAdminAction({
      adminId: req.user!.id,
      action: AdminActionType.DELIVERY_RIDER_ASSIGN,
      targetType: 'Delivery',
      targetId: delivery.id,
      summary: `Assigned ${delivery.rider?.user?.name || 'a rider'} to delivery #${delivery.id.slice(-6).toUpperCase()}`,
      metadata: { riderId },
    });

    res.status(200).json({ success: true, data: delivery });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateOrderStatus(req: AuthRequest, res: Response) {
  try {
    const { status, riderId } = req.body;
    const orderId = (req.params.orderId || req.params.id) as string;
    if (!orderId) { res.status(400).json({ success: false, message: 'orderId is required' }); return; }

    const validStatuses: OrderStatus[] = ['PENDING', 'ACCEPTED', 'RIDER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: `status is required and must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const order = await AdminService.updateOrderStatusAdmin(orderId, status as OrderStatus, { riderId });

    await logAdminAction({
      adminId: req.user!.id,
      action: AdminActionType.ORDER_STATUS_CHANGE,
      targetType: 'Order',
      targetId: order.id,
      summary: `Set order #${order.id.slice(-6).toUpperCase()} to ${status}`,
      metadata: { newStatus: status, riderId },
    });

    res.status(200).json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateDeliveryStatus(req: AuthRequest, res: Response) {
  try {
    const { status, riderId } = req.body;
    const deliveryId = (req.params.deliveryId || req.params.id) as string;
    if (!deliveryId) { res.status(400).json({ success: false, message: 'deliveryId is required' }); return; }

    const validStatuses: DeliveryStatus[] = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: `status is required and must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const delivery = await AdminService.updateDeliveryStatusAdmin(deliveryId, status as DeliveryStatus, { riderId });

    await logAdminAction({
      adminId: req.user!.id,
      action: AdminActionType.DELIVERY_STATUS_CHANGE,
      targetType: 'Delivery',
      targetId: delivery.id,
      summary: `Set delivery #${delivery.id.slice(-6).toUpperCase()} to ${status}`,
      metadata: { newStatus: status, riderId },
    });

    res.status(200).json({ success: true, data: delivery });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function broadcastNotification(req: AuthRequest, res: Response) {
  try {
    const { title, message, role } = req.body;
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }
    const result = await NotificationService.sendBroadcastNotification({
      title: title.trim(), body: message.trim(), role: role || undefined,
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: AdminActionType.BROADCAST_SENT,
      summary: `Sent broadcast "${title.trim()}" to ${role || 'everyone'} (${result.total} recipients)`,
      metadata: { role: role || 'ALL', total: result.total },
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to send broadcast' });
  }
}

export async function getActivityLogs(req: Request, res: Response) {
  try {
    const { adminId, action, targetType, targetId, page, limit } = req.query;
    const data = await getAdminActionLogs({
      adminId: adminId as string,
      action: action as AdminActionType,
      targetType: targetType as string,
      targetId: targetId as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 30,
    });
    res.status(200).json({ success: true, data });
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

export async function getOrderAnalytics(req: Request, res: Response) {
  try {
    const data = await AdminService.getOrderAnalytics();
    res.status(200).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getRiderAnalytics(req: Request, res: Response) {
  try {
    const data = await AdminService.getRiderAnalytics();
    res.status(200).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getDeliveryById(req: Request, res: Response) {
  try {
    const deliveryId = (req.params.deliveryId || req.params.id) as string;
    if (!deliveryId) { res.status(400).json({ success: false, message: 'deliveryId is required' }); return; }

    const delivery = await AdminService.getDeliveryByIdAdmin(deliveryId);
    res.status(200).json({ success: true, data: delivery });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
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

export async function riderDailyReport(req: Request, res: Response) {
  try {
    const { startDate, endDate, riderId } = req.query;
    const data = await AdminService.getRiderDailyReport({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      riderId: riderId as string | undefined,
    });
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message || 'Could not load report' });
  }
}

export async function getDispatchQueue(req: Request, res: Response) {
  try {
    const data = await AdminService.getDispatchQueue();
    res.status(200).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getLiveMapData(req: Request, res: Response) {
  try {
    const data = await AdminService.getLiveMapData();
    res.status(200).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function searchAll(req: Request, res: Response) {
  try {
    const q = String(req.query.q || '');
    const data = await AdminService.globalSearch(q);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

export async function parsePaste(req: Request, res: Response) {
  const parsed = parseOffBookText(req.body.text || '');
  res.json({ success: true, data: parsed });
}

export async function createManualJob(req: AuthRequest, res: Response) {
  try {
    const job = await createManualJobService(req.user!.id, req.body);
    res.status(201).json({ success: true, data: job });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
}

export async function assignRiderToManualJobCon(req: Request, res: Response) {
  try {
    const job = await assignRiderToManualJob(req.params.id as string, req.body.riderId as string);
    res.json({ success: true, data: job });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
}

export async function updateMJobStatus(req: Request, res: Response) {
  try {
    const job = await updateManualJobStatus(req.params.id as string, req.body.status as string);
    res.json({ success: true, data: job });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
}