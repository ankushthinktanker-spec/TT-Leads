import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Role from '../models/role.model';
import RolePermission from '../models/role-permission.model';
import User from '../models/user.model';
import { AppError } from '../middleware/errorHandler';
import { emptyPermissions, getEffectivePermissions, mergePermissions, sanitizePermissions } from '../utils/permission.utils';

export const getRoles = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const roles = await Role.find().sort({ name: 1 }).lean();
        res.status(200).json({ success: true, data: { roles } });
    } catch (error) {
        next(error);
    }
};

export const createRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, description, baseRole, permissions } = req.body || {};

        if (!name || typeof name !== 'string') {
            throw new AppError('Role name is required', 400);
        }

        const trimmed = name.trim();
        if (!trimmed) {
            throw new AppError('Role name is required', 400);
        }

        const existing = await Role.findOne({ name: trimmed });
        if (existing) {
            throw new AppError('Role already exists', 400);
        }

        const role = await Role.create({
            name: trimmed,
            description: typeof description === 'string' ? description.trim() : '',
            isSystem: false,
            createdBy: req.user?._id
        });

        let basePermissions = emptyPermissions();
        if (baseRole) {
            const baseRoleDoc = await Role.findOne({ name: baseRole }).lean();
            if (!baseRoleDoc) {
                throw new AppError('Base role not found', 400);
            }
            basePermissions = await getEffectivePermissions(baseRole);
        }
        const sanitized = sanitizePermissions(permissions || {});
        const merged = mergePermissions(basePermissions, sanitized);

        await RolePermission.create({
            role: trimmed,
            permissions: merged,
            updatedBy: req.user?._id
        });

        res.status(201).json({
            success: true,
            data: { role }
        });
    } catch (error) {
        next(error);
    }
};

export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, description } = req.body || {};
        const roleId = req.params.id;

        const role = await Role.findById(roleId);
        if (!role) {
            throw new AppError('Role not found', 404);
        }

        if (role.isSystem && name && name !== role.name) {
            throw new AppError('System role names cannot be changed', 400);
        }

        if (name && name !== role.name) {
            const exists = await Role.findOne({ name });
            if (exists) {
                throw new AppError('Role name already exists', 400);
            }

            await User.updateMany({ role: role.name }, { $set: { role: name } });
            await RolePermission.updateMany({ role: role.name }, { $set: { role: name } });
            role.name = name;
        }

        if (typeof description === 'string') {
            role.description = description.trim();
        }

        await role.save();

        res.status(200).json({ success: true, data: { role } });
    } catch (error) {
        next(error);
    }
};

export const deleteRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const roleId = req.params.id;
        const role = await Role.findById(roleId);

        if (!role) {
            throw new AppError('Role not found', 404);
        }

        if (role.isSystem) {
            throw new AppError('System roles cannot be deleted', 400);
        }

        const inUse = await User.exists({ role: role.name });
        if (inUse) {
            throw new AppError('Role is assigned to users and cannot be deleted', 400);
        }

        await RolePermission.deleteMany({ role: role.name });
        await role.deleteOne();

        res.status(200).json({ success: true, message: 'Role deleted' });
    } catch (error) {
        next(error);
    }
};
