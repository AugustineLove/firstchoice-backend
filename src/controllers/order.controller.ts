import { Request, Response } from 'express';
import * as OrderService from '../services/order.service';
import { OrderStatus } from '@prisma/client';
import { AuthRequest } from '../interface/auth-request.interface.ts';

export async function placeOrder(req: AuthRequest, res: Response) {
  try {
    const { vendorId, items, note, deliveryAddress, paymentMethod, recipientName, recipientPhone } = req.body;

    if (!vendorId) {
      res.status(400).json({ success: false, message: 'vendorId is required' });
      return;
    }

    const hasItems = Array.isArray(items) && items.length > 0;
    const hasNote = typeof note === 'string' && note.trim().length > 0;

    if (!hasItems && !hasNote) {
      res.status(400).json({ success: false, message: 'Either items[] or a note is required' });
      return;
    }

    if (!deliveryAddress) {
      res.status(400).json({ success: false, message: 'deliveryAddress is required' });
      return;
    }

    if (!paymentMethod || !['CASH', 'MOMO'].includes(paymentMethod)) {
      res.status(400).json({ success: false, message: 'paymentMethod must be CASH or MOMO' });
      return;
    }

    // ordering for someone else — both fields become mandatory together
    if ((recipientName && !recipientPhone) || (recipientPhone && !recipientName)) {
      res.status(400).json({ success: false, message: 'recipientName and recipientPhone must be provided together' });
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
    console.log(`All orders: ${result}`)
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function acceptOrder(req: AuthRequest, res: Response) {
  try {
    const delivery = await OrderService.riderAcceptOrder(
      req.params.id as string,
      req.user!.id
    );
    res.status(200).json({ success: true, data: delivery });
  } catch (err: any) {
    const code = err.message.includes('already') ? 409 : 400;
    res.status(code).json({ success: false, message: err.message });
  }
}