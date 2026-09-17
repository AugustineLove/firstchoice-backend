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
exports.submitReview = submitReview;
exports.getProductReviews = getProductReviews;
exports.getProductReviewSummary = getProductReviewSummary;
exports.deleteReview = deleteReview;
const ProductReviewService = __importStar(require("../services/productreview.service"));
async function submitReview(req, res) {
    try {
        const { rating } = req.body;
        if (rating === undefined) {
            res.status(400).json({ success: false, message: 'rating is required' });
            return;
        }
        const review = await ProductReviewService.submitReview(req.user.id, req.params.id, req.body);
        res.status(201).json({ success: true, data: review });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getProductReviews(req, res) {
    try {
        const reviews = await ProductReviewService.getProductReviews(req.params.id);
        res.status(200).json({ success: true, data: reviews });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
// Auth-optional: logged-in customers additionally get `myReview` back so
// the frontend can show "edit your review" instead of "write a review".
async function getProductReviewSummary(req, res) {
    try {
        const summary = await ProductReviewService.getProductReviewSummary(req.params.id, req.user?.id);
        res.status(200).json({ success: true, data: summary });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function deleteReview(req, res) {
    try {
        const result = await ProductReviewService.deleteReview(req.user.id, req.params.reviewId);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=productreview.controller.js.map