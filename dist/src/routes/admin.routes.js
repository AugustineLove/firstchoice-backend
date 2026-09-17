"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AdminController = __importStar(require("../controllers/admin.controller"));
const SettingsController = __importStar(require("../controllers/settings.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const settings_controller_1 = require("../controllers/settings.controller");
const setting_service_1 = require("../services/setting.service");
const adminRouter = (0, express_1.Router)();
// All admin routes — locked to ADMIN role
adminRouter.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN'));
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
adminRouter.post('/vendors', AdminController.createVendor); // NEW
adminRouter.patch('/vendors/:vendorId', AdminController.updateVendorProfile); // NEW
adminRouter.patch('/vendors/:vendorId/status', AdminController.updateVendorStatus);
adminRouter.post('/vendors/:vendorId/products', AdminController.addVendorProduct); // NEW
adminRouter.delete('/products/:productId', AdminController.deleteVendorProduct); // NEW
// Settings
adminRouter.get('/settings', settings_controller_1.getAdminSettings);
adminRouter.patch('/settings', settings_controller_1.patchAdminSettings);
adminRouter.get('/riders/:id/insights', AdminController.riderInsights);
adminRouter.get('/riders/:id/jobs', AdminController.riderJobHistory);
// Riders
adminRouter.get('/riders', AdminController.getAllRiders);
// Order assignment & status
adminRouter.patch('/orders/:orderId/assign', AdminController.assignRiderToOrder);
adminRouter.patch('/orders/:orderId/status', AdminController.updateOrderStatus);
// Delivery assignment
adminRouter.patch('/deliveries/:deliveryId/assign', AdminController.assignRiderToDelivery);
// Analytics
adminRouter.get('/analytics/orders', AdminController.getOrderAnalytics);
adminRouter.get('/analytics/riders', AdminController.getRiderAnalytics);
// Broadcast notifications
adminRouter.post('/broadcast', AdminController.broadcastNotification);
adminRouter.patch('/admin/closing-status', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN'), async (req, res) => {
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
        const settings = await (0, setting_service_1.updateClosingStatus)(isClosed, closedMessage);
        res.json({
            success: true,
            data: {
                isClosed: settings.isClosed,
                closedMessage: settings.closedMessage,
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error
        });
    }
});
// Operating hours and override
adminRouter.patch('/operating-hours', (0, auth_middleware_1.authorize)('ADMIN'), SettingsController.updateOperatingHours);
adminRouter.post('/operating-override', (0, auth_middleware_1.authorize)('ADMIN'), SettingsController.setOperatingOverride);
adminRouter.delete('/operating-override', (0, auth_middleware_1.authorize)('ADMIN'), SettingsController.clearOperatingOverride);
// Report generation
adminRouter.get('/reports/riders/daily', AdminController.riderDailyReport);
exports.default = adminRouter;
//# sourceMappingURL=admin.routes.js.map