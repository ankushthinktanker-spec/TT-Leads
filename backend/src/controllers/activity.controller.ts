import { Response, NextFunction } from 'express';
import Activity, { IActivity } from '../models/activity.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { Roles } from '../constants/roles';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';
import { createActivitySchema, updateActivitySchema } from '../validators/activity.validator';
import mongoose, { FilterQuery } from 'mongoose';
import Lead from '../models/lead.model';
import Company from '../models/company.model';
import Proposal from '../models/proposal.model';
import User from '../models/user.model';
import { writeAuditLog } from '../services/audit.service';

const toAuditChanges = (value: { toObject: () => unknown }): Record<string, unknown> =>
    value.toObject() as unknown as Record<string, unknown>;

const resolveRelatedModel = async (tenantId: string, relatedTo?: { model: string; id: string }) => {
    if (!relatedTo?.model || !relatedTo?.id) return;

    const query = { _id: relatedTo.id, tenantId };
    const model = relatedTo.model;
    if (model === 'Lead') return Lead.findOne(query);
    if (model === 'Company') return Company.findOne(query);
    if (model === 'Proposal') return Proposal.findOne(query);
    return null;
};

const validateAttendees = async (tenantId: string, attendees?: string[]) => {
    if (!attendees || attendees.length === 0) return;

    for (const attendeeId of attendees) {
        if (!mongoose.isValidObjectId(attendeeId)) {
            throw new AppError('Invalid attendee identifier', 400);
        }
    }

    const existing = await User.countDocuments({ _id: { $in: attendees }, tenantId });
    if (existing !== attendees.length) {
        throw new AppError('One or more attendees not found in your organization', 404);
    }
};

// @desc    Get all activities
// @route   GET /api/activities
// @access  Private
export const getActivities = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            relatedModel,
            relatedId,
            activityType,
            startDate,
            endDate,
            sortBy = 'activityDate',
            sortOrder = 'desc'
        } = req.query;

        // Build filter - Critical Tenant Isolation
        type ActivityFilter = FilterQuery<IActivity> & {
            activityDate?: { $gte?: Date; $lte?: Date };
        };
        const filter: ActivityFilter = { tenantId: req.tenantId! };

        // RBAC constraints
        if (req.user!.role !== Roles.ADMIN && req.user!.role !== Roles.MANAGER) {
            filter.createdBy = req.user!._id;
        }

        if (relatedModel && relatedId) {
            if (!mongoose.isValidObjectId(relatedId as string)) {
                throw new AppError('Invalid related identifier', 400);
            }
            filter['relatedTo.model'] = relatedModel;
            filter['relatedTo.id'] = relatedId;
        }
        if (activityType) filter.activityType = activityType;

        // Date range filter
        if (startDate || endDate) {
            filter.activityDate = {};
            if (startDate) filter.activityDate.$gte = new Date(startDate as string);
            if (endDate) filter.activityDate.$lte = new Date(endDate as string);
        }

        // Pagination
        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const activities = await Activity.find(filter)
            .select('title activityType activityDate relatedTo attendees createdBy status createdAt nextFollowUpDate')
            .populate({
                path: 'relatedTo.id',
                match: { tenantId: req.tenantId! }
            })
            .populate('createdBy', 'firstName lastName email')
            .populate('attendees', 'firstName lastName email')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Activity.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                data: activities,
                meta: buildPaginationMeta(page, limit, total)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single activity
