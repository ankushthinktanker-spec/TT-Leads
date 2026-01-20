import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
    statusCode?: number;
    code?: number;
    keyValue?: Record<string, unknown>;
    errors?: Record<string, { message?: string }>;
}

export const errorHandler = (
    err: CustomError,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    void _req;
    void _next;
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Mongoose duplicate key error
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        message = `${field} already exists`;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        const errors = Object.values(err.errors || {}).map((e) => e?.message || 'Invalid value');
        message = errors.join(', ');
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid identifier';
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Error:', err);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

export class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
