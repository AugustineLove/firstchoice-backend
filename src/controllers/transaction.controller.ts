import { Request, Response } from 'express';
import * as TransactionService from '../services/transaction.service';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { AuthRequest } from '../interface/auth-request.interface.ts';

export async function recordTransaction(req: AuthRequest, res: Response) {
  try {
    const { orderId, paymentMethod, amount } = req.body;

    if (!orderId || !paymentMethod || !amount) {
      res.status(400).json({
        success: false,
        message: 'orderId, paymentMethod and amount are required',
      });
      return;
    }

    if (!['CASH', 'MOMO'].includes(paymentMethod)) {
      res.status(400).json({
        success: false,
        message: 'paymentMethod must be CASH or MOMO',
      });
      return;
    }

    const transaction = await TransactionService.recordTransaction(
      req.user!.id,
      req.body
    );
    res.status(201).json({ success: true, data: transaction });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getTransactionByOrder(req: AuthRequest, res: Response) {
  try {
    const transaction = await TransactionService.getTransactionByOrder(
      req.params.orderId as string,
      req.user!.id
    );
    res.status(200).json({ success: true, data: transaction });
  } catch (err: any) {
    const code = err.message === 'Access denied' ? 403 : 404;
    res.status(code).json({ success: false, message: err.message });
  }
}

export async function getAllTransactions(req: Request, res: Response) {
  try {
    const { paymentStatus, paymentMethod, page, limit } = req.query;
    const result = await TransactionService.getAllTransactions({
      paymentStatus: paymentStatus as PaymentStatus,
      paymentMethod: paymentMethod as PaymentMethod,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getTransactionSummary(req: Request, res: Response) {
  try {
    const summary = await TransactionService.getTransactionSummary();
    res.status(200).json({ success: true, data: summary });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}