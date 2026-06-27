import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { buildPaginationMeta, getPaginationParams } from '../utils/pagination';
import { listNotifications, markNotificationRead } from '../services/notification.service';

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
        const sort: Record<string, 1 | -1> = { createdAt: -1 };
        // P0-2 fix: scope notifications to both userId AND tenantId to prevent cross-tenant leakage
        const filter = { userId: req.user!._id, tenantId: req.tenantId! };

        const { items, total } = await listNotifications(filter, sort, skip, limit);

        res.status(200).json({
            success: true,
            data: {
                data: items,
                meta: buildPaginationMeta(page, limit, total)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markNotificationReadHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid notification identifier', 400);
        }

        const notification = await markNotificationRead(req.params.id, req.user!._id);
        if (!notification) {
            throw new AppError('Notification not found', 404);
        }

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: { notification }
        });
    } catch (error) {
        next(error);
    }
};
