import { Router } from 'express';
import * as ErrandController from '../controllers/errand.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const errandRouter = Router();

errandRouter.use(authenticate);

// Customer
errandRouter.post('/', authorize('CUSTOMER'), ErrandController.createErrand);

// Customer, Rider, Admin
errandRouter.get('/:id', ErrandController.getErrandById);
errandRouter.patch('/:id/status', ErrandController.updateErrandStatus);

// Admin only
errandRouter.get('/', authorize('ADMIN'), ErrandController.getAllErrands);

export default errandRouter;