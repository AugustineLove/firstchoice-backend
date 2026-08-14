import { Router } from 'express';
import * as ProductController from '../controllers/product.controller';
import * as ProductReviewController from '../controllers/productreview.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const productRouter = Router();

// Public
productRouter.get('/search', ProductController.searchProducts);
productRouter.get('/vendor/:vendorId', ProductController.getProductsByVendor);

// Reviews
productRouter.get('/:id/reviews', ProductReviewController.getProductReviews);
productRouter.get('/:id/reviews/summary', ProductReviewController.getProductReviewSummary);
productRouter.post('/:id/reviews', authenticate, ProductReviewController.submitReview);
productRouter.delete('/reviews/:reviewId', authenticate, ProductReviewController.deleteReview);

// Vendor only
productRouter.post(
  '/',
  authenticate,
  authorize('VENDOR'),
  ProductController.createProduct
);

productRouter.get(
  '/me/all',
  authenticate,
  authorize('VENDOR'),
  ProductController.getMyProducts
);

productRouter.patch(
  '/:id',
  authenticate,
  authorize('VENDOR'),
  ProductController.updateProduct
);

productRouter.delete(
  '/:id',
  authenticate,
  authorize('VENDOR'),
  ProductController.deleteProduct
);

// Keep this LAST
productRouter.get('/:id', ProductController.getProductById);

export default productRouter;