import { Router } from 'express';
import * as RiderController from '../controllers/rider.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const riderRouter = Router();

// Admin only
riderRouter.get('/available', authenticate, authorize('ADMIN', 'RIDER'), RiderController.getAvailableRiders);
riderRouter.get('/:id', authenticate, authorize('ADMIN', 'RIDER'), RiderController.getRiderById);

// Rider only
riderRouter.get('/me/jobs/history', authenticate, authorize('RIDER'), RiderController.getMyJobHistory);
riderRouter.post('/register', authenticate, RiderController.registerRider);
riderRouter.get('/me/profile', authenticate, authorize('RIDER'), RiderController.getMyRiderProfile);
riderRouter.patch('/me/availability', authenticate, authorize('RIDER'), RiderController.toggleAvailability);
riderRouter.patch('/me/location', authenticate, authorize('RIDER'), RiderController.updateLocation);
riderRouter.get('/me/earnings', authenticate, authorize('RIDER'), RiderController.getMyEarnings);
riderRouter.get('/me/jobs', authenticate, authorize('RIDER'), RiderController.getMyActiveJobs);

export default riderRouter;