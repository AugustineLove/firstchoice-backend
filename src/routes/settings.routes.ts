
import { Router } from 'express';
import { getErrandSettings } from '../controllers/settings.controller';

const settingsRouter = Router();

settingsRouter.get('/errand', getErrandSettings);

export default settingsRouter;