import express from 'express';
import {
    getSubscriptions,
    getSubscription,
    createSubscriptionHandler,
    updateSubscriptionHandler,
    deleteSubscriptionHandler,
    updateSubscriptionStatus,
    getUpcomingSubscriptions
} from '../controllers/subscription.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = express.Router();

router.use(protect);

router.get('/upcoming', checkPermission('subscriptions', 'view'), getUpcomingSubscriptions);

router.route('/')
    .get(checkPermission('subscriptions', 'view'), getSubscriptions)
    .post(checkPermission('subscriptions', 'create'), createSubscriptionHandler);

router.route('/:id')
    .get(checkPermission('subscriptions', 'view'), getSubscription)
    .put(checkPermission('subscriptions', 'edit'), updateSubscriptionHandler)
    .delete(authorize('Admin', 'Manager'), checkPermission('subscriptions', 'delete'), deleteSubscriptionHandler);

router.patch('/:id/status', checkPermission('subscriptions', 'edit'), updateSubscriptionStatus);

export default router;
