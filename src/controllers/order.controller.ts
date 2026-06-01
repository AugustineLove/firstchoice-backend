import { Request, Response } from 'express';
import * as OrderService from '../services/order.service';
import { OrderStatus } from '../../generated/prisma/enums';
import { AuthRequest } from '../interface/auth-request.interface.ts';

export async function placeOrder(req: AuthRequest, res: Response) {
  try {
    const { vendorId, items, deliveryAddress, paymentMethod, notes } = req.body;

    if (!vendorId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'vendorId and at least one item are required',
      });
      return;
    }

    if (!deliveryAddress) {
      res.status(400).json({
        success: false,
        message: 'deliveryAddress is required',
      });
      return;
    }

    if (!paymentMethod || !['CASH', 'MOMO'].includes(paymentMethod)) {
      res.status(400).json({
        success: false,
        message: 'paymentMethod must be CASH or MOMO',
      });
      return;
    }

    const order = await OrderService.placeOrder(req.user!.id, req.body);
    res.status(201).json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getOrderById(req: AuthRequest, res: Response) {
  try {
    const order = await OrderService.getOrderById(req.params.id as string, req.user!.id);
    res.status(200).json({ success: true, data: order });
  } catch (err: any) {
    const code = err.message === 'Access denied' ? 403 : 404;
    res.status(code).json({ success: false, message: err.message });
  }
}

export async function updateOrderStatus(req: AuthRequest, res: Response) {
  try {
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: 'status is required' });
      return;
    }

    const order = await OrderService.updateOrderStatus(
      req.params.id as string,
      req.user!.id,
      status as OrderStatus
    );
    res.status(200).json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function cancelOrder(req: AuthRequest, res: Response) {
  try {
    const order = await OrderService.cancelOrder(req.params.id as string, req.user!.id);
    res.status(200).json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getAllOrders(req: Request, res: Response) {
  try {
    const { status, vendorId, customerId, page, limit } = req.query;
    const result = await OrderService.getAllOrders({
      status: status as OrderStatus,
      vendorId: vendorId as string,
      customerId: customerId as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}