import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
    statusCode?: number;
    code?: number | string;
    keyValue?: Record<string, unknown>;
    errors?: Record<string, { message?: string }>;
}

export const errorHandler = (
    err: CustomError,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    void _next;
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let code = typeof err.code === 'string' ? err.code : 'INTERNAL_ERROR';

    // Mongoose duplicate key error
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        message = `${field} already exists`;
        code = 'DUPLICATE_KEY';
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        const errors = Object.values(err.errors || {}).map((e) => e?.message || 'Invalid value');
        message = errors.join(', ');
        code = 'VALIDATION_ERROR';
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid identifier';
        code = 'INVALID_IDENTIFIER';
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Error:', err);
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const safeMessage = statusCode >= 500 && isProduction ? 'Internal server error' : message;

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message: safeMessage,
            requestId: (req as Request & { id?: string }).id || undefined
        },
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

export class AppError extends Error {
    statusCode: number;
    code?: string;

    constructor(message: string, statusCode: number, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
