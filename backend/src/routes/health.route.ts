import express from 'express';
import { canUseOfflineMode, isDatabaseReady } from '../config/runtime';

const router = express.Router();

router.get('/', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        database: isDatabaseReady() ? 'connected' : (canUseOfflineMode() ? 'offline-mode' : 'disconnected'),
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || 'unknown',
        env: process.env.NODE_ENV || 'development'
    });
});

export default router;
