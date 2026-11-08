import { Router } from 'express';
import { getAppVersionStatus } from '../controllers/appversion.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getSettings, saveSettings } from '../controllers/app_version_admin.controller';
const appVersionRouter = Router();
appVersionRouter.get('/version', getAppVersionStatus);
appVersionRouter.get('/app-version', authenticate, authorize('ADMIN'), getSettings);
appVersionRouter.put('/app-version', authenticate, authorize('ADMIN'), saveSettings);

export default appVersionRouter;