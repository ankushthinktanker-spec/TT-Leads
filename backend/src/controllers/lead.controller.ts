import { Response, NextFunction } from 'express';
import Lead, { ILead } from '../models/lead.model';
import LeadStageHistory from '../models/lead-stage-history.model';
import User from '../models/user.model';
import Activity from '../models/activity.model';
import LeadActivity from '../models/lead-activity.model';
import mongoose, { FilterQuery } from 'mongoose';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import {
    createLeadSchema,
    updateLeadSchema,
    updateLeadStatusSchema,
    assignLeadSchema
} from '../validators/lead.validator';

const getLeadHealth = (nextFollowUpDate?: Date | null): 'UNHEALTHY' | 'OVERDUE' | 'DUE_TODAY' | 'SCHEDULED' => {
    if (!nextFollowUpDate) {
        return 'UNHEALTHY';
    }
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    if (nextFollowUpDate < startOfToday) {
        return 'OVERDUE';
    }
    if (nextFollowUpDate >= startOfToday && nextFollowUpDate <= endOfToday) {
        return 'DUE_TODAY';
    }
    return 'SCHEDULED';
};

type LeadOwnerRef = {
    _id?: unknown;
    firstName?: string;
    lastName?: string;
    email?: string;
} | null;

type LeadPlain = ILead & {
    ownerId?: LeadOwnerRef;
    assignedTo?: LeadOwnerRef;
    createdBy?: LeadOwnerRef;
    leadHealth?: string;
};

type LeadFilter = FilterQuery<ILead>;

const applyOrFilter = (filter: LeadFilter, orClause: LeadFilter[]) => {
    if (filter.$or) {
        const existingAnd = Array.isArray(filter.$and) ? filter.$and : [];
        const existingOr = Array.isArray(filter.$or) ? filter.$or : [];
        filter.$and = [...existingAnd, { $or: existingOr }, { $or: orClause }];
        delete filter.$or;
        return filter;
    }
    filter.$or = orClause;
    return filter;
};

const mapFollowUpTypeToActivity = (value?: string) => {
    switch (value) {
        case 'CALL':
            return 'Call';
        case 'WHATSAPP':
            return 'WhatsApp';
        case 'EMAIL':
            return 'Email';
        case 'MEETING':
            return 'Meeting';
        default:
            return 'Note';
    }
};

