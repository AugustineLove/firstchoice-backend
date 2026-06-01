import { Router } from 'express';
import * as ProductController from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const productRouter = Router();

// Public
productRouter.get('/search', ProductController.searchProducts);
productRouter.get('/vendor/:vendorId', ProductController.getProductsByVendor);
productRouter.get('/:id', ProductController.getProductById);

// Vendor only
productRouter.post('/', authenticate, authorize('VENDOR'), ProductController.createProduct);
productRouter.get('/me/all', authenticate, authorize('VENDOR'), ProductController.getMyProducts);
productRouter.patch('/:id', authenticate, authorize('VENDOR'), ProductController.updateProduct);
productRouter.delete('/:id', authenticate, authorize('VENDOR'), ProductController.deleteProduct);

export default productRouter;