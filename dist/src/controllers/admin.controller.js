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
exports.getAllUsers = getAllUsers;
exports.updateUserStatus = updateUserStatus;
exports.getAllVendors = getAllVendors;
exports.updateVendorStatus = updateVendorStatus;
exports.getAllRiders = getAllRiders;
exports.assignRiderToOrder = assignRiderToOrder;
exports.getOrderAnalytics = getOrderAnalytics;
exports.getRiderAnalytics = getRiderAnalytics;
const AdminService = __importStar(require("../services/admin.service"));
async function getOverviewStats(req, res) {
    try {
        const stats = await AdminService.getOverviewStats();
        res.status(200).json({ success: true, data: stats });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
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
//# sourceMappingURL=admin.controller.js.map