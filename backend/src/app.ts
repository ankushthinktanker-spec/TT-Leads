import express, { Application, Request, Response } from 'express';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
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

const parseCorsOrigins = (): string[] => {
    const configured = String(
        process.env.CORS_ORIGINS ||
        process.env.FRONTEND_URL ||
        'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174'
    )
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (process.env.NODE_ENV !== 'development') {
        return configured;
    }

    return Array.from(new Set([
        ...configured,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://[::1]:5173',
        'http://[::1]:5174',
    ]));
};

const corsOrigins = parseCorsOrigins();
const isAllowedOrigin = (origin: string): boolean => {
    if (corsOrigins.includes(origin)) {
        return true;
    }

    if (process.env.NODE_ENV !== 'development') {
        return false;
    }

    return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(origin);
};

// Middleware
app.use(helmet()); // Security headers
// PERF-7: gzip/brotli compression — reduces JSON response payload by 70-80%
app.use(compression());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }
        const allowed = isAllowedOrigin(origin);
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

// Periodic cleanup of expired auth failure tracking entries to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of authFailureTracker) {
        if (now > value.resetAt) {
            authFailureTracker.delete(key);
        }
    }
}, 60_000);

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

// ── v1 API Router ────────────────────────────────────────────────────────────
// All application routes live here. Mounted at /api/v1 (canonical) and /api
// (backward-compat alias so existing clients continue to work during migration).
const v1Router = express.Router();

v1Router.use('/auth', authLimiter, authRoutes);
v1Router.use('/leads', leadRoutes);
v1Router.use('/companies', companyRoutes);
v1Router.use('/contacts', contactRoutes);
v1Router.use('/activities', activityRoutes);
v1Router.use('/tasks', taskRoutes);
v1Router.use('/deals', dealRoutes);
v1Router.use('/pipelines', pipelineRoutes);
v1Router.use('/contracts', contractRoutes);
v1Router.use('/invoices', invoiceRoutes);
v1Router.use('/subscriptions', subscriptionRoutes);
v1Router.use('/notifications', notificationRoutes);
v1Router.use('/proposals', proposalRoutes);
v1Router.use('/proposal-templates', proposalTemplateRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/settings', settingsRoutes);
v1Router.use('/analytics', analyticsRoutes);
v1Router.use('/reports', reportsRoutes);
v1Router.use('/permissions', permissionRoutes);
v1Router.use('/roles', roleRoutes);

app.use('/api/v1', v1Router);   // canonical versioned path
app.use('/api', v1Router);      // backward-compat alias (remove after all clients migrate)

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
