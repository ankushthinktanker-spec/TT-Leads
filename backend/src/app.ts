import express, { Application, Request, Response } from 'express';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import 'express-async-errors';
import pinoHttp, { Options as PinoHttpOptions } from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';
import connectDB from './config/database';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import leadRoutes from './routes/lead.routes';
import companyRoutes from './routes/company.routes';
import contactRoutes from './routes/contact.routes';
import activityRoutes from './routes/activity.routes';
import taskRoutes from './routes/task.routes';
import proposalRoutes from './routes/proposal.routes';
import proposalTemplateRoutes from './routes/proposal-template.routes';
import userRoutes from './routes/user.routes';
import settingsRoutes from './routes/settings.routes';
import analyticsRoutes from './routes/analytics.routes';
import reportsRoutes from './routes/reports.routes';
import permissionRoutes from './routes/permission.routes';
import roleRoutes from './routes/role.routes';
import { ensureDefaultRoles } from './utils/role.utils';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();
app.disable('x-powered-by');

// Connect to MongoDB
connectDB()
    .then(() => ensureDefaultRoles())
    .catch((error) => {
        console.error('Failed to seed default roles', error);
    });

// Middleware
app.use(helmet()); // Security headers
const corsOrigins = String(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }
        const allowed = corsOrigins.includes(origin);
        callback(allowed ? null : new Error('CORS not allowed'), allowed);
    },
    credentials: true
}));
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
}));
app.use(express.json({ limit: '2mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '2mb' })); // Parse URL-encoded bodies
// Static uploads are intentionally not exposed; use authenticated routes instead.

app.use((req: Request, res: Response, next) => {
    const headerId = req.headers['x-request-id'];
    const requestId = Array.isArray(headerId) ? headerId[0] : headerId;
    const id = requestId || crypto.randomUUID();
    (req as Request & { id?: string }).id = id;
    res.setHeader('x-request-id', id);
    next();
});

const logRequests = String(process.env.LOG_HTTP_REQUESTS || '').toLowerCase() === 'true';
const sampleRate = Number(process.env.LOG_SAMPLE_RATE || 1);
const httpLoggerOptions: PinoHttpOptions<IncomingMessage, ServerResponse> = {
    transport: process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' }
        }
        : undefined,
    autoLogging: {
        ignore: (req: IncomingMessage) => {
            if (req?.url?.startsWith('/api/auth/refresh-token')) {
                return true;
            }
            if (sampleRate > 0 && sampleRate < 1) {
                return Math.random() > sampleRate;
            }
            return false;
        }
    },
    customLogLevel: (_req, res, err) => {
        const statusCode = res?.statusCode || 0;
        if (!logRequests && statusCode < 400) return 'silent';
        if (err || statusCode >= 500) return 'error';
        if (statusCode >= 400) return 'warn';
        return 'info';
    },
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["set-cookie"]',
            'req.headers["x-api-key"]'
        ],
        censor: '[redacted]'
    },
    serializers: logRequests
        ? undefined
        : {
            req: (req) => ({
                method: req.method,
                url: req.url,
                remoteAddress: req.remoteAddress,
                remotePort: req.remotePort
            }),
            res: (res) => ({
                statusCode: res.statusCode
            })
        },
    customProps: (req) => ({
        requestId: (req as IncomingMessage & { id?: string }).id || 'unknown',
        userId: (req as IncomingMessage & { user?: { _id?: unknown } }).user?._id
            ? String((req as IncomingMessage & { user?: { _id?: unknown } }).user?._id)
            : 'anon'
    })
};

const httpLogger = pinoHttp(httpLoggerOptions);
app.use(httpLogger);

const slowRequestMs = Number(process.env.SLOW_REQUEST_MS || 0);
if (slowRequestMs > 0) {
    app.use((req: Request, res: Response, next) => {
        const start = process.hrtime.bigint();
        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
            if (durationMs < slowRequestMs) return;
            const logger = (req as Request & { log?: { warn?: (obj: unknown, msg?: string) => void } }).log;
            logger?.warn?.({
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                durationMs: Math.round(durationMs)
            }, 'Slow request');
        });
        next();
    });
}

// Health check route
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'ThinkTanker Lead Management API is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false
}), authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/proposal-templates', proposalTemplateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/roles', roleRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
