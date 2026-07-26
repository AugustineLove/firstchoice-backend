import { Router } from 'express';
import * as VendorController from '../controllers/vendor.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

import {
  submitRating,
  getRatingSummary,
  getRatings,
} from '../controllers/rating.controller';


const vendorRouter = Router();

// Public
vendorRouter.get('/', VendorController.getAllVendors);
vendorRouter.get('/:id', VendorController.getVendorById);

// Authenticated
vendorRouter.post('/register', authenticate, VendorController.registerVendor);
vendorRouter.get('/me/profile', authenticate, VendorController.getMyVendorProfile);
vendorRouter.patch('/me/profile', authenticate, VendorController.updateVendorProfile);
vendorRouter.get('/me/orders', authenticate, authorize('VENDOR'), VendorController.getVendorOrders);
vendorRouter.get('/me/stats', authenticate, authorize('VENDOR'), VendorController.getVendorStats);

vendorRouter.post('/:id/rating', authenticate, submitRating);

// Average + count + the logged-in customer's own vote (if any).
// This is what the vendor page calls on load.
vendorRouter.get('/:id/rating/summary', authenticate, getRatingSummary);

// Public paginated review list — no auth required.
vendorRouter.get('/:id/ratings', getRatings);

export default vendorRouter;