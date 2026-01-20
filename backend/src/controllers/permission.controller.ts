import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import RolePermission from '../models/role-permission.model';
import Role from '../models/role.model';
import {
    DEFAULT_ROLE_PERMISSIONS,
    PERMISSION_ACTIONS,
    PERMISSION_MODULES,
    emptyPermissions,
    getEffectivePermissions,
    sanitizePermissions
} from '../utils/permission.utils';
import { AppError } from '../middleware/errorHandler';

export const getAllRolePermissions = async (
    _req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const rolesList = await Role.find().sort({ name: 1 }).lean();
        const storedPermissions = await RolePermission.find().lean();
        const docMap = new Map<string, Record<string, unknown>>(
            storedPermissions.map((doc) => [doc.role, doc as Record<string, unknown>])
        );

        const roles = rolesList.map((roleDoc) => {
            const roleName = roleDoc.name;
            const doc = docMap.get(roleName);
            const defaultPerms = DEFAULT_ROLE_PERMISSIONS[roleName] || emptyPermissions();
            const permissions = doc
                ? getEffectivePermissions(roleName)
                : Promise.resolve(defaultPerms);
            return { role: roleName, permissions, isCustom: !roleDoc.isSystem };
        });

        const resolvedRoles = await Promise.all(
            roles.map(async (roleEntry) => ({
                ...roleEntry,
                permissions: await roleEntry.permissions
            }))
        );

        res.status(200).json({
            success: true,
            data: {
                roles: resolvedRoles,
                modules: PERMISSION_MODULES,
                actions: PERMISSION_ACTIONS
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getMyPermissions = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user!) {
            throw new AppError('Not authorized', 401);
        }

        const permissions = await getEffectivePermissions(req.user!.role);

        res.status(200).json({
            success: true,
            data: {
                role: req.user!.role,
                permissions
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateRolePermissions = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user!) {
            throw new AppError('Not authorized', 401);
        }

        const role = req.params.role;
        const roleDoc = await Role.findOne({ name: role }).lean();
        if (!roleDoc) {
            throw new AppError('Invalid role', 400);
        }

        const sanitized = sanitizePermissions(req.body?.permissions);

        const updated = await RolePermission.findOneAndUpdate(
            { role },
            { role, permissions: sanitized, updatedBy: req.user!._id },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();

        const permissions = await getEffectivePermissions(role);

        res.status(200).json({
            success: true,
            data: {
                role,
                permissions,
                updatedBy: updated?.updatedBy
            }
        });
    } catch (error) {
        next(error);
    }
};
