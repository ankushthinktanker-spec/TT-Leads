import express from 'express';
import { protect } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';
import {
    getDashboard,
    getFunnelAnalytics,
    getVelocityAnalytics,
    getForecastAnalytics,
    getLossAnalytics,
    getQualityAnalytics
} from '../controllers/analytics.controller';

const router = express.Router();

router.get('/dashboard', protect, checkPermission('analytics', 'view'), getDashboard);
router.get('/funnel', protect, checkPermission('analytics', 'view'), getFunnelAnalytics);
router.get('/velocity', protect, checkPermission('analytics', 'view'), getVelocityAnalytics);
router.get('/forecast', protect, checkPermission('analytics', 'view'), getForecastAnalytics);
router.get('/loss', protect, checkPermission('analytics', 'view'), getLossAnalytics);
router.get('/quality', protect, checkPermission('analytics', 'view'), getQualityAnalytics);

export default router;
