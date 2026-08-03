import { Router } from 'express';
import multer from 'multer';
import * as UserController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { updateFcmToken } from '../services/notification.service';
import { AuthRequest } from '../interface/auth-request.interface.ts';
import { prisma } from '../config/prisma';
// import { generateTelegramLink } from '../services/telegram.service';

const userRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

userRouter.use(authenticate);

userRouter.post('/me/fcm-token', authenticate, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ success: false, message: 'token required' });
      return;
    }
    const cleanToken = token
      .normalize('NFC')
      .replace(/[\u2014\u2013]/g, '-')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim();

    if (!cleanToken) {
      res.status(400).json({ success: false, message: 'Invalid token' });
      return;
    }

    await updateFcmToken(req.user!.id, cleanToken);
    res.status(200).json({ success: true, message: 'FCM token updated' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

userRouter.patch('/web-fcm-token', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.body.token) { res.status(400).json({ success: false, message: 'token required' }); return; }
    await prisma.user.update({ where: { id: req.user!.id }, data: { webFcmToken: req.body.token } });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[web-fcm-token] failed:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// userRouter.patch('/me/telegram-chat-id', authenticate, async (req: AuthRequest, res) => {
//   try {
//     if (!req.body.chatId) { res.status(400).json({ success: false, message: 'chatId required' }); return; }
//     await prisma.user.update({ where: { id: req.user!.id }, data: { telegramChatId: String(req.body.chatId) } });
//     res.json({ success: true });
//   } catch (err: any) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// userRouter.get('/me/telegram-link', authenticate, async (req: AuthRequest, res) => {
//   try {
//     const link = await generateTelegramLink(req.user!.id);
//     res.json({ success: true, data: { link } });
//   } catch (err: any) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });


userRouter.get('/me', UserController.getMe);
userRouter.patch('/me', UserController.updateProfile);
userRouter.post('/me/avatar', upload.single('image'), UserController.uploadAvatar);
userRouter.patch('/me/password', UserController.changePassword);
userRouter.get('/me/orders', UserController.getMyOrders);
userRouter.get('/me/deliveries', UserController.getMyDeliveries);
userRouter.get('/me/errands', UserController.getMyErrands);

export default userRouter;