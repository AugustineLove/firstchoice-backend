import { Router } from 'express';
import * as DeliveryController from '../controllers/delivery.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const deliveryRouter = Router();

deliveryRouter.use(authenticate);

// Customer
deliveryRouter.post('/', authorize('CUSTOMER'), DeliveryController.createDelivery);

// Customer, Rider, Admin
deliveryRouter.get('/:id', DeliveryController.getDeliveryById);
deliveryRouter.patch('/:id/status', DeliveryController.updateDeliveryStatus);

// Rider: browse available + self-accept + update status + own jobs
deliveryRouter.get('/pending',        authorize('RIDER'), DeliveryController.getPendingDeliveries);
deliveryRouter.post('/:id/accept',    authorize('RIDER'), DeliveryController.acceptDelivery);
deliveryRouter.get('/me/jobs',        authorize('RIDER'), DeliveryController.getMyRiderJobs);
deliveryRouter.get('/riders/jobs',             authenticate, DeliveryController.getRiderJobs);


// Admin only
deliveryRouter.get('/', authorize('ADMIN'), DeliveryController.getAllDeliveries);
deliveryRouter.patch('/:id/assign', authorize('ADMIN'), DeliveryController.assignRider);

export default deliveryRouter;