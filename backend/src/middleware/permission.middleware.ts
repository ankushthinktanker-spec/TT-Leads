import { Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { AuthRequest } from './auth.middleware';
import { PermissionAction, PermissionModule, getEffectivePermissions } from '../utils/permission.utils';

export const checkPermission = (moduleKey: PermissionModule, actionKey: PermissionAction) => {
    return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                throw new AppError('Not authorized', 401);
            }

            const permissions = await getEffectivePermissions(req.user.role);
            const allowed = permissions?.[moduleKey]?.[actionKey];

            if (!allowed) {
                throw new AppError('Permission denied', 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

export const checkReportPermission = () => {
    return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
        const action = req.query.format ? 'export' : 'view';
        return checkPermission('reports', action as PermissionAction)(req, _res, next);
    };
};
