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
exports.submitRating = submitRating;
exports.getRatingSummary = getRatingSummary;
exports.getRatings = getRatings;
const RatingService = __importStar(require("../services/rating.service"));
// POST /vendors/:id/rating   (auth required, customer)
async function submitRating(req, res) {
    try {
        const { rating, comment } = req.body;
        if (rating === undefined || rating === null) {
            res.status(400).json({ success: false, message: 'rating is required' });
            return;
        }
        const result = await RatingService.submitVendorRating(req.params.id, req.user.id, Number(rating), comment);
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        const code = err.message.includes('already') ? 409 : 400;
        res.status(code).json({ success: false, message: err.message });
    }
}
// GET /vendors/:id/rating/summary   (auth optional — includes myRating if logged in)
async function getRatingSummary(req, res) {
    try {
        const summary = await RatingService.getVendorRatingSummary(req.params.id, req.user?.id);
        res.status(200).json({ success: true, data: summary });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
// GET /vendors/:id/ratings   (public — paginated review list)
async function getRatings(req, res) {
    try {
        const { page, limit } = req.query;
        const result = await RatingService.getVendorRatings(req.params.id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=rating.controller.js.map