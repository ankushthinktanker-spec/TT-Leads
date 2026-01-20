import { Response, NextFunction } from 'express';
import Activity, { IActivity } from '../models/activity.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { createActivitySchema, updateActivitySchema } from '../validators/activity.validator';
import mongoose, { FilterQuery } from 'mongoose';
import Lead from '../models/lead.model';
import Company from '../models/company.model';
import Proposal from '../models/proposal.model';
import User from '../models/user.model';

const resolveRelatedModel = async (relatedTo?: { model: string; id: string }) => {
    if (!relatedTo?.model || !relatedTo?.id) return;

    const model = relatedTo.model;
    if (model === 'Lead') return Lead.findById(relatedTo.id);
    if (model === 'Company') return Company.findById(relatedTo.id);
    if (model === 'Proposal') return Proposal.findById(relatedTo.id);
    return null;
};

const validateAttendees = async (attendees?: string[]) => {
    if (!attendees || attendees.length === 0) return;

    for (const attendeeId of attendees) {
        if (!mongoose.isValidObjectId(attendeeId)) {
            throw new AppError('Invalid attendee identifier', 400);
        }
    }

    const existing = await User.countDocuments({ _id: { $in: attendees } });
    if (existing !== attendees.length) {
        throw new AppError('One or more attendees not found', 404);
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
            page = 1,
            limit = 10,
            relatedModel,
            relatedId,
            activityType,
            startDate,
            endDate,
            sortBy = 'activityDate',
            sortOrder = 'desc'
        } = req.query;

        // Build filter
        type ActivityFilter = FilterQuery<IActivity> & {
            activityDate?: { $gte?: Date; $lte?: Date };
        };
        const filter: ActivityFilter = {};

        if (req.user!.role !== 'Admin' && req.user!.role !== 'Manager') {
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
        const skip = (Number(page) - 1) * Number(limit);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const activities = await Activity.find(filter)
            .select('title activityType activityDate relatedTo attendees createdBy status createdAt nextFollowUpDate')
            .populate('relatedTo.id')
            .populate('createdBy', 'firstName lastName email')
            .populate('attendees', 'firstName lastName email')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        const total = await Activity.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                activities,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
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

        const activity = await Activity.findById(req.params.id)
            .populate('relatedTo.id')
            .populate('createdBy', 'firstName lastName email avatar')
            .populate('attendees', 'firstName lastName email');

        if (!activity) {
            throw new AppError('Activity not found', 404);
        }

        if (
            req.user!.role !== 'Admin' &&
            req.user!.role !== 'Manager' &&
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
        const { error, value } = createActivitySchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        if (!mongoose.isValidObjectId(value.relatedTo.id)) {
            throw new AppError('Invalid related identifier', 400);
        }

        const relatedRecord = await resolveRelatedModel(value.relatedTo);
        if (!relatedRecord) {
            throw new AppError('Related record not found', 404);
        }

        await validateAttendees(value.attendees);

        const activity = await Activity.create({
            ...value,
            createdBy: req.user!._id
        });

        if (activity.relatedTo?.model === 'Lead' && activity.relatedTo?.id) {
            const activityDate = activity.activityDate || new Date();
            const lead = await Lead.findById(activity.relatedTo.id);
            if (lead) {
                if (!lead.firstResponseAt) {
                    lead.firstResponseAt = activityDate;
                }
                lead.lastActivityAt = activityDate;
                await lead.save();
            }
        }

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

        const { error, value } = updateActivitySchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        if (value.relatedTo?.id && !mongoose.isValidObjectId(value.relatedTo.id)) {
            throw new AppError('Invalid related identifier', 400);
        }

        if (value.relatedTo?.id) {
            const relatedRecord = await resolveRelatedModel(value.relatedTo);
            if (!relatedRecord) {
                throw new AppError('Related record not found', 404);
            }
        }

        await validateAttendees(value.attendees);

        const activity = await Activity.findById(req.params.id);
        if (!activity) {
            throw new AppError('Activity not found', 404);
        }

        // Check if user owns this activity
        if (activity.createdBy.toString() !== req.user!._id.toString() && req.user!.role !== 'Admin') {
            throw new AppError('Not authorized to update this activity', 403);
        }

        const updatedActivity = await Activity.findByIdAndUpdate(
            req.params.id,
            { $set: value },
            { new: true, runValidators: true }
        )
            .populate('relatedTo.id')
            .populate('createdBy', 'firstName lastName email');

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

        const activity = await Activity.findById(req.params.id);
        if (!activity) {
            throw new AppError('Activity not found', 404);
        }

        // Check if user owns this activity
        if (activity.createdBy.toString() !== req.user!._id.toString() && req.user!.role !== 'Admin') {
            throw new AppError('Not authorized to delete this activity', 403);
        }

        await activity.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Activity deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
