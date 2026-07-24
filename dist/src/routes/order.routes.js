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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const OrderController = __importStar(require("../controllers/order.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const order_service_1 = require("../services/order.service");
const multer_1 = __importDefault(require("multer"));
const orderRouter = (0, express_1.Router)();
// All order routes require authentication
orderRouter.use(auth_middleware_1.authenticate);
// Customer
orderRouter.post('/', (0, auth_middleware_1.authorize)('CUSTOMER'), OrderController.placeOrder);
orderRouter.delete('/:id/cancel', (0, auth_middleware_1.authorize)('CUSTOMER'), OrderController.cancelOrder);
orderRouter.post('/:id/rider-accept', OrderController.acceptOrder);
orderRouter.get('/ready-for-pickup', async (req, res) => {
    const orders = await (0, order_service_1.getOrdersReadyForPickup)();
    console.log(JSON.stringify);
    res.json({ success: true, data: orders });
});
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed'));
            return;
        }
        cb(null, true);
    },
});
orderRouter.post('/:id/image', auth_middleware_1.authenticate, upload.single('image'), OrderController.uploadOrderImage);
// Any authenticated role can view their own order
orderRouter.get('/:id', OrderController.getOrderById);
// Status updates
orderRouter.patch('/:id/status', OrderController.updateOrderStatus);
// Admin only
// orderRouter.get('/', authorize('ADMIN'), OrderController.getAllOrders);
orderRouter.get('/', OrderController.getAllOrders);
exports.default = orderRouter;
//# sourceMappingURL=order.routes.js.map