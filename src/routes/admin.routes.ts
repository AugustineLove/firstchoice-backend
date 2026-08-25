import { Router } from 'express';
import * as AdminController from '../controllers/admin.controller';
import * as SettingsController from '../controllers/settings.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getAdminSettings, patchAdminSettings } from '../controllers/settings.controller';

const adminRouter = Router();

// All admin routes — locked to ADMIN role
adminRouter.use(authenticate, authorize('ADMIN'));

// Overview
adminRouter.get('/stats', AdminController.getOverviewStats);
adminRouter.get('/overview', AdminController.overview);

// Users
adminRouter.get('/users', AdminController.getAllUsers);
adminRouter.patch('/users/:userId/status', AdminController.updateUserStatus);

// Vendors
adminRouter.get('/vendors', AdminController.getAllVendors);
adminRouter.patch('/vendors/:vendorId/status', AdminController.updateVendorStatus);
// Vendors
adminRouter.get('/vendors', AdminController.getAllVendors);
adminRouter.post('/vendors', AdminController.createVendor);                          // NEW
adminRouter.patch('/vendors/:vendorId', AdminController.updateVendorProfile);         // NEW
adminRouter.patch('/vendors/:vendorId/status', AdminController.updateVendorStatus);
adminRouter.post('/vendors/:vendorId/products', AdminController.addVendorProduct);    // NEW
adminRouter.delete('/products/:productId', AdminController.deleteVendorProduct);      // NEW

// Settings
adminRouter.get('/settings', getAdminSettings);
adminRouter.patch('/settings', patchAdminSettings);

adminRouter.get('/riders/:id/insights', AdminController.riderInsights);
adminRouter.get('/riders/:id/jobs',      AdminController.riderJobHistory);

// Riders
adminRouter.get('/riders', AdminController.getAllRiders);

// Order assignment
adminRouter.patch('/orders/:orderId/assign', AdminController.assignRiderToOrder);

// Analytics
adminRouter.get('/analytics/orders', AdminController.getOrderAnalytics);
adminRouter.get('/analytics/riders', AdminController.getRiderAnalytics);

// Broadcast notifications
adminRouter.post('/broadcast', AdminController.broadcastNotification);

// Operating hours and override
adminRouter.patch('/operating-hours', authorize('ADMIN'), SettingsController.updateOperatingHours);
adminRouter.post('/operating-override', authorize('ADMIN'), SettingsController.setOperatingOverride);
adminRouter.delete('/operating-override', authorize('ADMIN'), SettingsController.clearOperatingOverride);

// Report generation
adminRouter.get('/reports/riders/daily', AdminController.riderDailyReport);

export default adminRouter;