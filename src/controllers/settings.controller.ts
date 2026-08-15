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

export async function getOperatingStatus(req: Request, res: Response) {
  try {
    const status = await SettingsService.getOperatingStatus();
    return res.json({ success: true, data: status });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateOperatingHours(req: Request, res: Response) {
  try {
    const updated = await SettingsService.updateOperatingHours(req.body.hours);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function setOperatingOverride(req: Request, res: Response) {
  try {
    const { durationMinutes } = req.body;
    const updated = await SettingsService.setOperatingOverride(Number(durationMinutes));
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function clearOperatingOverride(req: Request, res: Response) {
  try {
    const updated = await SettingsService.clearOperatingOverride();
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}