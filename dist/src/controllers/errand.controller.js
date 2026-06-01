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
exports.createErrand = createErrand;
exports.getErrandById = getErrandById;
exports.updateErrandStatus = updateErrandStatus;
exports.getAllErrands = getAllErrands;
const ErrandService = __importStar(require("../services/errand.service"));
async function createErrand(req, res) {
    try {
        const { description, budget } = req.body;
        if (!description || !budget) {
            res.status(400).json({
                success: false,
                message: 'description and budget are required',
            });
            return;
        }
        const errand = await ErrandService.createErrand(req.user.id, req.body);
        res.status(201).json({ success: true, data: errand });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getErrandById(req, res) {
    try {
        const errand = await ErrandService.getErrandById(req.params.id, req.user.id);
        res.status(200).json({ success: true, data: errand });
    }
    catch (err) {
        const code = err.message === 'Access denied' ? 403 : 404;
        res.status(code).json({ success: false, message: err.message });
    }
}
async function updateErrandStatus(req, res) {
    try {
        const { status } = req.body;
        if (!status) {
            res.status(400).json({ success: false, message: 'status is required' });
            return;
        }
        const errand = await ErrandService.updateErrandStatus(req.params.id, req.user.id, status);
        res.status(200).json({ success: true, data: errand });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getAllErrands(req, res) {
    try {
        const { status, page, limit } = req.query;
        const result = await ErrandService.getAllErrands({
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
//# sourceMappingURL=errand.controller.js.map