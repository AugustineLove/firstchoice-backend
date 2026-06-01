import { Router } from 'express';
import * as UserController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const userRouter = Router();

// All user routes require authentication
userRouter.use(authenticate);

userRouter.get('/me', UserController.getMe);
userRouter.patch('/me', UserController.updateProfile);
userRouter.patch('/me/password', UserController.changePassword);
userRouter.get('/me/orders', UserController.getMyOrders);
userRouter.get('/me/deliveries', UserController.getMyDeliveries);
userRouter.get('/me/errands', UserController.getMyErrands);

export default userRouter;