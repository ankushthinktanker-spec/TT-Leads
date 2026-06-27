import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { Roles } from '../constants/roles';
import { createSubscriptionSchema, updateSubscriptionSchema } from '../validators/subscription.validator';
import { buildPaginationMeta, getPaginationParams } from '../utils/pagination';
import { applySearchFilter, getDateRangeParam, getSearchTerm, getStringParam } from '../utils/queryFilters';
import {
    createSubscription,
    deleteSubscription,
    getSubscriptionById,
    listSubscriptions,
    listUpcomingSubscriptions,
    updateSubscription
} from '../services/subscription.service';
import type { ISubscription } from '../models/subscription.model';

type SubscriptionFilter = Record<string, unknown>;
type AccessTarget = { internalOwnerId?: mongoose.Types.ObjectId };

const canAccessSubscription = (subscription: AccessTarget, user: AuthRequest['user']) => {
    if (!user) return false;
    if (user.role === Roles.ADMIN || user.role === Roles.MANAGER) return true;
    return String(subscription.internalOwnerId || '') === String(user._id);
};

const buildSubscriptionFilter = (req: AuthRequest, useRenewDate = false): SubscriptionFilter => {
    const filter: SubscriptionFilter = {};
    const user = req.user!;

    if (user.role !== Roles.ADMIN && user.role !== Roles.MANAGER) {
        filter.internalOwnerId = user._id;
    }

    const status = getStringParam(req.query as Record<string, unknown>, 'status');
    if (status) filter.status = status;

    const ownerId = getStringParam(req.query as Record<string, unknown>, 'ownerId');
    if (ownerId) filter.internalOwnerId = ownerId;

    const companyId = getStringParam(req.query as Record<string, unknown>, 'companyId');
    if (companyId) filter.companyId = companyId;

    const type = getStringParam(req.query as Record<string, unknown>, 'type');
    if (type) filter.type = type;

    const dateRange = getDateRangeParam(req.query as Record<string, unknown>);
    if (dateRange) {
        filter[useRenewDate ? 'renewDate' : 'createdAt'] = dateRange;
    }

    const searchTerm = getSearchTerm(req.query as Record<string, unknown>);
    applySearchFilter(filter, searchTerm, ['name', 'vendorName', 'planName', 'status']);

    return filter;
};

// @desc    Get all subscriptions
// @route   GET /api/subscriptions
// @access  Private
export const getSubscriptions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const filter = buildSubscriptionFilter(req, true);
        const { items, total } = await listSubscriptions(req.tenantId!, filter as Record<string, unknown>, sort, skip, limit);

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

// @desc    Get upcoming renewals
// @route   GET /api/subscriptions/upcoming
// @access  Private
export const getUpcomingSubscriptions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const days = Number(req.query.days || 30);
        const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(days, 365)) : 30;
        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
        const sort: Record<string, 1 | -1> = { renewDate: 1 };

        const filter = buildSubscriptionFilter(req, true);
        const now = new Date();
        const until = new Date(now);
        until.setDate(now.getDate() + safeDays);
        filter.renewDate = { $gte: now, $lte: until };
        filter.status = filter.status || 'Active';

        const { items, total } = await listUpcomingSubscriptions(req.tenantId!, filter as Record<string, unknown>, sort, skip, limit);

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

// @desc    Get subscription
// @route   GET /api/subscriptions/:id
// @access  Private
export const getSubscription = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid subscription identifier', 400);
        }

        const subscription = await getSubscriptionById(req.tenantId!, req.params.id);
        if (!subscription) {
            throw new AppError('Subscription not found', 404);
        }
        if (!canAccessSubscription(subscription, req.user)) {
            throw new AppError('Not authorized to view this subscription', 403);
        }

        res.status(200).json({ success: true, data: { subscription } });
    } catch (error) {
        next(error);
    }
};

// @desc    Create subscription
// @route   POST /api/subscriptions
// @access  Private
export const createSubscriptionHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { error, value } = createSubscriptionSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const payload: Partial<ISubscription> = {
            ...value,
            createdBy: req.user!._id
        };

        const subscription = await createSubscription(req.tenantId!, payload);

        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            data: { subscription }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update subscription
// @route   PUT /api/subscriptions/:id
// @access  Private
export const updateSubscriptionHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid subscription identifier', 400);
        }

        const { error, value } = updateSubscriptionSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const existing = await getSubscriptionById(req.tenantId!, req.params.id);
        if (!existing) {
            throw new AppError('Subscription not found', 404);
        }
        if (!canAccessSubscription(existing, req.user)) {
            throw new AppError('Not authorized to update this subscription', 403);
        }

        const subscription = await updateSubscription(req.tenantId!, req.params.id, value);
        if (!subscription) {
            throw new AppError('Subscription not found', 404);
        }

        res.status(200).json({
            success: true,
            message: 'Subscription updated successfully',
            data: { subscription }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update subscription status
// @route   PATCH /api/subscriptions/:id/status
// @access  Private
export const updateSubscriptionStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid subscription identifier', 400);
        }

        const status = getStringParam(req.body as Record<string, unknown>, 'status');
        if (!status) {
            throw new AppError('Status is required', 400);
        }

        const existing = await getSubscriptionById(req.tenantId!, req.params.id);
        if (!existing) {
            throw new AppError('Subscription not found', 404);
        }
        if (!canAccessSubscription(existing, req.user)) {
            throw new AppError('Not authorized to update this subscription', 403);
        }

        const subscription = await updateSubscription(req.tenantId!, req.params.id, { status });
        if (!subscription) {
            throw new AppError('Subscription not found', 404);
        }

        res.status(200).json({
            success: true,
            message: 'Subscription status updated',
            data: { subscription }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete subscription
// @route   DELETE /api/subscriptions/:id
// @access  Private
export const deleteSubscriptionHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid subscription identifier', 400);
        }

        const existing = await getSubscriptionById(req.tenantId!, req.params.id);
        if (!existing) {
            throw new AppError('Subscription not found', 404);
        }
        if (!canAccessSubscription(existing, req.user)) {
            throw new AppError('Not authorized to delete this subscription', 403);
        }

        await deleteSubscription(req.tenantId!, req.params.id);

        res.status(200).json({ success: true, message: 'Subscription deleted successfully' });
    } catch (error) {
        next(error);
    }
};
