import rateLimit from 'express-rate-limit';
import { AppError } from './errorHandler';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per `window` (for auth)
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (_req, _res, next) => {
        next(new AppError('Too many authentication attempts from this IP, please try again after 15 minutes', 429));
    }
});

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per `window`
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
        next(new AppError('Too many requests from this IP, please try again after 15 minutes', 429));
    }
});

export const sensitiveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 requests per `window`
    message: 'Too many sensitive operations requested from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
        next(new AppError('Too many sensitive operations requested from this IP, please try again after an hour', 429));
    }
});
