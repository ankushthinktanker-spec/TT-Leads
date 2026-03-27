import express, { Application, Request, Response } from 'express';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import pinoHttp, { Options as PinoHttpOptions } from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
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
import dealRoutes from './routes/deal.routes';
import pipelineRoutes from './routes/pipeline.routes';
import contractRoutes from './routes/contract.routes';
import invoiceRoutes from './routes/invoice.routes';
import subscriptionRoutes from './routes/subscription.routes';
import notificationRoutes from './routes/notification.routes';
import healthRoutes from './routes/health.route';
import { logSecurityEvent } from './services/security-event.service';

// Create Express app
const app: Application = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Middleware
app.use(helmet()); // Security headers
const corsOrigins = String(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174')
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

// Apply global API rate limiter
app.use(apiLimiter);

app.use(express.json({ limit: '1mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Parse URL-encoded bodies

const sanitizeInput = (input: unknown): unknown => {
    if (Array.isArray(input)) {
        return input.map((value) => sanitizeInput(value));
    }
    if (input && typeof input === 'object') {
        const record = input as Record<string, unknown>;
        const sanitized: Record<string, unknown> = {};
        Object.keys(record).forEach((key) => {
            if (key === '__proto__' || key === 'prototype' || key === 'constructor') return;
            sanitized[key] = sanitizeInput(record[key]);
        });
        return sanitized;
    }
    if (typeof input === 'string') {
        return input.trim();
    }
    return input;
};

app.use((req: Request, _res: Response, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeInput(req.body) as Record<string, unknown>;
    }
    next();
});

app.use((req: Request, res: Response, next) => {
    req.setTimeout(env.REQUEST_TIMEOUT_MS);
    res.setTimeout(env.REQUEST_TIMEOUT_MS, () => {
        if (!res.headersSent) {
            res.status(503).json({
                success: false,
                message: 'Request timeout'
            });
        }
    });
    next();
});

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
            'req.headers["x-api-key"]',
            'req.body.password',
            'req.body.currentPassword',
            'req.body.newPassword',
            'req.body.refreshToken',
            'req.body.token',
            'req.query.token'
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

const authFailureTracker = new Map<string, { count: number; resetAt: number }>();
app.use((req: Request, res: Response, next) => {
    res.on('finish', () => {
        if (res.statusCode !== 401 && res.statusCode !== 403) return;
        const key = req.ip || 'unknown-ip';
        const now = Date.now();
        const bucket = authFailureTracker.get(key);
        if (!bucket || bucket.resetAt < now) {
            authFailureTracker.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
            return;
        }
        bucket.count += 1;
        if (bucket.count >= 20) {
            authFailureTracker.set(key, { count: 0, resetAt: now + 10 * 60 * 1000 });
            void logSecurityEvent({
                eventType: 'auth.suspicious.repeated_denied',
                severity: 'high',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                requestId: (req as Request & { id?: string }).id,
                metadata: { path: req.originalUrl, statusCode: res.statusCode }
            });
        }
    });
    next();
});

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
app.use('/health', healthRoutes);

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
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
