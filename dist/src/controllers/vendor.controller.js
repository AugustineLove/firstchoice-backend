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
exports.registerVendor = registerVendor;
exports.getMyVendorProfile = getMyVendorProfile;
exports.updateVendorProfile = updateVendorProfile;
exports.getAllVendors = getAllVendors;
exports.getVendorById = getVendorById;
exports.getVendorOrders = getVendorOrders;
exports.getVendorStats = getVendorStats;
const VendorService = __importStar(require("../services/vendor.service"));
async function registerVendor(req, res) {
    try {
        const { businessName, businessType, address, phone, logo, openingHours } = req.body;
        if (!businessName || !businessType || !address || !phone) {
            res.status(400).json({
                success: false,
                message: 'businessName, businessType, address and phone are required',
            });
            return;
        }
        const vendor = await VendorService.registerVendor(req.user.id, req.body);
        res.status(201).json({ success: true, data: vendor });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getMyVendorProfile(req, res) {
    try {
        const vendor = await VendorService.getMyVendorProfile(req.user.id);
        res.status(200).json({ success: true, data: vendor });
    }
    catch (err) {
        res.status(404).json({ success: false, message: err.message });
    }
}
async function updateVendorProfile(req, res) {
    try {
        const vendor = await VendorService.updateVendorProfile(req.user.id, req.body);
        res.status(200).json({ success: true, data: vendor });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getAllVendors(req, res) {
    try {
        const { businessType, search } = req.query;
        const vendors = await VendorService.getAllVendors({
            businessType: businessType,
            search: search,
        });
        res.status(200).json({ success: true, data: vendors });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getVendorById(req, res) {
    try {
        const vendor = await VendorService.getVendorProfile(req.params.id);
        res.status(200).json({ success: true, data: vendor });
    }
    catch (err) {
        res.status(404).json({ success: false, message: err.message });
    }
}
async function getVendorOrders(req, res) {
    try {
        const orders = await VendorService.getVendorOrders(req.user.id);
        res.status(200).json({ success: true, data: orders });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getVendorStats(req, res) {
    try {
        const stats = await VendorService.getVendorStats(req.user.id);
        res.status(200).json({ success: true, data: stats });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=vendor.controller.js.map