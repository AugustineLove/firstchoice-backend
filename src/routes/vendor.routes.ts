import { Router } from 'express';
import * as VendorController from '../controllers/vendor.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

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

export default vendorRouter;