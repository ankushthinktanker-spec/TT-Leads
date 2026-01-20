import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Lead from '../models/lead.model';
import LeadActivity from '../models/lead-activity.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

const canAccessLead = (
    lead: { assignedTo?: { toString(): string } },
    user: AuthRequest['user']
) => {
    if (!user) return false;
    if (user.role === 'Admin' || user.role === 'Manager') return true;
    return lead.assignedTo?.toString() === user._id.toString();
};

// @desc    Get lead activities
// @route   GET /api/leads/:id/activities
// @access  Private
export const getLeadActivities = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid lead identifier', 400);
        }

        const lead = await Lead.findById(req.params.id).select('_id assignedTo');
        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        if (!canAccessLead(lead, req.user!)) {
            throw new AppError('Not authorized to view this lead', 403);
        }

        const { limit = 20, cursor } = req.query as { limit?: string; cursor?: string };
        const parsedLimit = Math.min(Number(limit) || 20, 50);

        const filter: Record<string, unknown> = { leadId: lead._id };
        if (cursor) {
            const cursorDate = new Date(cursor);
            if (!Number.isNaN(cursorDate.getTime())) {
                filter.createdAt = { $lt: cursorDate };
            }
        }

        const activities = await LeadActivity.find(filter)
            .populate('createdBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(parsedLimit);

        const nextCursor = activities.length > 0
            ? activities[activities.length - 1].createdAt.toISOString()
            : null;

        res.status(200).json({
            success: true,
            data: {
                activities,
                nextCursor
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add lead note activity
// @route   POST /api/leads/:id/activities
// @access  Private
export const createLeadActivity = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid lead identifier', 400);
        }

        const lead = await Lead.findById(req.params.id).select('_id assignedTo');
        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        if (!canAccessLead(lead, req.user!)) {
            throw new AppError('Not authorized to update this lead', 403);
        }

        const note = req.body?.note;
        if (!note || typeof note !== 'string' || !note.trim()) {
            throw new AppError('Note is required', 400);
        }

        const activity = await LeadActivity.create({
            leadId: lead._id,
            type: 'NOTE',
            message: note.trim(),
            createdBy: req.user!._id
        });

        res.status(201).json({
            success: true,
            message: 'Note added successfully',
            data: { activity }
        });
    } catch (error) {
        next(error);
    }
};
