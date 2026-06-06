import { Router } from 'express';
import * as UserController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { updateFcmToken } from '../services/notification.service';
import { AuthRequest } from '../interface/auth-request.interface.ts';

const userRouter = Router();

// All user routes require authentication
userRouter.use(authenticate);

// Add user token
userRouter.post('/me/fcm-token', authenticate, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    console.log(token);
    if (!token) {
      res.status(400).json({ success: false, message: 'token required' });
      return;
    }

    // Sanitize before storing
    const cleanToken = token .normalize("NFC")
    // 2. Replace stylistic em-dashes or en-dashes with a standard plain hyphen
    .replace(/[\u2014\u2013]/g, "-")
    // 3. Strip out invisible control characters (ASCII 0-31 and 127)
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();

    if (!cleanToken) {
      res.status(400).json({ success: false, message: 'Invalid token' });
      return;
    }

    console.log(`User token: ${cleanToken}`)

    await updateFcmToken(req.user!.id, cleanToken);
    res.status(200).json({ success: true, message: 'FCM token updated' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});


userRouter.get('/me', UserController.getMe);
userRouter.patch('/me', UserController.updateProfile);
userRouter.patch('/me/password', UserController.changePassword);
userRouter.get('/me/orders', UserController.getMyOrders);
userRouter.get('/me/deliveries', UserController.getMyDeliveries);
userRouter.get('/me/errands', UserController.getMyErrands);





export default userRouter;