// @desc    Get all leads
// @route   GET /api/leads
// @access  Private
export const getLeads = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            source,
            priority,
            assignedTo,
            ownerId,
            due,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter
        const filter: LeadFilter = {};

        // Role-based filtering
        if (req.user!.role === 'BDM' || req.user!.role === 'User') {
            filter.assignedTo = req.user!._id;
        } else if (req.user!.role === 'Manager' && req.user!.teamId) {
            // Get team members
            const teamMembers = await User.find({ teamId: req.user!.teamId }).select('_id');
            filter.assignedTo = { $in: teamMembers.map(m => m._id) };
        }

        if (status) filter.status = status;
        if (source) filter.source = source;
        if (priority) filter.priority = priority;
        if (assignedTo) filter.assignedTo = assignedTo;

        // Search
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        if (ownerId) {
            applyOrFilter(filter, [{ ownerId }, { assignedTo: ownerId }]);
        }

        if (due) {
            const now = new Date();
            const startOfToday = new Date(now);
            startOfToday.setHours(0, 0, 0, 0);
            const endOfToday = new Date(now);
            endOfToday.setHours(23, 59, 59, 999);

            if (due === 'unhealthy') {
                applyOrFilter(filter, [
                    { nextFollowUpDate: { $exists: false } },
                    { nextFollowUpDate: null }
                ]);
            } else if (due === 'overdue') {
                filter.nextFollowUpDate = { $lt: startOfToday };
            } else if (due === 'today') {
                filter.nextFollowUpDate = { $gte: startOfToday, $lte: endOfToday };
            } else if (due === 'upcoming') {
                const upcomingEnd = new Date(endOfToday);
                upcomingEnd.setDate(upcomingEnd.getDate() + 7);
                filter.nextFollowUpDate = { $gt: endOfToday, $lte: upcomingEnd };
            }
        }

        // Pagination
        const skip = (Number(page) - 1) * Number(limit);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const leads = await Lead.find(filter)
            .select('firstName lastName email phone company status source priority dealValue assignedTo ownerId createdBy createdAt nextFollowUpDate followUpType')
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        const total = await Lead.countDocuments(filter);

        const leadsWithHealth = leads.map((lead) => {
        const data = lead.toObject() as LeadPlain;
            data.leadHealth = getLeadHealth(data.nextFollowUpDate);
            data.ownerId = data.ownerId || data.assignedTo || data.createdBy;
            return data;
        });

        res.status(200).json({
            success: true,
            data: {
                leads: leadsWithHealth,
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

// @desc    Get single lead
// @route   GET /api/leads/:id
// @access  Private
export const getLead = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('assignedTo', 'firstName lastName email avatar')
            .populate('createdBy', 'firstName lastName email')
            .populate('teamId', 'name');

        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        // Check access
        if ((req.user!.role === 'BDM' || req.user!.role === 'User') && lead.assignedTo?.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to view this lead', 403);
        }

        const leadData = lead.toObject() as LeadPlain;
        leadData.leadHealth = getLeadHealth(leadData.nextFollowUpDate);
        leadData.ownerId = leadData.ownerId || leadData.assignedTo || leadData.createdBy;

        res.status(200).json({
            success: true,
            data: { lead: leadData }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new lead
// @route   POST /api/leads
// @access  Private
export const createLead = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Validate request body
        const { error, value } = createLeadSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        // Check for duplicate email or phone
        const existingLead = await Lead.findOne({
            $or: [{ email: value.email }, { phone: value.phone }]
        });

        if (existingLead) {
            throw new AppError('Lead with this email or phone already exists', 400);
        }

        const nextFollowUpDate = value.nextFollowUpDate || value.nextFollowUpAt;
        if (!nextFollowUpDate) {
            throw new AppError('Next follow-up date is required', 400);
        }
        const ownerId = value.ownerId || value.assignedTo || req.user!._id;
        const assignedTo = value.assignedTo || ownerId;

        let teamId = value.teamId;
        if (assignedTo) {
            const assignedUser = assignedTo.toString() === req.user!._id.toString()
                ? req.user!
                : await User.findById(assignedTo);
            if (!assignedUser) {
                throw new AppError('Assigned user not found', 404);
            }
            teamId = assignedUser.teamId;
        }

        // Create lead
        const lead = await Lead.create({
            ...value,
            teamId,
            ownerId,
            assignedTo,
            nextFollowUpDate,
            createdBy: req.user!._id
        });

        // Update user stats if assigned
        if (assignedTo) {
            await User.findByIdAndUpdate(assignedTo, {
                $inc: { leadsAssigned: 1 }
            });
        }

        const leadData = lead.toObject() as LeadPlain;
        leadData.leadHealth = getLeadHealth(leadData.nextFollowUpDate);

        res.status(201).json({
            success: true,
            message: 'Lead created successfully',
            data: { lead: leadData }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update lead
// @route   PUT /api/leads/:id
// @access  Private
export const updateLead = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Validate request body
        const { error, value } = updateLeadSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        // Check access
        if ((req.user!.role === 'BDM' || req.user!.role === 'User') && lead.assignedTo?.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to update this lead', 403);
        }

        if (value.email || value.phone) {
            const existingLead = await Lead.findOne({
                _id: { $ne: lead._id },
                $or: [
                    ...(value.email ? [{ email: value.email }] : []),
                    ...(value.phone ? [{ phone: value.phone }] : [])
                ]
            });

            if (existingLead) {
                throw new AppError('Lead with this email or phone already exists', 400);
            }
        }

        const previousStatus = lead.status;
        const previousFollowUp = lead.nextFollowUpDate ? lead.nextFollowUpDate.toISOString() : null;
        const previousFollowUpType = lead.followUpType || null;
        const updateValue: Record<string, unknown> = { ...value };
        if (value.nextFollowUpAt && !value.nextFollowUpDate) {
            updateValue.nextFollowUpDate = value.nextFollowUpAt;
        }
        if (value.ownerId && !value.assignedTo) {
            updateValue.assignedTo = value.ownerId;
        }
        if (value.assignedTo && !value.ownerId) {
            updateValue.ownerId = value.assignedTo;
        }
        const update: { $set: Record<string, unknown>; $unset?: Record<string, unknown> } = { $set: updateValue };
        if (value.status && value.status !== 'Lost') {
            update.$unset = { lostReason: '' };
        }

        if (Object.prototype.hasOwnProperty.call(updateValue, 'assignedTo')) {
            const newAssignedTo = updateValue.assignedTo;
            const previousAssignedTo = lead.assignedTo?.toString();

            if (!newAssignedTo) {
                if (previousAssignedTo) {
                    await User.findByIdAndUpdate(previousAssignedTo, {
                        $inc: { leadsAssigned: -1 }
                    });
                }
                update.$set.teamId = null;
            } else if (newAssignedTo.toString() !== previousAssignedTo) {
                const assignedUser = await User.findById(newAssignedTo);
                if (!assignedUser) {
                    throw new AppError('Assigned user not found', 404);
                }

                if (previousAssignedTo) {
                    await User.findByIdAndUpdate(previousAssignedTo, {
                        $inc: { leadsAssigned: -1 }
                    });
                }

                await User.findByIdAndUpdate(newAssignedTo, {
                    $inc: { leadsAssigned: 1 }
                });
                update.$set.teamId = assignedUser.teamId;
            }
        }

        // Update lead
        const updatedLead = await Lead.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true, runValidators: true }
        ).populate('assignedTo', 'firstName lastName email');

        const updatedLeadData = updatedLead?.toObject() as LeadPlain;
        if (updatedLeadData) {
            updatedLeadData.leadHealth = getLeadHealth(updatedLeadData.nextFollowUpDate);
            updatedLeadData.ownerId = updatedLeadData.ownerId || updatedLeadData.assignedTo || updatedLeadData.createdBy;
        }

        const nextFollowUpIso = updatedLead?.nextFollowUpDate ? updatedLead.nextFollowUpDate.toISOString() : null;
        const nextFollowUpType = updatedLead?.followUpType || null;
        if (nextFollowUpIso !== previousFollowUp || nextFollowUpType !== previousFollowUpType) {
            await LeadActivity.create({
                leadId: lead._id,
                type: 'FOLLOWUP_SCHEDULED',
                message: 'Follow-up updated',
                meta: {
                    followUpAt: updatedLead?.nextFollowUpDate || null,
                    followUpType: updatedLead?.followUpType || null,
                    previousFollowUpAt: previousFollowUp
                },
                createdBy: req.user!._id
            });
        }

        if (value.status && value.status !== previousStatus) {
            update.$set.lastStageChangedAt = new Date();
            await LeadStageHistory.create({
                leadId: lead._id,
                fromStatus: previousStatus,
                toStatus: value.status,
                changedBy: req.user!._id,
                changedAt: new Date()
            });
            await LeadActivity.create({
                leadId: lead._id,
                type: 'STAGE_CHANGE',
                message: `Stage changed from ${previousStatus} to ${value.status}`,
                meta: { oldStage: previousStatus, newStage: value.status },
                createdBy: req.user!._id
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lead updated successfully',
            data: { lead: updatedLeadData || updatedLead }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete lead
// @route   DELETE /api/leads/:id
// @access  Private (Admin/Manager)
export const deleteLead = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        await lead.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Lead deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update lead status
// @route   PATCH /api/leads/:id/status
// @access  Private
export const updateLeadStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Validate request body
        const { error, value } = updateLeadStatusSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        // Check access
        if ((req.user!.role === 'BDM' || req.user!.role === 'User') && lead.assignedTo?.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to update this lead', 403);
        }

        const previousStatus = lead.status;
        lead.status = value.status;
        if (previousStatus !== value.status) {
            lead.lastStageChangedAt = new Date();
        }
        if (value.status === 'Won' && previousStatus !== 'Won') {
            lead.convertedAt = new Date();
            lead.closedAt = new Date();
            // Update user stats
            if (lead.assignedTo) {
                await User.findByIdAndUpdate(lead.assignedTo, {
                    $inc: { leadsConverted: 1, totalRevenue: lead.dealValue || 0 }
                });
            }
        } else if (value.status === 'Lost') {
            lead.closedAt = new Date();
            lead.lostReason = value.lostReason;
        } else {
            lead.lostReason = undefined;
        }

        await lead.save();

        if (previousStatus !== value.status) {
            await LeadStageHistory.create({
                leadId: lead._id,
                fromStatus: previousStatus,
                toStatus: value.status,
                changedBy: req.user!._id,
                changedAt: new Date()
            });
            await LeadActivity.create({
                leadId: lead._id,
                type: 'STAGE_CHANGE',
                message: `Stage changed from ${previousStatus} to ${value.status}`,
                meta: { oldStage: previousStatus, newStage: value.status },
                createdBy: req.user!._id
            });
        }

        const leadData = lead.toObject() as LeadPlain;
        leadData.leadHealth = getLeadHealth(leadData.nextFollowUpDate);
        leadData.ownerId = leadData.ownerId || leadData.assignedTo || leadData.createdBy;

        res.status(200).json({
            success: true,
            message: 'Lead status updated successfully',
            data: { lead: leadData }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Assign lead to user
// @route   PATCH /api/leads/:id/assign
// @access  Private (Admin/Manager)
export const assignLead = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Validate request body
        const { error, value } = assignLeadSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        // Check if user exists
        const user = await User.findById(value.assignedTo);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Update previous assignee stats
        if (lead.assignedTo) {
            await User.findByIdAndUpdate(lead.assignedTo, {
                $inc: { leadsAssigned: -1 }
            });
        }

        // Update new assignee stats
        await User.findByIdAndUpdate(value.assignedTo, {
            $inc: { leadsAssigned: 1 }
        });

        // Update lead
        lead.assignedTo = value.assignedTo;
        lead.teamId = user.teamId;
        await lead.save();

        res.status(200).json({
            success: true,
            message: 'Lead assigned successfully',
            data: { lead }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get my leads
// @route   GET /api/leads/my-leads
// @access  Private
export const getMyLeads = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const leads = await Lead.find({ assignedTo: req.user!._id })
            .populate('createdBy', 'firstName lastName email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: { leads }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update lead follow-up and log activity
// @route   PATCH /api/leads/:id/followup
// @access  Private
export const updateLeadFollowUp = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid lead identifier', 400);
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        if ((req.user!.role === 'BDM' || req.user!.role === 'User') && lead.assignedTo?.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to update this lead', 403);
        }

        const nextFollowUpDate = req.body.nextFollowUpAt || req.body.nextFollowUpDate;
        const followUpType = req.body.followUpType;
        const note = req.body.note;
        const action = req.body.action || 'reschedule';

        if (nextFollowUpDate) {
            lead.nextFollowUpDate = new Date(nextFollowUpDate);
        } else if (req.body.clearFollowUp || action === 'done') {
            lead.nextFollowUpDate = undefined;
        }

        if (followUpType) {
            lead.followUpType = followUpType;
        }

        if (!lead.ownerId) {
            lead.ownerId = lead.assignedTo || lead.createdBy;
        }

        if (action === 'reschedule' && !nextFollowUpDate) {
            throw new AppError('Next follow-up date is required', 400);
        }

        if (action === 'done') {
            lead.lastContactedDate = new Date();
            lead.followUpCount = (lead.followUpCount || 0) + 1;
        }

        await lead.save();

        if (note || action === 'done' || action === 'reschedule') {
            const activityType = mapFollowUpTypeToActivity(followUpType);
            const subject = action === 'done'
                ? 'Follow-up completed'
                : action === 'reschedule'
                    ? 'Follow-up rescheduled'
                    : 'Follow-up updated';
            await Activity.create({
                activityType,
                relatedTo: { model: 'Lead', id: lead._id },
                subject,
                description: note,
                activityDate: new Date(),
                nextFollowUpDate: lead.nextFollowUpDate,
                createdBy: req.user!._id
            });
            await LeadActivity.create({
                leadId: lead._id,
                type: action === 'done' ? 'FOLLOWUP_COMPLETED' : 'FOLLOWUP_SCHEDULED',
                message: note?.trim() || subject,
                meta: {
                    followUpType: followUpType || null,
                    followUpAt: lead.nextFollowUpDate || null,
                    action
                },
                createdBy: req.user!._id
            });
            lead.lastActivityAt = new Date();
            if (!lead.firstResponseAt) {
                lead.firstResponseAt = new Date();
            }
            await lead.save();
        }

        const leadData = lead.toObject() as LeadPlain;
        leadData.leadHealth = getLeadHealth(leadData.nextFollowUpDate);
        leadData.ownerId = leadData.ownerId || leadData.assignedTo || leadData.createdBy;

        res.status(200).json({
            success: true,
            message: 'Follow-up updated successfully',
            data: { lead: leadData }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add note to lead
// @route   POST /api/leads/:id/notes
// @access  Private
export const addLeadNote = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid lead identifier', 400);
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        if ((req.user!.role === 'BDM' || req.user!.role === 'User') && lead.assignedTo?.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to update this lead', 403);
        }

        const note = req.body.note;
        if (!note || typeof note !== 'string' || !note.trim()) {
            throw new AppError('Note is required', 400);
        }

        const activity = await Activity.create({
            activityType: 'Note',
            relatedTo: { model: 'Lead', id: lead._id },
            subject: 'Lead note',
            description: note.trim(),
            activityDate: new Date(),
            createdBy: req.user!._id
        });
        await LeadActivity.create({
            leadId: lead._id,
            type: 'NOTE',
            message: note.trim(),
            createdBy: req.user!._id
        });

        lead.lastActivityAt = new Date();
        if (!lead.firstResponseAt) {
            lead.firstResponseAt = new Date();
        }
        if (!lead.ownerId) {
            lead.ownerId = lead.assignedTo || lead.createdBy;
        }
        await lead.save();

        res.status(201).json({
            success: true,
            message: 'Note added successfully',
            data: { activityId: activity._id }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get stuck leads
// @route   GET /api/leads/stuck
// @access  Private
export const getStuckLeads = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const days = Math.max(Number(req.query.days) || 14, 1);
        const limit = Math.min(Number(req.query.limit) || 10, 50);
        const ownerId = req.query.ownerId as string | undefined;
        const excludeStages = ['Won', 'Lost', 'Closed'];
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const filter: LeadFilter = {
            status: { $nin: excludeStages },
            $or: [
                { lastStageChangedAt: { $lt: cutoff } },
                { lastStageChangedAt: { $exists: false }, createdAt: { $lt: cutoff } },
                { lastStageChangedAt: null, createdAt: { $lt: cutoff } }
            ]
        };

        if (ownerId) {
            applyOrFilter(filter, [{ ownerId }, { assignedTo: ownerId }]);
        } else if (req.user!.role === 'BDM' || req.user!.role === 'User') {
            filter.assignedTo = req.user!._id;
        } else if (req.user!.role === 'Manager' && req.user!.teamId) {
            const teamMembers = await User.find({ teamId: req.user!.teamId }).select('_id');
            filter.assignedTo = { $in: teamMembers.map(m => m._id) };
        }

        const leads = await Lead.find(filter)
            .select('firstName lastName company status ownerId assignedTo lastStageChangedAt createdAt')
            .populate('ownerId', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email')
            .sort({ lastStageChangedAt: 1 })
            .limit(limit);

        const now = Date.now();
        const data = leads.map((lead) => {
            const doc = lead.toObject() as LeadPlain;
            const lastChangeDate = doc.lastStageChangedAt || doc.createdAt;
            const lastChange = lastChangeDate ? new Date(lastChangeDate).getTime() : now;
            const daysStuck = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
            const owner = doc.ownerId || doc.assignedTo;
            return {
                leadId: doc._id,
                name: `${doc.firstName} ${doc.lastName}`.trim(),
                company: doc.company,
                stage: doc.status,
                owner: owner
                    ? {
                        _id: owner._id,
                        firstName: owner.firstName,
                        lastName: owner.lastName,
                        email: owner.email
                    }
                    : null,
                lastStageChangedAt: doc.lastStageChangedAt,
                daysStuck
            };
        });

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

