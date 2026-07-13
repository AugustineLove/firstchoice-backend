// routes/location.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { createLocation, deleteLocation, getLocations, updateLocation } from '../controllers/location.controlller';

const locationRouter = Router();

// Public — customer app reads these to populate pickup/destination pickers
locationRouter.get('/', getLocations);

// Admin only — this is what your "basic simple app" (the location-capture tool) will hit
locationRouter.post('/', authenticate, authorize('ADMIN'), createLocation);
locationRouter.patch('/:id', authenticate, authorize('ADMIN'), updateLocation);
locationRouter.delete('/:id', authenticate, authorize('ADMIN'), deleteLocation);

export default locationRouter;