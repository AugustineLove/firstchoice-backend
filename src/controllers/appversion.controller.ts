import { Request, Response } from 'express';
import { AppPlatform, checkAppVersion } from '../services/appversion.service';
export async function getAppVersionStatus(req: Request, res: Response) {
  try {
    const platform: AppPlatform = req.query.platform === 'ios' ? 'ios' : 'android';
    const version = typeof req.query.version === 'string' ? req.query.version : '';

    if (!version) {
      return res.json({ status: 'none', latestVersion: null, storeUrl: null, message: null });
    }

    const result = await checkAppVersion(platform, version);
    res.json(result);
  } catch (err) {
    // Never block the app because of this check
    res.json({ status: 'none', latestVersion: null, storeUrl: null, message: null });
  }
}