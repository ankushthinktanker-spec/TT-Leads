import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import User, { IUser } from '../models/user.model';
import RevokedToken from '../models/revoked-token.model';
import { verifyAccessToken } from '../utils/jwt.utils';
import { canUseOfflineMode, getOfflineAdminProfile } from '../config/runtime';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Short-lived user session cache — eliminates one DB hit per request.
// 30 s TTL balances freshness with performance. Status/role changes propagate
// within 30 s in the worst case, which is acceptable for this use case.
// ---------------------------------------------------------------------------
const userCache = new Map<string, { user: IUser; expiresAt: number }>();
const USER_CACHE_TTL_MS = 30_000;

function getCachedUser(userId: string): IUser | undefined {
    const entry = userCache.get(userId);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
        userCache.delete(userId);
        return undefined;
    }
    return entry.user;
}

function setCachedUser(userId: string, user: IUser): void {
    userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
}

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of userCache) {
        if (now > entry.expiresAt) userCache.delete(key);
    }
}, 60_000);

export interface AuthRequest extends Request {
    user?: IUser;
    tenantId?: string;
    getTenantScope?: () => { tenantId: string };
}

export const protect = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        let token: string | undefined;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Auth missing:', req.method, req.originalUrl);
            }
            throw new AppError('Not authorized to access this route', 401);
        }

        // Verify token
        const decoded = verifyAccessToken(token);

        if (canUseOfflineMode()) {
            const offlineUser = getOfflineAdminProfile();
            if (decoded.id === offlineUser.id) {
                const syntheticUser = {
                    _id: new mongoose.Types.ObjectId(offlineUser._id),
                    id: offlineUser.id,
                    email: offlineUser.email,
                    firstName: offlineUser.firstName,
                    lastName: offlineUser.lastName,
                    role: offlineUser.role,
                    status: offlineUser.status,
                    tenantId: new mongoose.Types.ObjectId(offlineUser.tenantId),
                } as IUser;
                req.user = syntheticUser;
                req.tenantId = offlineUser.tenantId;
                req.getTenantScope = () => ({ tenantId: offlineUser.tenantId });
                next();
                return;
            }
        }

        const revoked = await RevokedToken.exists({ jti: decoded.jti });
        if (revoked) {
            throw new AppError('Token has been revoked', 401);
        }

        // Get user from token — check short-lived cache first to avoid a DB hit per request
        let user = getCachedUser(decoded.id);
        if (!user) {
            user = await User.findById(decoded.id).select('-password') as IUser | null ?? undefined;
            if (user) setCachedUser(decoded.id, user);
        }

        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (user.status !== 'Active') {
            throw new AppError('User account is not active', 403);
        }

        req.user = user;
        // Enforce tenant isolation — every user must belong to a tenant
        if (!user.tenantId) {
            throw new AppError('No tenant association found for user', 403);
        }
        req.tenantId = String(user.tenantId);
        req.getTenantScope = () => ({ tenantId: req.tenantId! });
        next();
    } catch (error) {
        next(error);
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            throw new AppError('Not authorized', 401);
        }

        if (!roles.includes(req.user.role)) {
            throw new AppError(
                `User role '${req.user.role}' is not authorized to access this route`,
                403
            );
        }

        next();
    };
};

export const requireRole = (...roles: string[]) => authorize(...roles);
