import express from 'express';
import {
    getActivities,
    getActivity,
    createActivity,
    updateActivity,
    deleteActivity
} from '../controllers/activity.controller';
import { protect } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(checkPermission('activities', 'view'), getActivities)
    .post(checkPermission('activities', 'create'), createActivity);

router.route('/:id')
    .get(checkPermission('activities', 'view'), getActivity)
    .put(checkPermission('activities', 'edit'), updateActivity)
    .delete(checkPermission('activities', 'delete'), deleteActivity);

export default router;
