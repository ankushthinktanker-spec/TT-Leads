import express from 'express';

const router = express.Router();

router.get('/', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || 'unknown',
        env: process.env.NODE_ENV || 'development'
    });
});

export default router;
