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
const ProductController = __importStar(require("../controllers/product.controller"));
const ProductReviewController = __importStar(require("../controllers/productreview.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const productRouter = (0, express_1.Router)();
// Public
productRouter.get('/search', ProductController.searchProducts);
productRouter.get('/vendor/:vendorId', ProductController.getProductsByVendor);
// Reviews
productRouter.get('/:id/reviews', ProductReviewController.getProductReviews);
productRouter.get('/:id/reviews/summary', ProductReviewController.getProductReviewSummary);
productRouter.post('/:id/reviews', auth_middleware_1.authenticate, ProductReviewController.submitReview);
productRouter.delete('/reviews/:reviewId', auth_middleware_1.authenticate, ProductReviewController.deleteReview);
// Vendor only
productRouter.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('VENDOR'), ProductController.createProduct);
productRouter.get('/me/all', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('VENDOR', 'ADMIN'), ProductController.getMyProducts);
productRouter.patch('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('VENDOR', 'ADMIN'), ProductController.updateProduct);
productRouter.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('VENDOR', 'ADMIN'), ProductController.deleteProduct);
// Keep this LAST
productRouter.get('/:id', ProductController.getProductById);
exports.default = productRouter;
//# sourceMappingURL=product.routes.js.map