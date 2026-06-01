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

// Admin only
deliveryRouter.get('/', authorize('ADMIN'), DeliveryController.getAllDeliveries);
deliveryRouter.patch('/:id/assign', authorize('ADMIN'), DeliveryController.assignRider);

export default deliveryRouter;