// notification.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware'; // your auth middleware
import * as c from '../controllers/notification.controller';

const notificationRouter = Router();
notificationRouter.use(authenticate);
notificationRouter.get('/', c.listNotifications);
notificationRouter.patch('/read-all', c.markAllRead);   // must come before '/:id/read'
notificationRouter.patch('/:id/read', c.markRead);
notificationRouter.delete('/', c.clearAll);
export default notificationRouter;