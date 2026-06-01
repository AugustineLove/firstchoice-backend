import { Router } from 'express';
import * as AdminController from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const adminRouter = Router();

// All admin routes — locked to ADMIN role
adminRouter.use(authenticate, authorize('ADMIN'));

// Overview
adminRouter.get('/stats', AdminController.getOverviewStats);

// Users
adminRouter.get('/users', AdminController.getAllUsers);
adminRouter.patch('/users/:userId/status', AdminController.updateUserStatus);

// Vendors
adminRouter.get('/vendors', AdminController.getAllVendors);
adminRouter.patch('/vendors/:vendorId/status', AdminController.updateVendorStatus);

// Riders
adminRouter.get('/riders', AdminController.getAllRiders);

// Order assignment
adminRouter.patch('/orders/:orderId/assign', AdminController.assignRiderToOrder);

// Analytics
adminRouter.get('/analytics/orders', AdminController.getOrderAnalytics);
adminRouter.get('/analytics/riders', AdminController.getRiderAnalytics);

export default adminRouter;