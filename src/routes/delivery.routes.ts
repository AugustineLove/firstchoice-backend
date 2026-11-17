import { Router } from 'express';
import * as DeliveryController from '../controllers/delivery.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { requireOperatingHours } from '../middleware/operating.hours';
import { quoteDeliveryRequest } from '../services/delivery.service';


const deliveryRouter = Router();

deliveryRouter.use(authenticate);

// Customer
deliveryRouter.post('/', authorize('CUSTOMER'), requireOperatingHours, DeliveryController.createDelivery);
deliveryRouter.get('/pending',        authorize('RIDER'), DeliveryController.getPendingDeliveries);

deliveryRouter.post('/quote', authorize('CUSTOMER'), async (req: any, res: any) => {
  try {
    res.json(await quoteDeliveryRequest(req.user.id, req.body ?? {}));
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// Customer, Rider, Admin
deliveryRouter.get('/:id', DeliveryController.getDeliveryById);
deliveryRouter.patch('/:id/status', DeliveryController.updateDeliveryStatus);

// Rider: browse available + self-accept + update status + own jobs

deliveryRouter.post('/:id/accept',    authorize('RIDER'), DeliveryController.acceptDelivery);
deliveryRouter.get('/me/jobs',        authorize('RIDER'), DeliveryController.getMyRiderJobs);
deliveryRouter.get('/riders/jobs',             authenticate, DeliveryController.getRiderJobs);


// Admin only
deliveryRouter.get('/', authorize('ADMIN'), DeliveryController.getAllDeliveries);
deliveryRouter.patch('/:id/assign', authorize('ADMIN'), DeliveryController.assignRider);

export default deliveryRouter;