import { Router } from 'express';
import * as UserController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { updateFcmToken } from '../services/notification.service';
import { AuthRequest } from '../interface/auth-request.interface.ts';

const userRouter = Router();

// All user routes require authentication
userRouter.use(authenticate);

userRouter.get('/me', UserController.getMe);
userRouter.patch('/me', UserController.updateProfile);
userRouter.patch('/me/password', UserController.changePassword);
userRouter.get('/me/orders', UserController.getMyOrders);
userRouter.get('/me/deliveries', UserController.getMyDeliveries);
userRouter.get('/me/errands', UserController.getMyErrands);


// Add user token
userRouter.post('/me/fcm-token', authenticate, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    if (!token) { res.status(400).json({ success: false, message: 'token required' }); return; }
    await updateFcmToken(req.user!.id, token);
    res.status(200).json({ success: true, message: 'FCM token updated' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});


export default userRouter;