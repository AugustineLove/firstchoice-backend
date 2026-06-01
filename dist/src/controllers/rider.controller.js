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
exports.registerRider = registerRider;
exports.getMyRiderProfile = getMyRiderProfile;
exports.getRiderById = getRiderById;
exports.toggleAvailability = toggleAvailability;
exports.updateLocation = updateLocation;
exports.getAvailableRiders = getAvailableRiders;
exports.getMyEarnings = getMyEarnings;
exports.getMyActiveJobs = getMyActiveJobs;
exports.getMyJobHistory = getMyJobHistory;
const RiderService = __importStar(require("../services/rider.service"));
async function registerRider(req, res) {
    try {
        const { bikeType, licenseNumber } = req.body;
        if (!bikeType) {
            res.status(400).json({ success: false, message: 'bikeType is required' });
            return;
        }
        const rider = await RiderService.registerRider(req.user.id, req.body);
        res.status(201).json({ success: true, data: rider });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getMyRiderProfile(req, res) {
    try {
        const rider = await RiderService.getMyRiderProfile(req.user.id);
        res.status(200).json({ success: true, data: rider });
    }
    catch (err) {
        res.status(404).json({ success: false, message: err.message });
    }
}
async function getRiderById(req, res) {
    try {
        const rider = await RiderService.getRiderProfile(req.params.id);
        res.status(200).json({ success: true, data: rider });
    }
    catch (err) {
        res.status(404).json({ success: false, message: err.message });
    }
}
async function toggleAvailability(req, res) {
    try {
        const { availability } = req.body;
        if (!availability || !['ONLINE', 'OFFLINE'].includes(availability)) {
            res.status(400).json({
                success: false,
                message: 'availability must be ONLINE or OFFLINE',
            });
            return;
        }
        const rider = await RiderService.toggleAvailability(req.user.id, availability);
        res.status(200).json({ success: true, data: rider });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function updateLocation(req, res) {
    try {
        const { latitude, longitude } = req.body;
        if (latitude === undefined || longitude === undefined) {
            res.status(400).json({
                success: false,
                message: 'latitude and longitude are required',
            });
            return;
        }
        const rider = await RiderService.updateRiderLocation(req.user.id, {
            latitude,
            longitude,
        });
        res.status(200).json({ success: true, data: rider });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getAvailableRiders(req, res) {
    try {
        const riders = await RiderService.getAvailableRiders();
        res.status(200).json({ success: true, data: riders });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getMyEarnings(req, res) {
    try {
        const earnings = await RiderService.getRiderEarnings(req.user.id);
        res.status(200).json({ success: true, data: earnings });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getMyActiveJobs(req, res) {
    try {
        const jobs = await RiderService.getRiderActiveJobs(req.user.id);
        res.status(200).json({ success: true, data: jobs });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getMyJobHistory(req, res) {
    try {
        const history = await RiderService.getRiderJobHistory(req.user.id);
        res.status(200).json({ success: true, data: history });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=rider.controller.js.map