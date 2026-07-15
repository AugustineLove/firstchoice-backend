import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const authRoutes = Router();

authRoutes.post('/register', AuthController.register);
authRoutes.post('/login', AuthController.login);
authRoutes.post('/refresh', AuthController.refresh);
authRoutes.get('/me', authenticate, AuthController.me);
authRoutes.post('/forgot-password', AuthController.forgotPassword);
authRoutes.post('/reset-password', AuthController.resetPassword);
authRoutes.post('/sync-reset-password', AuthController.syncResetPassword);

export default authRoutes;