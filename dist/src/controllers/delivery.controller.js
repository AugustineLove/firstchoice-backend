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
exports.assignRider = assignRider;
exports.createDelivery = createDelivery;
exports.acceptDelivery = acceptDelivery;
exports.updateDeliveryStatus = updateDeliveryStatus;
exports.getDeliveryById = getDeliveryById;
exports.getPendingDeliveries = getPendingDeliveries;
exports.getMyRiderJobs = getMyRiderJobs;
exports.getAllDeliveries = getAllDeliveries;
const DeliveryService = __importStar(require("../services/delivery.service"));
async function assignRider(req, res) {
    try {
        const { riderId } = req.body;
        if (!riderId) {
            res.status(400).json({ success: false, message: 'riderId is required' });
            return;
        }
        const delivery = await DeliveryService.assignRiderToDelivery(req.params.id, riderId);
        res.status(200).json({ success: true, data: delivery });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function createDelivery(req, res) {
    try {
        const { pickupAddress, destinationAddress, itemDescription, paymentMethod } = req.body;
        if (!pickupAddress || !destinationAddress || !itemDescription) {
            res.status(400).json({
                success: false,
                message: 'pickupAddress, destinationAddress and itemDescription are required',
            });
            return;
        }
        if (!paymentMethod || !['CASH', 'MOMO'].includes(paymentMethod)) {
            res.status(400).json({ success: false, message: 'paymentMethod must be CASH or MOMO' });
            return;
        }
        const delivery = await DeliveryService.createDeliveryRequest(req.user.id, req.body);
        res.status(201).json({ success: true, data: delivery });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
// Rider self-accepts a pending delivery
async function acceptDelivery(req, res) {
    try {
        const delivery = await DeliveryService.riderAcceptDelivery(req.params.id, req.user.id);
        res.status(200).json({ success: true, data: delivery });
    }
    catch (err) {
        const code = err.message.includes('already') ? 409 : 400;
        res.status(code).json({ success: false, message: err.message });
    }
}
async function updateDeliveryStatus(req, res) {
    try {
        const { status } = req.body;
        if (!status) {
            res.status(400).json({ success: false, message: 'status is required' });
            return;
        }
        const delivery = await DeliveryService.updateDeliveryStatus(req.params.id, req.user.id, status);
        res.status(200).json({ success: true, data: delivery });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getDeliveryById(req, res) {
    try {
        const delivery = await DeliveryService.getDeliveryById(req.params.id, req.user.id);
        res.status(200).json({ success: true, data: delivery });
    }
    catch (err) {
        const code = err.message === 'Access denied' ? 403 : 404;
        res.status(code).json({ success: false, message: err.message });
    }
}
async function getPendingDeliveries(req, res) {
    try {
        const deliveries = await DeliveryService.getPendingDeliveries();
        res.status(200).json({ success: true, data: deliveries });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getMyRiderJobs(req, res) {
    try {
        const jobs = await DeliveryService.getRiderJobs(req.user.id);
        res.status(200).json({ success: true, data: jobs });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getAllDeliveries(req, res) {
    try {
        const { status, page, limit } = req.query;
        const result = await DeliveryService.getAllDeliveries({
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
//# sourceMappingURL=delivery.controller.js.map