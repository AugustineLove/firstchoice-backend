import { Request, Response } from 'express';
import * as VendorService from '../services/vendor.service';
import { AuthRequest } from '../interface/auth-request.interface.ts';

export async function registerVendor(req: AuthRequest, res: Response) {
  try {
    const { businessName, businessType, address, phone, logo, openingHours } =
      req.body;

    if (!businessName || !businessType || !address || !phone) {
      res.status(400).json({
        success: false,
        message: 'businessName, businessType, address and phone are required',
      });
      return;
    }

    const vendor = await VendorService.registerVendor(req.user!.id, req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getMyVendorProfile(req: AuthRequest, res: Response) {
  try {
    const vendor = await VendorService.getMyVendorProfile(req.user!.id);
    res.status(200).json({ success: true, data: vendor });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
}

export async function updateVendorProfile(req: AuthRequest, res: Response) {
  try {
    const vendor = await VendorService.updateVendorProfile(
      req.user!.id,
      req.body
    );
    res.status(200).json({ success: true, data: vendor });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getAllVendors(req: Request, res: Response) {
  try {
    const { businessType, search } = req.query;
    const vendors = await VendorService.getAllVendors({
      businessType: businessType as string,
      search: search as string,
    });
    res.status(200).json({ success: true, data: vendors });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getVendorById(req: Request, res: Response) {
  try {
    const vendor = await VendorService.getVendorProfile(req.params.id as string);
    res.status(200).json({ success: true, data: vendor });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
}

export async function getVendorOrders(req: AuthRequest, res: Response) {
  try {
    const orders = await VendorService.getVendorOrders(req.user!.id);
    res.status(200).json({ success: true, data: orders });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getVendorStats(req: AuthRequest, res: Response) {
  try {
    const stats = await VendorService.getVendorStats(req.user!.id);
    res.status(200).json({ success: true, data: stats });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}