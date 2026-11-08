import { Request, Response } from 'express';
import { getAppVersionSettings, updateAppVersionSettings } from '../services/app_version_admin.service';
export async function getSettings(_req: Request, res: Response) {
  try {
    res.json({ success: true, data: await getAppVersionSettings() });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

export async function saveSettings(req: Request, res: Response) {
  try {
    res.json({ success: true, data: await updateAppVersionSettings(req.body) });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
}