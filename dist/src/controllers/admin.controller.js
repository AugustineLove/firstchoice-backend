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
exports.getOverviewStats = getOverviewStats;
exports.overview = overview;
exports.getAllUsers = getAllUsers;
exports.updateUserStatus = updateUserStatus;
exports.getAllVendors = getAllVendors;
exports.updateVendorProfile = updateVendorProfile;
exports.updateVendorStatus = updateVendorStatus;
exports.addVendorProduct = addVendorProduct;
exports.deleteVendorProduct = deleteVendorProduct;
exports.getAllRiders = getAllRiders;
exports.createVendor = createVendor;
exports.assignRiderToOrder = assignRiderToOrder;
exports.assignRiderToDelivery = assignRiderToDelivery;
exports.updateOrderStatus = updateOrderStatus;
exports.getOrderAnalytics = getOrderAnalytics;
exports.getRiderAnalytics = getRiderAnalytics;
exports.broadcastNotification = broadcastNotification;
exports.riderInsights = riderInsights;
exports.riderJobHistory = riderJobHistory;
exports.riderDailyReport = riderDailyReport;
const AdminService = __importStar(require("../services/admin.service"));
const NotificationService = __importStar(require("../services/notification.service"));
const rider_service_1 = require("../services/rider.service");
function handleError(res, err) {
    res.status(400).json({ success: false, message: err.message || 'Something went wrong' });
}
async function getOverviewStats(req, res) {
    try {
        const stats = await AdminService.getAdminOverview();
        res.status(200).json({ success: true, data: stats });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function overview(req, res) {
    try {
        const data = await AdminService.getAdminOverview();
        res.json({ success: true, data });
    }
    catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
}
async function getAllUsers(req, res) {
    try {
        const { role, status, search, page, limit } = req.query;
        const result = await AdminService.getAllUsers({
            role: role,
            status: status,
            search: search,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function updateUserStatus(req, res) {
    try {
        const { status } = req.body;
        if (!status || !['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
            res.status(400).json({
                success: false,
                message: 'status must be ACTIVE, SUSPENDED or PENDING',
            });
            return;
        }
        const user = await AdminService.updateUserStatus(req.params.userId, status);
        res.status(200).json({ success: true, data: user });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getAllVendors(req, res) {
    try {
        const { status, page, limit } = req.query;
        const result = await AdminService.getAllVendorsAdmin({
            status: status,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function updateVendorProfile(req, res) {
    try {
        const data = await AdminService.updateVendorProfile(req.params.vendorId, req.body);
        res.json({ success: true, data });
    }
    catch (err) {
        handleError(res, err);
    }
}
async function updateVendorStatus(req, res) {
    try {
        const { status } = req.body;
        if (!status || !['ACTIVE', 'INACTIVE', 'PENDING'].includes(status)) {
            res.status(400).json({
                success: false,
                message: 'status must be ACTIVE, INACTIVE or PENDING',
            });
            return;
        }
        const vendor = await AdminService.updateVendorStatus(req.params.vendorId, status);
        res.status(200).json({ success: true, data: vendor });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function addVendorProduct(req, res) {
    try {
        const data = await AdminService.createProductForVendor(req.params.vendorId, req.body);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        handleError(res, err);
    }
}
async function deleteVendorProduct(req, res) {
    try {
        const data = await AdminService.deleteProductAdmin(req.params.productId);
        res.json({ success: true, data });
    }
    catch (err) {
        handleError(res, err);
    }
}
async function getAllRiders(req, res) {
    try {
        const { availability, page, limit } = req.query;
        const result = await AdminService.getAllRidersAdmin({
            availability: availability,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function createVendor(req, res) {
    try {
        const { vendor, tempPassword } = await AdminService.createVendorWithOwner(req.body);
        res.status(201).json({ success: true, data: vendor, tempPassword });
    }
    catch (err) {
        handleError(res, err);
    }
}
async function assignRiderToOrder(req, res) {
    try {
        const { riderId } = req.body;
        if (!riderId) {
            res.status(400).json({ success: false, message: 'riderId is required' });
            return;
        }
        const order = await AdminService.assignRiderToOrder(req.params.orderId, riderId);
        res.status(200).json({ success: true, data: order });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function assignRiderToDelivery(req, res) {
    try {
        const { riderId } = req.body;
        const deliveryId = (req.params.deliveryId || req.params.id);
        if (!deliveryId) {
            res.status(400).json({ success: false, message: 'deliveryId is required' });
            return;
        }
        if (!riderId) {
            res.status(400).json({ success: false, message: 'riderId is required' });
            return;
        }
        const delivery = await AdminService.assignRiderToDelivery(deliveryId, riderId);
        res.status(200).json({ success: true, data: delivery });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function updateOrderStatus(req, res) {
    try {
        const { status, riderId } = req.body;
        const orderId = (req.params.orderId || req.params.id);
        if (!orderId) {
            res.status(400).json({ success: false, message: 'orderId is required' });
            return;
        }
        const validStatuses = [
            'PENDING',
            'ACCEPTED',
            'RIDER_ASSIGNED',
            'PICKED_UP',
            'IN_TRANSIT',
            'ARRIVED',
            'DELIVERED',
            'CANCELLED',
        ];
        if (!status || !validStatuses.includes(status)) {
            res.status(400).json({
                success: false,
                message: `status is required and must be one of: ${validStatuses.join(', ')}`,
            });
            return;
        }
        const order = await AdminService.updateOrderStatusAdmin(orderId, status, { riderId });
        res.status(200).json({ success: true, data: order });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getOrderAnalytics(req, res) {
    try {
        const analytics = await AdminService.getOrderAnalytics();
        res.status(200).json({ success: true, data: analytics });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getRiderAnalytics(req, res) {
    try {
        const analytics = await AdminService.getRiderAnalytics();
        res.status(200).json({ success: true, data: analytics });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function broadcastNotification(req, res) {
    try {
        const { title, message, role } = req.body;
        if (!title?.trim() || !message?.trim()) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }
        const result = await NotificationService.sendBroadcastNotification({
            title: title.trim(),
            body: message.trim(),
            role: role || undefined,
        });
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message || 'Failed to send broadcast' });
    }
}
async function riderInsights(req, res) {
    try {
        const data = await (0, rider_service_1.getRiderInsights)(req.params.id);
        res.json({ success: true, data });
    }
    catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
}
async function riderJobHistory(req, res) {
    try {
        const { page, limit, kind, status } = req.query;
        const data = await (0, rider_service_1.getRiderJobsPaginated)(req.params.id, {
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            kind: kind,
            status: status,
        });
        res.json({ success: true, data });
    }
    catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
}
async function riderDailyReport(req, res) {
    try {
        const { startDate, endDate, riderId } = req.query;
        const data = await AdminService.getRiderDailyReport({
            startDate: startDate,
            endDate: endDate,
            riderId: riderId,
        });
        res.json({ success: true, data });
    }
    catch (e) {
        res.status(400).json({ success: false, message: e.message || 'Could not load report' });
    }
}
//# sourceMappingURL=admin.controller.js.map