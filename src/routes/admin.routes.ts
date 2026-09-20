import { Router } from 'express';
import * as AdminController from '../controllers/admin.controller';
import * as SettingsController from '../controllers/settings.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getAdminSettings, patchAdminSettings } from '../controllers/settings.controller';
import { updateClosingStatus } from '../services/setting.service';
import { parseOffBookText } from '../services/manualjob.service';

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

// Order assignment & status
adminRouter.patch('/orders/:orderId/assign', AdminController.assignRiderToOrder);
adminRouter.patch('/orders/:orderId/status', AdminController.updateOrderStatus);

// Delivery assignment
adminRouter.get('/deliveries/:deliveryId', AdminController.getDeliveryById);
adminRouter.patch('/deliveries/:deliveryId/assign', AdminController.assignRiderToDelivery);
adminRouter.patch('/deliveries/:deliveryId/status', AdminController.updateDeliveryStatus);

// Analytics
adminRouter.get('/analytics/orders', AdminController.getOrderAnalytics);
adminRouter.get('/analytics/riders', AdminController.getRiderAnalytics);

adminRouter.get('/dispatch/queue', AdminController.getDispatchQueue);
// Broadcast notifications
adminRouter.post('/broadcast', AdminController.broadcastNotification);

adminRouter.get('/logs', AdminController.getActivityLogs);
// admin.routes.ts — alongside your other admin routes
adminRouter.get('/search', authenticate, authorize('ADMIN'), AdminController.searchAll);
adminRouter.get('/dispatch/map', AdminController.getLiveMapData);

// wire into your admin router, alongside /admin/orders and /admin/deliveries
adminRouter.post('/manual-jobs/parse', authenticate, authorize('ADMIN'), parseOffBookText);
adminRouter.post('/manual-jobs', authenticate, authorize('ADMIN'), AdminController.createManualJob);
adminRouter.post('/manual-jobs/:id/assign-rider', authenticate, authorize('ADMIN'), AdminController.assignRiderToManualJobCon);
adminRouter.patch('/manual-jobs/:id/status', authenticate, authorize('ADMIN'), AdminController.updateMJobStatus);

adminRouter.patch('/admin/closing-status', 
  authenticate, 
  authorize('ADMIN'), 
  async (req, res) => {
    try {
      const { isClosed, closedMessage } = req.body;
      
      if (typeof isClosed !== 'boolean') {
        return res.status(400).json({ 
          success: false, 
          message: 'isClosed must be a boolean' 
        });
      }
      
      if (isClosed && typeof closedMessage !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'closedMessage is required when closing' 
        });
      }
      
      if (isClosed && closedMessage && closedMessage.length > 500) {
        return res.status(400).json({ 
          success: false, 
          message: 'Message cannot exceed 500 characters' 
        });
      }
      
      const settings = await updateClosingStatus(isClosed, closedMessage);
      res.json({ 
        success: true, 
        data: {
          isClosed: settings.isClosed,
          closedMessage: settings.closedMessage,
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error 
      });
    }
  }
);

// Operating hours and override
adminRouter.patch('/operating-hours', authorize('ADMIN'), SettingsController.updateOperatingHours);
adminRouter.post('/operating-override', authorize('ADMIN'), SettingsController.setOperatingOverride);
adminRouter.delete('/operating-override', authorize('ADMIN'), SettingsController.clearOperatingOverride);

// Report generation
adminRouter.get('/reports/riders/daily', AdminController.riderDailyReport);

export default adminRouter;