// @route   GET /api/activities/:id
// @access  Private
export const getActivity = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid activity identifier', 400);
        }

        const activity = await Activity.findOne({ _id: req.params.id, tenantId: req.tenantId! })
            .populate('relatedTo.id')
            .populate('createdBy', 'firstName lastName email avatar')
            .populate('attendees', 'firstName lastName email');

        if (!activity) {
            throw new AppError('Activity not found or unauthorized access', 404);
        }

        if (
            req.user!.role !== Roles.ADMIN &&
            req.user!.role !== Roles.MANAGER &&
            activity.createdBy.toString() !== req.user!._id.toString()
        ) {
            throw new AppError('Not authorized to view this activity', 403);
        }

        res.status(200).json({
            success: true,
            data: { activity }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new activity
// @route   POST /api/activities
// @access  Private
export const createActivity = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { error, value } = createActivitySchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        if (!mongoose.isValidObjectId(value.relatedTo.id)) {
            throw new AppError('Invalid related identifier', 400);
        }

        const relatedRecord = await resolveRelatedModel(req.tenantId!, value.relatedTo);
        if (!relatedRecord) {
            throw new AppError('Related record not found in your organization', 404);
        }

        await validateAttendees(req.tenantId!, value.attendees);

        const activity = await Activity.create({
            ...value,
            tenantId: req.tenantId!,
            createdBy: req.user!._id
        });

        if (activity.relatedTo?.model === 'Lead' && activity.relatedTo?.id) {
            const activityDate = activity.activityDate || new Date();
            const lead = await Lead.findOne({ _id: activity.relatedTo.id, tenantId: req.tenantId! });
            if (lead) {
                if (!lead.firstResponseAt) {
                    lead.firstResponseAt = activityDate;
                }
                lead.lastActivityAt = activityDate;
                await lead.save();
            }
        }

        // 📍 SECURITY: Audit Log Creation
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'CREATE',
            entityType: 'Activity',
            entityId: activity._id.toString(),
            ip: req.ip,
            changes: toAuditChanges(activity)
        });

        res.status(201).json({
            success: true,
            message: 'Activity logged successfully',
            data: { activity }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update activity
// @route   PUT /api/activities/:id
// @access  Private
export const updateActivity = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid activity identifier', 400);
        }

        const { error, value } = updateActivitySchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const activity = await Activity.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!activity) {
            throw new AppError('Activity not found or unauthorized access', 404);
        }

        const beforeUpdate = toAuditChanges(activity);

        // Check ownership
        if (activity.createdBy.toString() !== req.user!._id.toString() && req.user!.role !== Roles.ADMIN && req.user!.role !== Roles.MANAGER) {
            throw new AppError('Not authorized to update this activity', 403);
        }

        if (value.relatedTo?.id && !mongoose.isValidObjectId(value.relatedTo.id)) {
            throw new AppError('Invalid related identifier', 400);
        }

        if (value.relatedTo?.id) {
            const relatedRecord = await resolveRelatedModel(req.tenantId!, value.relatedTo);
            if (!relatedRecord) {
                throw new AppError('Related record not found in your organization', 404);
            }
        }

        await validateAttendees(req.tenantId!, value.attendees);

        const updatedActivity = await Activity.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId! },
            { $set: value },
            { new: true, runValidators: true }
        )
            .populate('relatedTo.id')
            .populate('createdBy', 'firstName lastName email');

        if (!updatedActivity) {
            throw new AppError('Update failed: Activity not found', 404);
        }

        // 📍 SECURITY: Audit Log Update
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'UPDATE',
            entityType: 'Activity',
            entityId: updatedActivity._id.toString(),
            ip: req.ip,
            changes: { before: beforeUpdate, after: toAuditChanges(updatedActivity) }
        });

        res.status(200).json({
            success: true,
            message: 'Activity updated successfully',
            data: { activity: updatedActivity }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete activity
// @route   DELETE /api/activities/:id
// @access  Private
export const deleteActivity = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid activity identifier', 400);
        }

        const activity = await Activity.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!activity) {
            throw new AppError('Activity not found or unauthorized access', 404);
        }

        // Check ownership
        if (activity.createdBy.toString() !== req.user!._id.toString() && req.user!.role !== Roles.ADMIN && req.user!.role !== Roles.MANAGER) {
            throw new AppError('Not authorized to delete this activity', 403);
        }

        // 📍 SECURITY: Audit Log Delete
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'DELETE',
            entityType: 'Activity',
            entityId: activity._id.toString(),
            ip: req.ip,
            changes: toAuditChanges(activity)
        });

        await activity.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Activity deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
