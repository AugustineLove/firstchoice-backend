import { Router } from 'express';
import * as TransactionController from '../controllers/transaction.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const transactionRouter = Router();

transactionRouter.use(authenticate);

// Customer records payment
transactionRouter.post('/', authorize('CUSTOMER'), TransactionController.recordTransaction);

// Customer, Vendor, Admin view order transaction
transactionRouter.get('/order/:orderId', TransactionController.getTransactionByOrder);

// Admin only
transactionRouter.get('/', authorize('ADMIN'), TransactionController.getAllTransactions);
transactionRouter.get('/summary', authorize('ADMIN'), TransactionController.getTransactionSummary);

export default transactionRouter;