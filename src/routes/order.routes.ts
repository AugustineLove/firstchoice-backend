import { Router } from 'express';
import * as OrderController from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getOrdersReadyForPickup, riderAcceptOrder } from '../services/order.service';
import multer from 'multer';
import { requireOperatingHours } from '../middleware/operating.hours';

const orderRouter = Router();

// All order routes require authentication
orderRouter.use(authenticate);

// Customer
orderRouter.post('/', authorize('CUSTOMER'), requireOperatingHours, OrderController.placeOrder);
orderRouter.delete('/:id/cancel', authorize('CUSTOMER'), OrderController.cancelOrder);
orderRouter.post('/:id/rider-accept', OrderController.acceptOrder);
orderRouter.get('/ready-for-pickup', async (req, res) => {
  const orders = await getOrdersReadyForPickup();
  res.json({ success: true, data: orders });
});


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) { cb(new Error('Only image files are allowed')); return; }
    cb(null, true);
  },
});

orderRouter.post('/:id/image', authenticate, upload.single('image'), OrderController.uploadOrderImage);

// Any authenticated role can view their own order
orderRouter.get('/:id', OrderController.getOrderById);

// Status updates
orderRouter.patch('/:id/status', OrderController.updateOrderStatus);

// Admin only
// orderRouter.get('/', authorize('ADMIN'), OrderController.getAllOrders);
orderRouter.get('/', OrderController.getAllOrders);
export default orderRouter;