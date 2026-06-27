import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/user.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { writeAuditLog } from '../services/audit.service';
import { escapeRegex } from '../utils/regex.utils';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';

const USER_UPDATE_ALLOWLIST = new Set([
    'firstName',
    'lastName',
    'email',
    'phone',
    'avatar',
    'role',
    'status',
    'teamId',
    'managerId',
    'emailNotifications',
    'smsNotifications',
    'timezone'
]);

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
export const getUsers = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { search, role, status } = req.query;

        const filter: Record<string, unknown> = { tenantId: req.tenantId! };
        if (role) filter.role = role;
        if (status) filter.status = status;
        if (search) {
            const escapedSearch = escapeRegex(search as string);
            filter.$or = [
                { firstName: { $regex: escapedSearch, $options: 'i' } },
                { lastName: { $regex: escapedSearch, $options: 'i' } },
                { email: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);

        const users = await User.find(filter)
            .select('-password')
            .populate('teamId', 'name')
            .populate('managerId', 'firstName lastName')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        const total = await User.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                data: users,
                meta: buildPaginationMeta(page, limit, total)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin only)
export const getUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid user identifier', 400);
        }

        const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId! })
            .select('-password')
            .populate('teamId', 'name')
            .populate('managerId', 'firstName lastName');

        if (!user) {
            throw new AppError('User not found', 404);
        }

        res.status(200).json({
            success: true,
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin only)
export const updateUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid user identifier', 400);
        }

        const { password, ...inputData } = req.body;
        if (password) {
            throw new AppError('Password cannot be updated through this route', 400);
        }

        const updateData: Record<string, unknown> = {};
        Object.keys(inputData || {}).forEach((key) => {
            if (USER_UPDATE_ALLOWLIST.has(key)) {
                updateData[key] = inputData[key];
            }
        });

        if (Object.keys(updateData).length === 0) {
            throw new AppError('No allowed fields provided for update', 400);
        }

        const user = await User.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId! },
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            throw new AppError('User not found', 404);
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: { user }
        });

        void writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user?._id.toString(),
            action: 'USER_UPDATED',
            entityType: 'User',
            entityId: req.params.id,
            ip: req.ip,
            requestId: (req as AuthRequest & { id?: string }).id,
            changes: { updatedFields: Object.keys(updateData) }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
export const deleteUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid user identifier', 400);
        }

        const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (user._id.toString() === req.user!._id.toString()) {
            throw new AppError('You cannot delete your own account', 400);
        }

        await user.deleteOne();

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });

        void writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user?._id.toString(),
            action: 'USER_DELETED',
            entityType: 'User',
            entityId: req.params.id,
            ip: req.ip,
            requestId: (req as AuthRequest & { id?: string }).id
        });
    } catch (error) {
        next(error);
    }
};
