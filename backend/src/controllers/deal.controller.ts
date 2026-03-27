import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { createDealSchema, updateDealSchema, updateDealStatusSchema, updateDealStageSchema, assignDealSchema } from '../validators/deal.validator';
import { buildPaginationMeta, getPaginationParams } from '../utils/pagination';
import { applySearchFilter, getDateRangeParam, getSearchTerm, getStringParam, getTagsParam } from '../utils/queryFilters';
import { createDeal, deleteDeal, getDealById, listDeals, updateDeal } from '../services/deal.service';
import type { IDeal } from '../models/deal.model';
import { writeAuditLog } from '../services/audit.service';

type DealFilter = Record<string, unknown>;

const buildDealFilter = (req: AuthRequest): DealFilter => {
    const filter: DealFilter = { tenantId: req.tenantId! };
    const user = req.user!;

    if (user.role !== 'Admin' && user.role !== 'Manager') {
        filter.createdBy = user._id;
    }

    const status = getStringParam(req.query as Record<string, unknown>, 'status');
    if (status) filter.status = status;

    const ownerId = getStringParam(req.query as Record<string, unknown>, 'ownerId');
    if (ownerId) {
        filter.ownerId = ownerId;
    }

    const ratingRaw = getStringParam(req.query as Record<string, unknown>, 'rating');
    if (ratingRaw && !Number.isNaN(Number(ratingRaw))) {
        filter.rating = Number(ratingRaw);
    }

    const tags = getTagsParam(req.query as Record<string, unknown>);
    if (tags) {
        filter.tags = { $in: tags };
    }

    const dateRange = getDateRangeParam(req.query as Record<string, unknown>);
    if (dateRange) {
        filter.createdAt = dateRange;
    }

    const searchTerm = getSearchTerm(req.query as Record<string, unknown>);
    applySearchFilter(filter, searchTerm, ['name', 'status']);

    return filter;
};

// @desc    Get all deals
// @route   GET /api/deals
// @access  Private
export const getDeals = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const filter = buildDealFilter(req);
        const { items, total } = await listDeals(req.tenantId!, filter as Record<string, unknown>, sort, skip, limit);

        res.status(200).json({
            success: true,
            data: {
                items,
                meta: buildPaginationMeta(page, limit, total)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get deal
// @route   GET /api/deals/:id
// @access  Private
export const getDeal = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid deal identifier', 400);
        }

        const deal = await getDealById(req.tenantId!, req.params.id);
        if (!deal) {
            throw new AppError('Deal not found or unauthorized access', 404);
        }

        res.status(200).json({ success: true, data: { deal } });
    } catch (error) {
        next(error);
    }
};

// @desc    Create deal
// @route   POST /api/deals
// @access  Private
export const createDealHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { error, value } = createDealSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const payload: Partial<IDeal> = {
            ...value,
            createdBy: req.user!._id
        };

        const deal = await createDeal(req.tenantId!, payload);

        // 📍 SECURITY: Audit Log Creation
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'CREATE',
            entityType: 'Deal',
            entityId: deal._id.toString(),
            ip: req.ip,
            changes: deal.toObject() as any
        });

        res.status(201).json({
            success: true,
            message: 'Deal created successfully',
            data: { deal }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update deal
// @route   PUT /api/deals/:id
// @access  Private
export const updateDealHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid deal identifier', 400);
        }

        const { error, value } = updateDealSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const beforeUpdate = await getDealById(req.tenantId!, req.params.id);
        if (!beforeUpdate) {
            throw new AppError('Deal not found or unauthorized access', 404);
        }

        const deal = await updateDeal(req.tenantId!, req.params.id, value);
        if (!deal) {
            throw new AppError('Update failed: Deal not found', 404);
        }

        // 📍 SECURITY: Audit Log Update
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'UPDATE',
            entityType: 'Deal',
            entityId: deal._id.toString(),
            ip: req.ip,
            changes: { before: beforeUpdate.toObject() as any, after: deal.toObject() as any }
        });

        res.status(200).json({
            success: true,
            message: 'Deal updated successfully',
            data: { deal }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete deal
// @route   DELETE /api/deals/:id
// @access  Private
export const deleteDealHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid deal identifier', 400);
        }

        const deal = await getDealById(req.tenantId!, req.params.id);
        if (!deal) {
            throw new AppError('Deal not found or unauthorized access', 404);
        }

        // 📍 SECURITY: Audit Log Delete
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'DELETE',
            entityType: 'Deal',
            entityId: deal._id.toString(),
            ip: req.ip,
            changes: deal.toObject() as any
        });

        const deleted = await deleteDeal(req.tenantId!, req.params.id);
        if (!deleted) {
            throw new AppError('Delete failed', 404);
        }

        res.status(200).json({ success: true, message: 'Deal deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Update deal status
// @route   PATCH /api/deals/:id/status
// @access  Private
export const updateDealStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid deal identifier', 400);
        }

        const { error, value } = updateDealStatusSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const deal = await getDealById(req.tenantId!, req.params.id);
        if (!deal) {
            throw new AppError('Deal not found or unauthorized access', 404);
        }

        const oldStatus = deal.status;
        deal.status = value.status;
        await deal.save();

        // 📍 SECURITY: Audit Log Status Change
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'STATUS_UPDATE',
            entityType: 'Deal',
            entityId: deal._id.toString(),
            ip: req.ip,
            changes: { from: oldStatus, to: value.status }
        });

        res.status(200).json({ success: true, message: 'Deal status updated', data: { deal } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update deal stage
// @route   PATCH /api/deals/:id/stage
// @access  Private
export const updateDealStage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid deal identifier', 400);
        }

        const { error, value } = updateDealStageSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const deal = await getDealById(req.tenantId!, req.params.id);
        if (!deal) {
            throw new AppError('Deal not found or unauthorized access', 404);
        }

        const oldStageId = deal.stageId;
        deal.stageId = new mongoose.Types.ObjectId(value.stageId);
        if (value.pipelineId) {
            deal.pipelineId = new mongoose.Types.ObjectId(value.pipelineId);
        }
        await deal.save();

        // 📍 SECURITY: Audit Log Stage Change
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'STAGE_UPDATE',
            entityType: 'Deal',
            entityId: deal._id.toString(),
            ip: req.ip,
            changes: { from: oldStageId, to: value.stageId }
        });

        res.status(200).json({ success: true, message: 'Deal stage updated', data: { deal } });
    } catch (error) {
        next(error);
    }
};

// @desc    Assign deal owner
// @route   PATCH /api/deals/:id/assign
// @access  Private
export const assignDealOwner = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid deal identifier', 400);
        }

        const { error, value } = assignDealSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const deal = await getDealById(req.tenantId!, req.params.id);
        if (!deal) {
            throw new AppError('Deal not found or unauthorized access', 404);
        }

        const oldOwnerId = deal.ownerId;
        deal.ownerId = new mongoose.Types.ObjectId(value.ownerId);
        await deal.save();

        // 📍 SECURITY: Audit Log Owner Assignment
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'ASSIGN',
            entityType: 'Deal',
            entityId: deal._id.toString(),
            ip: req.ip,
            changes: { from: oldOwnerId as any, to: value.ownerId }
        });

        res.status(200).json({ success: true, message: 'Deal owner updated', data: { deal } });
    } catch (error) {
        next(error);
    }
};
