import express from 'express';
import { getNotifications, markNotificationReadHandler } from '../controllers/notification.controller';
import { protect } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = express.Router();

router.use(protect);

router.get('/', checkPermission('notifications', 'view'), getNotifications);
router.patch('/:id/read', checkPermission('notifications', 'edit'), markNotificationReadHandler);

export default router;
