import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { Roles } from '../constants/roles';
import { addPipelineStageSchema, createPipelineSchema, reorderPipelineStagesSchema, updatePipelineSchema, updatePipelineStageSchema } from '../validators/pipeline.validator';
import { buildPaginationMeta, getPaginationParams } from '../utils/pagination';
import { applySearchFilter, getDateRangeParam, getSearchTerm, getStringParam } from '../utils/queryFilters';
import { addPipelineStage, createPipeline, deletePipeline, deletePipelineStage, getPipelineById, listPipelines, reorderPipelineStages, updatePipeline, updatePipelineStage } from '../services/pipeline.service';
import type { IPipeline } from '../models/pipeline.model';

type PipelineFilter = Record<string, unknown>;

const buildPipelineFilter = (req: AuthRequest): PipelineFilter => {
    const filter: PipelineFilter = {};
    const user = req.user!;

    if (user.role !== Roles.ADMIN && user.role !== Roles.MANAGER) {
        filter.$or = [
            { access: 'all' },
            { createdBy: user._id },
            { selectedUserIds: user._id }
        ];
    }

    const status = getStringParam(req.query as Record<string, unknown>, 'status');
    if (status) {
        filter.status = status;
    }

    const dateRange = getDateRangeParam(req.query as Record<string, unknown>);
    if (dateRange) {
        filter.createdAt = dateRange;
    }

    const searchTerm = getSearchTerm(req.query as Record<string, unknown>);
    applySearchFilter(filter, searchTerm, ['name', 'description']);

    return filter;
};

const canAccessPipeline = (pipeline: { access?: string; selectedUserIds?: mongoose.Types.ObjectId[]; createdBy?: mongoose.Types.ObjectId }, user: AuthRequest['user']) => {
    if (!user) return false;
    if (user.role === Roles.ADMIN || user.role === Roles.MANAGER) return true;
    if (pipeline.access === 'all') return true;
    if (pipeline.createdBy?.toString() === user._id.toString()) return true;
    return pipeline.selectedUserIds?.some((id) => id.toString() === user._id.toString()) || false;
};

// @desc    Get all pipelines
// @route   GET /api/pipelines
// @access  Private
export const getPipelines = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const filter = buildPipelineFilter(req);
        const { items, total } = await listPipelines(req.tenantId!, filter as Record<string, unknown>, sort, skip, limit);

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

// @desc    Get pipeline
// @route   GET /api/pipelines/:id
// @access  Private
export const getPipeline = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid pipeline identifier', 400);
        }

        const pipeline = await getPipelineById(req.tenantId!, req.params.id);
        if (!pipeline) {
            throw new AppError('Pipeline not found', 404);
        }
        if (!canAccessPipeline(pipeline, req.user)) {
            throw new AppError('Not authorized to view this pipeline', 403);
        }

        res.status(200).json({ success: true, data: { pipeline } });
    } catch (error) {
        next(error);
    }
};

