import { Router } from 'express';
import * as OrderController from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getOrdersReadyForPickup } from '../services/order.service';

const orderRouter = Router();

// All order routes require authentication
orderRouter.use(authenticate);

// Customer
orderRouter.post('/', authorize('CUSTOMER'), OrderController.placeOrder);
orderRouter.delete('/:id/cancel', authorize('CUSTOMER'), OrderController.cancelOrder);

// Any authenticated role can view their own order
orderRouter.get('/:id', OrderController.getOrderById);

// Status updates — service layer enforces role permissions
orderRouter.patch('/:id/status', OrderController.updateOrderStatus);

// Admin only — view all orders
orderRouter.get('/', authorize('ADMIN'), OrderController.getAllOrders);

// GET /orders/ready-for-pickup  (rider-only)
orderRouter.get('/ready-for-pickup', authorize('RIDER'), async (req, res) => {
  const orders = await getOrdersReadyForPickup();
  res.json({ success: true, data: orders });
});

export default orderRouter;