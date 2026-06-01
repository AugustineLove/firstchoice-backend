import { Request, Response } from 'express';
import * as ErrandService from '../services/errand.service';
import { ErrandStatus } from '../../generated/prisma/enums';
import { AuthRequest } from '../interface/auth-request.interface.ts';

export async function createErrand(req: AuthRequest, res: Response) {
  try {
    const { description, budget } = req.body;
    if (!description || !budget) {
      res.status(400).json({
        success: false,
        message: 'description and budget are required',
      });
      return;
    }
    const errand = await ErrandService.createErrand(req.user!.id, req.body);
    res.status(201).json({ success: true, data: errand });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getErrandById(req: AuthRequest, res: Response) {
  try {
    const errand = await ErrandService.getErrandById(
      req.params.id as string,
      req.user!.id
    );
    res.status(200).json({ success: true, data: errand });
  } catch (err: any) {
    const code = err.message === 'Access denied' ? 403 : 404;
    res.status(code).json({ success: false, message: err.message });
  }
}

export async function updateErrandStatus(req: AuthRequest, res: Response) {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ success: false, message: 'status is required' });
      return;
    }
    const errand = await ErrandService.updateErrandStatus(
      req.params.id as string,
      req.user!.id,
      status as ErrandStatus
    );
    res.status(200).json({ success: true, data: errand });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getAllErrands(req: Request, res: Response) {
  try {
    const { status, page, limit } = req.query;
    const result = await ErrandService.getAllErrands({
      status: status as ErrandStatus,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}