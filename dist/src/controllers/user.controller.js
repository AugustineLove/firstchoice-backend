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
exports.getMe = getMe;
exports.updateProfile = updateProfile;
exports.changePassword = changePassword;
exports.getMyOrders = getMyOrders;
exports.getMyDeliveries = getMyDeliveries;
exports.getMyErrands = getMyErrands;
const UserService = __importStar(require("../services/user.service"));
async function getMe(req, res) {
    try {
        const user = await UserService.getUserById(req.user.id);
        res.status(200).json({ success: true, data: user });
    }
    catch (err) {
        res.status(404).json({ success: false, message: err.message });
    }
}
async function updateProfile(req, res) {
    try {
        const { name, email, profileImage } = req.body;
        const user = await UserService.updateProfile(req.user.id, {
            name,
            email,
            profileImage,
        });
        res.status(200).json({ success: true, data: user });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function changePassword(req, res) {
    try {
        const result = await UserService.changePassword(req.user.id, req.body);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getMyOrders(req, res) {
    try {
        const orders = await UserService.getUserOrders(req.user.id);
        res.status(200).json({ success: true, data: orders });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getMyDeliveries(req, res) {
    try {
        const deliveries = await UserService.getUserDeliveries(req.user.id);
        res.status(200).json({ success: true, data: deliveries });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getMyErrands(req, res) {
    try {
        const errands = await UserService.getUserErrands(req.user.id);
        res.status(200).json({ success: true, data: errands });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=user.controller.js.map