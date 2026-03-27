import { Request, NextFunction } from 'express';
import { AppError } from './errorHandler';
import mongoose from 'mongoose';

/**
 * Middleware to enforce tenant isolation.
 * Extracts the tenant ID from the authenticated user and explicitly
 * binds it to requests. Rejects un-scoped requests to protected routes.
 */
export const requireTenant = (req: Request, _res: Request, next: NextFunction) => {
    try {
        const user = req.user;

        // If no user context exists, auth middleware failed or was missing
        if (!user) {
            return next(new AppError('Authentication required to identify tenant', 401));
        }

        // Strongly enforce that user has an associated tenant (except SuperAdmins if applicable)
        if (!user.tenantId) {
            return next(new AppError('No tenant association found for user', 403));
        }

        // Bind tenant ID explicitly to the request context
        req.tenantId = (user.tenantId as mongoose.Types.ObjectId).toString();
        
        // Expose helper on request object to strictly scope repository queries
        req.getTenantScope = () => ({ tenantId: req.tenantId! });

        next();
    } catch (error) {
        next(new AppError('Tenant verification failed', 500));
    }
};
