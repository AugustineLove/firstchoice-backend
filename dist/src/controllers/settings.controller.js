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
exports.getErrandSettings = getErrandSettings;
exports.getAdminSettings = getAdminSettings;
exports.patchAdminSettings = patchAdminSettings;
exports.getOperatingStatus = getOperatingStatus;
exports.updateOperatingHours = updateOperatingHours;
exports.setOperatingOverride = setOperatingOverride;
exports.clearOperatingOverride = clearOperatingOverride;
const SettingsService = __importStar(require("../services/setting.service"));
async function getErrandSettings(req, res) {
    const data = await SettingsService.getErrandPricingForCustomers();
    res.json({ success: true, data });
}
async function getAdminSettings(req, res) {
    const s = await SettingsService.getSettings();
    res.json({ success: true, data: s });
}
async function patchAdminSettings(req, res) {
    try {
        const s = await SettingsService.updateSettings(req.body);
        res.json({ success: true, data: s });
    }
    catch (e) {
        res.status(400).json({ success: false, message: e.message || 'Could not save settings' });
    }
}
async function getOperatingStatus(req, res) {
    try {
        const status = await SettingsService.getOperatingStatus();
        return res.json({ success: true, data: status });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function updateOperatingHours(req, res) {
    try {
        const updated = await SettingsService.updateOperatingHours(req.body.hours);
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
}
async function setOperatingOverride(req, res) {
    try {
        const { durationMinutes } = req.body;
        const updated = await SettingsService.setOperatingOverride(Number(durationMinutes));
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
}
async function clearOperatingOverride(req, res) {
    try {
        const updated = await SettingsService.clearOperatingOverride();
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=settings.controller.js.map