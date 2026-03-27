import express from 'express';
import {
    getDeals,
    getDeal,
    createDealHandler,
    updateDealHandler,
    deleteDealHandler,
    updateDealStatus,
    updateDealStage,
    assignDealOwner
} from '../controllers/deal.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(checkPermission('deals', 'view'), getDeals)
    .post(checkPermission('deals', 'create'), createDealHandler);

router.route('/:id')
    .get(checkPermission('deals', 'view'), getDeal)
    .put(checkPermission('deals', 'edit'), updateDealHandler)
    .delete(authorize('Admin', 'Manager'), checkPermission('deals', 'delete'), deleteDealHandler);

router.patch('/:id/status', checkPermission('deals', 'status_change'), updateDealStatus);
router.patch('/:id/stage', checkPermission('deals', 'edit'), updateDealStage);
router.patch('/:id/assign', authorize('Admin', 'Manager'), checkPermission('deals', 'assign'), assignDealOwner);

export default router;
