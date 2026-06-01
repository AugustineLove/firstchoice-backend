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
const VendorController = __importStar(require("../controllers/vendor.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const vendorRouter = (0, express_1.Router)();
// Public
vendorRouter.get('/', VendorController.getAllVendors);
vendorRouter.get('/:id', VendorController.getVendorById);
// Authenticated
vendorRouter.post('/register', auth_middleware_1.authenticate, VendorController.registerVendor);
vendorRouter.get('/me/profile', auth_middleware_1.authenticate, VendorController.getMyVendorProfile);
vendorRouter.patch('/me/profile', auth_middleware_1.authenticate, VendorController.updateVendorProfile);
vendorRouter.get('/me/orders', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('VENDOR'), VendorController.getVendorOrders);
vendorRouter.get('/me/stats', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('VENDOR'), VendorController.getVendorStats);
exports.default = vendorRouter;
//# sourceMappingURL=vendor.routes.js.map