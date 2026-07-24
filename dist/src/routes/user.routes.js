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
const multer_1 = __importDefault(require("multer"));
const UserController = __importStar(require("../controllers/user.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const notification_service_1 = require("../services/notification.service");
const userRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed'));
            return;
        }
        cb(null, true);
    },
});
userRouter.use(auth_middleware_1.authenticate);
userRouter.post('/me/fcm-token', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ success: false, message: 'token required' });
            return;
        }
        const cleanToken = token
            .normalize('NFC')
            .replace(/[\u2014\u2013]/g, '-')
            .replace(/[\x00-\x1F\x7F]/g, '')
            .trim();
        if (!cleanToken) {
            res.status(400).json({ success: false, message: 'Invalid token' });
            return;
        }
        await (0, notification_service_1.updateFcmToken)(req.user.id, cleanToken);
        res.status(200).json({ success: true, message: 'FCM token updated' });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
userRouter.get('/me', UserController.getMe);
userRouter.patch('/me', UserController.updateProfile);
userRouter.post('/me/avatar', upload.single('image'), UserController.uploadAvatar);
userRouter.patch('/me/password', UserController.changePassword);
userRouter.get('/me/orders', UserController.getMyOrders);
userRouter.get('/me/deliveries', UserController.getMyDeliveries);
userRouter.get('/me/errands', UserController.getMyErrands);
exports.default = userRouter;
//# sourceMappingURL=user.routes.js.map