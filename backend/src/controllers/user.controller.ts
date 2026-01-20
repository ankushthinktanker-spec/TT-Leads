import { Response, NextFunction } from 'express';
import User from '../models/user.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
export const getUsers = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { page = 1, limit = 10, search, role, status } = req.query;

        // Build filter
        const filter: Record<string, unknown> = {};
        if (role) filter.role = role;
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (Number(page) - 1) * Number(limit);

        const users = await User.find(filter)
            .select('-password')
            .populate('teamId', 'name')
            .populate('managerId', 'firstName lastName')
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: users.length,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            },
            data: { users }
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
        const user = await User.findById(req.params.id)
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
        const { password, ...updateData } = req.body;

        // Prevent password update through this route
        if (password) {
            throw new AppError('Password cannot be updated through this route', 400);
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
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
        const user = await User.findById(req.params.id);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Prevent deleting self
        if (user._id.toString() === req.user!._id.toString()) {
            throw new AppError('You cannot delete your own account', 400);
        }

        await user.deleteOne();

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
