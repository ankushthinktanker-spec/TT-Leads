import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import User, { IUser } from '../models/user.model';
import RevokedToken from '../models/revoked-token.model';
import { verifyAccessToken } from '../utils/jwt.utils';

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

        const revoked = await RevokedToken.exists({ jti: decoded.jti });
        if (revoked) {
            throw new AppError('Token has been revoked', 401);
        }

        // Get user from token
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (user.status !== 'Active') {
            throw new AppError('User account is not active', 403);
        }

        req.user = user;
        // Bind tenant ID explicitly for session isolation
        if (user.tenantId) {
            req.tenantId = (user.tenantId as any).toString();
            req.getTenantScope = () => ({ tenantId: req.tenantId! });
        }
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
