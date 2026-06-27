import express, { Request, Response, NextFunction } from 'express';
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

// PERF-8: Browser-side caching — eliminates repeat API calls for same data within 30s
const cacheControl = (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'private, max-age=30');
    next();
};

// protect() now enforces tenantId — no separate requireTenant needed
router.get('/dashboard', protect, checkPermission('analytics', 'view'), cacheControl, getDashboard);
router.get('/funnel', protect, checkPermission('analytics', 'view'), cacheControl, getFunnelAnalytics);
router.get('/velocity', protect, checkPermission('analytics', 'view'), cacheControl, getVelocityAnalytics);
router.get('/forecast', protect, checkPermission('analytics', 'view'), cacheControl, getForecastAnalytics);
router.get('/loss', protect, checkPermission('analytics', 'view'), cacheControl, getLossAnalytics);
router.get('/quality', protect, checkPermission('analytics', 'view'), cacheControl, getQualityAnalytics);

export default router;