// @desc    Create pipeline
// @route   POST /api/pipelines
// @access  Private
export const createPipelineHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { error, value } = createPipelineSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const payload: Partial<IPipeline> = {
            ...value,
            createdBy: req.user!._id
        };

        const pipeline = await createPipeline(req.tenantId!, payload);

        res.status(201).json({
            success: true,
            message: 'Pipeline created successfully',
            data: { pipeline }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update pipeline
// @route   PUT /api/pipelines/:id
// @access  Private
export const updatePipelineHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid pipeline identifier', 400);
        }

        const { error, value } = updatePipelineSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const existing = await getPipelineById(req.tenantId!, req.params.id);
        if (!existing) {
            throw new AppError('Pipeline not found', 404);
        }
        if (!canAccessPipeline(existing, req.user)) {
            throw new AppError('Not authorized to update this pipeline', 403);
        }

        const pipeline = await updatePipeline(req.tenantId!, req.params.id, value);

        res.status(200).json({
            success: true,
            message: 'Pipeline updated successfully',
            data: { pipeline }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete pipeline
// @route   DELETE /api/pipelines/:id
// @access  Private
export const deletePipelineHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid pipeline identifier', 400);
        }

        const pipeline = await getPipelineById(req.tenantId!, req.params.id);
        if (!pipeline) {
            throw new AppError('Pipeline not found', 404);
        }
        if (!canAccessPipeline(pipeline, req.user)) {
            throw new AppError('Not authorized to delete this pipeline', 403);
        }

        await deletePipeline(req.tenantId!, req.params.id);

        res.status(200).json({ success: true, message: 'Pipeline deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Add pipeline stage
// @route   POST /api/pipelines/:id/stages
// @access  Private
export const addPipelineStageHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid pipeline identifier', 400);
        }
        const { error, value } = addPipelineStageSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const pipeline = await getPipelineById(req.tenantId!, req.params.id);
        if (!pipeline) {
            throw new AppError('Pipeline not found', 404);
        }
        if (!canAccessPipeline(pipeline, req.user)) {
            throw new AppError('Not authorized to update this pipeline', 403);
        }

        const updated = await addPipelineStage(req.tenantId!, req.params.id, value);
        if (!updated) {
            throw new AppError('Pipeline not found', 404);
        }

        res.status(200).json({ success: true, message: 'Stage added', data: { pipeline: updated } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update pipeline stage
// @route   PUT /api/pipelines/:id/stages/:stageId
// @access  Private
export const updatePipelineStageHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.stageId)) {
            throw new AppError('Invalid identifier', 400);
        }
        const { error, value } = updatePipelineStageSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const pipeline = await getPipelineById(req.tenantId!, req.params.id);
        if (!pipeline) {
            throw new AppError('Pipeline not found', 404);
        }
        if (!canAccessPipeline(pipeline, req.user)) {
            throw new AppError('Not authorized to update this pipeline', 403);
        }

        const updated = await updatePipelineStage(req.tenantId!, req.params.id, req.params.stageId, value);
        if (!updated) {
            throw new AppError('Stage not found', 404);
        }

        res.status(200).json({ success: true, message: 'Stage updated', data: { pipeline: updated } });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete pipeline stage
// @route   DELETE /api/pipelines/:id/stages/:stageId
// @access  Private
export const deletePipelineStageHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.stageId)) {
            throw new AppError('Invalid identifier', 400);
        }

        const pipeline = await getPipelineById(req.tenantId!, req.params.id);
        if (!pipeline) {
            throw new AppError('Pipeline not found', 404);
        }
        if (!canAccessPipeline(pipeline, req.user)) {
            throw new AppError('Not authorized to update this pipeline', 403);
        }

        const updated = await deletePipelineStage(req.tenantId!, req.params.id, req.params.stageId);
        if (!updated) {
            throw new AppError('Stage not found', 404);
        }

        res.status(200).json({ success: true, message: 'Stage deleted', data: { pipeline: updated } });
    } catch (error) {
        next(error);
    }
};

// @desc    Reorder pipeline stages
// @route   PATCH /api/pipelines/:id/reorder-stages
// @access  Private
export const reorderPipelineStagesHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid pipeline identifier', 400);
        }
        const { error, value } = reorderPipelineStagesSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const pipeline = await getPipelineById(req.tenantId!, req.params.id);
        if (!pipeline) {
            throw new AppError('Pipeline not found', 404);
        }
        if (!canAccessPipeline(pipeline, req.user)) {
            throw new AppError('Not authorized to update this pipeline', 403);
        }

        const updated = await reorderPipelineStages(req.tenantId!, req.params.id, value.stages);
        if (!updated) {
            throw new AppError('Pipeline not found', 404);
        }

        res.status(200).json({ success: true, message: 'Stages reordered', data: { pipeline: updated } });
    } catch (error) {
        next(error);
    }
};
