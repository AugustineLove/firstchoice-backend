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
exports.getLocations = getLocations;
exports.createLocation = createLocation;
exports.updateLocation = updateLocation;
exports.deleteLocation = deleteLocation;
const LocationService = __importStar(require("../services/delivery.service")); // wherever getAllLocations/searchLocations live
async function getLocations(req, res) {
    try {
        const { q } = req.query;
        const locations = q
            ? await LocationService.searchLocations(q)
            : await LocationService.getAllLocations();
        res.status(200).json({ success: true, data: locations });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function createLocation(req, res) {
    try {
        const { name, address, latitude, longitude } = req.body;
        if (!name || !address || latitude === undefined || longitude === undefined) {
            res.status(400).json({ success: false, message: 'name, address, latitude and longitude are required' });
            return;
        }
        const location = await LocationService.createLocation({ name, address, latitude, longitude });
        res.status(201).json({ success: true, data: location });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function updateLocation(req, res) {
    try {
        const location = await LocationService.updateLocation(req.params.id, req.body);
        res.status(200).json({ success: true, data: location });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function deleteLocation(req, res) {
    try {
        await LocationService.deleteLocation(req.params.id);
        res.status(200).json({ success: true, data: { message: 'Location deleted' } });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=location.controlller.js.map