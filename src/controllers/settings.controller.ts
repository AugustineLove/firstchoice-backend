// settings.controller.ts
import { Request, Response } from 'express';
import * as SettingsService from '../services/setting.service';

export async function getErrandSettings(req: Request, res: Response) {
  const data = await SettingsService.getErrandPricingForCustomers();
  res.json({ success: true, data });
}

export async function getAdminSettings(req: Request, res: Response) {
  const s = await SettingsService.getSettings();
  res.json({ success: true, data: s });
}

export async function patchAdminSettings(req: Request, res: Response) {
  try {
    const s = await SettingsService.updateSettings(req.body);
    res.json({ success: true, data: s });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message || 'Could not save settings' });
  }
}