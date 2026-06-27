import { Response, NextFunction } from 'express';
import Settings from '../models/settings.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

// @desc    Get settings by type
// @route   GET /api/settings/:type
// @access  Private
export const getSettings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.tenantId) {
            throw new AppError('Tenant context required', 403);
        }

        const { type } = req.params;

        const settings = await Settings.findOne({ tenantId: req.tenantId, type });

        // Return default empty structure if not found
        if (!settings) {
            res.status(200).json({
                success: true,
                data: null
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: settings.data
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update settings
// @route   PUT /api/settings/:type
// @access  Private (Admin only)
export const updateSettings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.tenantId) {
            throw new AppError('Tenant context required', 403);
        }

        const { type } = req.params;
        const data = req.body;

        const settings = await Settings.findOneAndUpdate(
            { tenantId: req.tenantId, type },
            {
                tenantId: req.tenantId,
                type,
                data,
                updatedBy: req.user!._id
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: settings.data
        });
    } catch (error) {
        next(error);
    }
};
