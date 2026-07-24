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
exports.placeOrder = placeOrder;
exports.getOrderById = getOrderById;
exports.updateOrderStatus = updateOrderStatus;
exports.cancelOrder = cancelOrder;
exports.getAllOrders = getAllOrders;
exports.acceptOrder = acceptOrder;
exports.uploadOrderImage = uploadOrderImage;
const OrderService = __importStar(require("../services/order.service"));
async function placeOrder(req, res) {
    try {
        const { vendorId, items, note, deliveryAddress, paymentMethod, recipientName, recipientPhone } = req.body;
        if (!vendorId) {
            res.status(400).json({ success: false, message: 'vendorId is required' });
            return;
        }
        const hasItems = Array.isArray(items) && items.length > 0;
        const hasNote = typeof note === 'string' && note.trim().length > 0;
        if (!hasItems && !hasNote) {
            res.status(400).json({ success: false, message: 'Either items[] or a note is required' });
            return;
        }
        if (!deliveryAddress) {
            res.status(400).json({ success: false, message: 'deliveryAddress is required' });
            return;
        }
        if (!paymentMethod || !['CASH', 'MOMO'].includes(paymentMethod)) {
            res.status(400).json({ success: false, message: 'paymentMethod must be CASH or MOMO' });
            return;
        }
        // ordering for someone else — both fields become mandatory together
        if ((recipientName && !recipientPhone) || (recipientPhone && !recipientName)) {
            res.status(400).json({ success: false, message: 'recipientName and recipientPhone must be provided together' });
            return;
        }
        const order = await OrderService.placeOrder(req.user.id, req.body);
        res.status(201).json({ success: true, data: order });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getOrderById(req, res) {
    try {
        const order = await OrderService.getOrderById(req.params.id, req.user.id);
        res.status(200).json({ success: true, data: order });
    }
    catch (err) {
        const code = err.message === 'Access denied' ? 403 : 404;
        res.status(code).json({ success: false, message: err.message });
    }
}
async function updateOrderStatus(req, res) {
    try {
        const { status } = req.body;
        if (!status) {
            res.status(400).json({ success: false, message: 'status is required' });
            return;
        }
        const order = await OrderService.updateOrderStatus(req.params.id, req.user.id, status);
        res.status(200).json({ success: true, data: order });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function cancelOrder(req, res) {
    try {
        const order = await OrderService.cancelOrder(req.params.id, req.user.id);
        res.status(200).json({ success: true, data: order });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getAllOrders(req, res) {
    try {
        const { status, vendorId, customerId, page, limit } = req.query;
        const result = await OrderService.getAllOrders({
            status: status,
            vendorId: vendorId,
            customerId: customerId,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
        console.log(`All orders: ${JSON.stringify(result)}`);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function acceptOrder(req, res) {
    try {
        const delivery = await OrderService.riderAcceptOrder(req.params.id, req.user.id);
        res.status(200).json({ success: true, data: delivery });
    }
    catch (err) {
        const code = err.message.includes('already') ? 409 : 400;
        res.status(code).json({ success: false, message: err.message });
    }
}
async function uploadOrderImage(req, res) {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ success: false, message: 'No image uploaded' });
            return;
        }
        const order = await OrderService.attachOrderImage(req.params.id, req.user.id, file.buffer);
        res.status(200).json({ success: true, message: 'Image attached', data: { order } });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message || 'Image upload failed' });
    }
}
//# sourceMappingURL=order.controller.js.map