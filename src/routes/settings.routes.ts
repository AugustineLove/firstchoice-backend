
import { Router } from 'express';
import { getErrandSettings, setClosingStatus } from '../controllers/settings.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getMyServices } from '../services/service-flags.service';

const settingsRouter = Router();

settingsRouter.get('/errand', getErrandSettings);
settingsRouter.patch('/closing-status', setClosingStatus);
settingsRouter.get('/services', authenticate, getMyServices);


export default settingsRouter;