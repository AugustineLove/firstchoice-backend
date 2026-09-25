
import { Router } from 'express';
import { getErrandSettings, setClosingStatus } from '../controllers/settings.controller';
import { authorize } from '../middleware/auth.middleware';

const settingsRouter = Router();

settingsRouter.get('/errand', getErrandSettings);
settingsRouter.patch('/closing-status', setClosingStatus);

export default settingsRouter;