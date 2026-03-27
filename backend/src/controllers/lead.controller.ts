import { Response, NextFunction } from 'express';
import Lead, { ILead } from '../models/lead.model';
import User from '../models/user.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { createLeadSchema, updateLeadSchema, updateLeadStatusSchema, assignLeadSchema } from '../validators/lead.validator';
import mongoose, { FilterQuery } from 'mongoose';
import { leadRepository } from '../repositories/lead.repository';
import LeadStageHistory from '../models/lead-stage-history.model';
import LeadActivity from '../models/lead-activity.model';
import Activity from '../models/activity.model';
import { queue } from '../services/queue.service';
import { JobType } from '../jobs/job.types';
import { writeAuditLog } from '../services/audit.service';

/**
 * Utility to calculate lead health based on follow-up dates
 */
const getLeadHealth = (nextFollowUpDate?: Date): string => {
    if (!nextFollowUpDate) return 'Cold';
    const now = new Date();
    const followUp = new Date(nextFollowUpDate);
    const diffDays = (followUp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return 'Overdue';
    if (diffDays <= 2) return 'Hot';
    if (diffDays <= 7) return 'Warm';
    return 'Cold';
};

interface LeadPlain extends Record<string, any> {
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    status: string;
    priority: string;
    source: string;
    assignedTo?: any;
    ownerId?: any;
    createdBy: mongoose.Types.ObjectId;
    nextFollowUpDate?: Date;
    leadHealth?: string;
}

type LeadFilter = FilterQuery<ILead> & {
    $or?: any[];
};

const applyOrFilter = (filter: LeadFilter, conditions: any[]) => {
    if (!filter.$or) filter.$or = [];
    filter.$or.push(...conditions);
};

const mapFollowUpTypeToActivity = (type?: string): 'Call' | 'Meeting' | 'Email' | 'WhatsApp' | 'Note' => {
    if (!type) return 'Call';
    const t = type.toLowerCase();
    if (t.includes('call')) return 'Call';
    if (t.includes('meeting')) return 'Meeting';
    if (t.includes('email')) return 'Email';
    if (t.includes('whatsapp')) return 'WhatsApp';
    return 'Note';
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
            priority,
            source,
            assignedTo,
            ownerId,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search
        } = req.query;

        // Build filter - Critical Tenant Isolation
        const filter: LeadFilter = { tenantId: req.tenantId! };

        // RBAC constraints on visibility
        if (req.user!.role === 'BDM' || req.user!.role === 'User') {
            filter.assignedTo = req.user!._id;
        } else if (assignedTo) {
            filter.assignedTo = assignedTo;
        }

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (source) filter.source = source;
        if (ownerId) filter.ownerId = ownerId;

        // Date range filter
        if (startDate || endDate) {
            const dateFilter: any = {};
            if (startDate) dateFilter.$gte = new Date(startDate as string);
            if (endDate) dateFilter.$lte = new Date(endDate as string);
            filter.createdAt = dateFilter;
        }

        // Search filter
        if (search) {
            const searchRegex = new RegExp(search as string, 'i');
            applyOrFilter(filter, [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
                { companyName: searchRegex }
            ]);
        }

        // Pagination
        const skip = (Number(page) - 1) * Number(limit);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const leads = await Lead.find(filter)
            .populate('assignedTo', 'firstName lastName email avatar')
            .populate('ownerId', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        const total = await Lead.countDocuments(filter);

        const leadsWithHealth = leads.map((lead) => {
            const leadData = lead.toObject() as LeadPlain;
            leadData.leadHealth = getLeadHealth(leadData.nextFollowUpDate);
            leadData.ownerId = leadData.ownerId || leadData.assignedTo || leadData.createdBy;
            return leadData;
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
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid lead identifier', 400);
        }

        const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId! })
            .populate('assignedTo', 'firstName lastName email avatar status leadsAssigned')
            .populate('ownerId', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email')
            .populate('teamId', 'name');

        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
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

        // Check for duplicate email or phone - Multi-Tenant safe check
        const existingLead = await Lead.findOne({
            tenantId: req.tenantId!,
            $or: [{ email: value.email }, { phone: value.phone }]
        });

        if (existingLead) {
            throw new AppError('Lead with this email or phone already exists in your organization', 400);
        }

        const nextFollowUpDate = value.nextFollowUpAt || value.nextFollowUpDate;
        if (!nextFollowUpDate) {
            throw new AppError('Next follow-up date is required', 400);
        }
        const ownerId = value.ownerId || value.assignedTo || req.user!._id;
        const assignedTo = value.assignedTo || ownerId;

        let teamId = value.teamId;
        if (assignedTo) {
            // Securely find user within tenant boundaries
            const assignedUser = assignedTo.toString() === req.user!._id.toString()
                ? req.user!
                : await User.findOne({ _id: assignedTo, tenantId: req.tenantId! });

            if (!assignedUser) {
                throw new AppError('Assigned user not found in your organization', 404);
            }
            teamId = (assignedUser as any).teamId;
        }

        // Create lead via Multi-Tenant safe repository
        const lead = await leadRepository.create(req.tenantId!, {
            ...value,
            teamId,
            ownerId,
            assignedTo,
            nextFollowUpDate,
            createdBy: req.user!._id
        });

        // 📍 Notification Queue
        if (assignedTo && value.email) {
            queue.enqueue(JobType.SEND_EMAIL, {
                to: value.email,
                subject: 'Lead Inquiry Acknowledged',
                htmlContent: `<h3>Hello ${value.firstName},</h3><p>Your inquiry has been successfully received by our team and assigned to a consultant who will reach out shortly.</p>`,
                tenantId: req.tenantId!
            });
        }

        // Update user stats safely
        if (assignedTo) {
            await User.findOneAndUpdate(
                { _id: assignedTo, tenantId: req.tenantId! },
                { $inc: { leadsAssigned: 1 } }
            );
        }

        // 📍 SECURITY: Audit Log Creation
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'CREATE',
            entityType: 'Lead',
            entityId: lead._id.toString(),
            ip: req.ip,
            changes: lead.toObject() as any
        });

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
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid lead identifier', 400);
        }

        const { error, value } = updateLeadSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        // Check access
        if ((req.user!.role === 'BDM' || req.user!.role === 'User') && lead.assignedTo?.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to update this lead', 403);
        }

        const previousStatus = lead.status;
        const previousFollowUp = lead.nextFollowUpDate ? lead.nextFollowUpDate.toISOString() : null;
        const previousFollowUpType = lead.followUpType || null;

        const updateValue = { ...value };
        if (value.nextFollowUpAt && !value.nextFollowUpDate) {
            updateValue.nextFollowUpDate = value.nextFollowUpAt;
        }
        if (value.ownerId && !value.assignedTo) {
            updateValue.assignedTo = value.ownerId;
        }
        if (value.assignedTo && !value.ownerId) {
            updateValue.ownerId = value.assignedTo;
        }
        if (value.status && value.status !== previousStatus) {
            updateValue.lastStageChangedAt = new Date();
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
                    await User.findOneAndUpdate(
                        { _id: previousAssignedTo, tenantId: req.tenantId! },
                        { $inc: { leadsAssigned: -1 } }
                    );
                }
                update.$set.teamId = null;
            } else if (newAssignedTo.toString() !== previousAssignedTo) {
                const assignedUser = await User.findOne({ _id: newAssignedTo, tenantId: req.tenantId! });
                if (!assignedUser) {
                    throw new AppError('Assigned user not found in your organization', 404);
                }

                if (previousAssignedTo) {
                    await User.findOneAndUpdate(
                        { _id: previousAssignedTo, tenantId: req.tenantId! },
                        { $inc: { leadsAssigned: -1 } }
                    );
                }

                await User.findOneAndUpdate(
                    { _id: newAssignedTo, tenantId: req.tenantId! },
                    { $inc: { leadsAssigned: 1 } }
                );
                update.$set.teamId = (assignedUser as any).teamId;
            }
        }

        // Update lead securely
        const updatedLead = await Lead.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId! },
            update,
            { new: true, runValidators: true }
        ).populate('assignedTo', 'firstName lastName email');

        if (!updatedLead) {
            throw new AppError('Update failed: Lead not found', 404);
        }

        // 📍 SECURITY: Audit Log Update
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'UPDATE',
            entityType: 'Lead',
            entityId: updatedLead._id.toString(),
            ip: req.ip,
            changes: { before: lead.toObject() as any, after: updatedLead.toObject() as any }
        });

        const updatedLeadData = updatedLead.toObject() as LeadPlain;
        updatedLeadData.leadHealth = getLeadHealth(updatedLeadData.nextFollowUpDate);
        updatedLeadData.ownerId = updatedLeadData.ownerId || updatedLeadData.assignedTo || updatedLeadData.createdBy;

        const nextFollowUpIso = updatedLead.nextFollowUpDate ? updatedLead.nextFollowUpDate.toISOString() : null;
        const nextFollowUpType = updatedLead.followUpType || null;

        if (nextFollowUpIso !== previousFollowUp || nextFollowUpType !== previousFollowUpType) {
            await LeadActivity.create({
                tenantId: req.tenantId!,
                leadId: lead._id,
                type: 'FOLLOWUP_SCHEDULED',
                message: 'Follow-up updated',
                meta: {
                    followUpAt: updatedLead.nextFollowUpDate || null,
                    followUpType: updatedLead.followUpType || null,
                    previousFollowUpAt: previousFollowUp
                },
                createdBy: req.user!._id
            });
        }

        if (value.status && value.status !== previousStatus) {
            await LeadStageHistory.create({
                tenantId: req.tenantId!,
                leadId: lead._id,
                fromStatus: previousStatus,
                toStatus: value.status,
                changedBy: req.user!._id,
                changedAt: new Date()
            });
            await LeadActivity.create({
                tenantId: req.tenantId!,
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
            data: { lead: updatedLeadData }
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
        const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        // 📍 SECURITY: Audit Log Delete
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'DELETE',
            entityType: 'Lead',
            entityId: lead._id.toString(),
            ip: req.ip,
            changes: lead.toObject() as any
        });

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

        const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        // Check access
        if ((req.user!.role === 'BDM' || req.user!.role === 'User') && lead.assignedTo?.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to update this lead', 403);
        }

        const previousStatus = lead.status;
        const previousLeadState = lead.toObject();
        lead.status = value.status;
        if (previousStatus !== value.status) {
            lead.lastStageChangedAt = new Date();
        }
        if (value.status === 'Won' && previousStatus !== 'Won') {
            lead.convertedAt = new Date();
            lead.closedAt = new Date();
            // Update user stats safely
            if (lead.assignedTo) {
                await User.findOneAndUpdate(
                    { _id: lead.assignedTo, tenantId: req.tenantId! },
                    { $inc: { leadsConverted: 1, totalRevenue: lead.dealValue || 0 } }
                );
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
                tenantId: req.tenantId!,
                leadId: lead._id,
                fromStatus: previousStatus,
                toStatus: value.status,
                changedBy: req.user!._id,
                changedAt: new Date()
            });
            await LeadActivity.create({
                tenantId: req.tenantId!,
                leadId: lead._id,
                type: 'STAGE_CHANGE',
                message: `Stage changed from ${previousStatus} to ${value.status}`,
                meta: { oldStage: previousStatus, newStage: value.status },
                createdBy: req.user!._id
            });
        }

        // 📍 SECURITY: Audit Log Status Update
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'STATUS_UPDATE',
            entityType: 'Lead',
            entityId: lead._id.toString(),
            ip: req.ip,
            changes: { from: previousStatus, to: value.status, previousLead: previousLeadState as any }
        });

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

        const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        // Check if user exists within tenant boundary
        const user = await User.findOne({ _id: value.assignedTo, tenantId: req.tenantId! });
        if (!user) {
            throw new AppError('User not found in your organization', 404);
        }

        const previousAssignedTo = lead.assignedTo;

        // Update previous assignee stats safely
        if (previousAssignedTo) {
            await User.findOneAndUpdate(
                { _id: previousAssignedTo, tenantId: req.tenantId! },
                { $inc: { leadsAssigned: -1 } }
            );
        }

        // Update new assignee stats safely
        await User.findOneAndUpdate(
            { _id: value.assignedTo, tenantId: req.tenantId! },
            { $inc: { leadsAssigned: 1 } }
        );

        // Update lead
        lead.assignedTo = value.assignedTo;
        lead.teamId = (user as any).teamId;
        await lead.save();

        // 📍 SECURITY: Audit Log Assignment
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'ASSIGN',
            entityType: 'Lead',
            entityId: lead._id.toString(),
            ip: req.ip,
            changes: { from: previousAssignedTo as any, to: value.assignedTo }
        });

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
        const leads = await Lead.find({ assignedTo: req.user!._id, tenantId: req.tenantId! })
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

        const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        if ((req.user!.role === 'BDM' || req.user!.role === 'User') && lead.assignedTo?.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to update this lead', 403);
        }

        const nextFollowUpDate = req.body.nextFollowUpAt || req.body.nextFollowUpDate;
        const followUpType = req.body.followUpType;
        const note = req.body.note;
        const action = req.body.action || 'reschedule';

        const previousFollowUp = lead.nextFollowUpDate;

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
                tenantId: req.tenantId!,
                activityType,
                relatedTo: { model: 'Lead', id: lead._id },
                subject,
                description: note,
                activityDate: new Date(),
                nextFollowUpDate: lead.nextFollowUpDate,
                createdBy: req.user!._id
            });

            await LeadActivity.create({
                tenantId: req.tenantId!,
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

        // 📍 SECURITY: Audit Log Follow-up Update
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'FOLLOWUP_UPDATE',
            entityType: 'Lead',
            entityId: lead._id.toString(),
            ip: req.ip,
            changes: { from: previousFollowUp as any, to: lead.nextFollowUpDate, action }
        });

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

        const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        if ((req.user!.role === 'BDM' || req.user!.role === 'User') && lead.assignedTo?.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to update this lead', 403);
        }

        const note = req.body.note;
        if (!note || typeof note !== 'string' || !note.trim()) {
            throw new AppError('Note is required', 400);
        }

        const activity = await Activity.create({
            tenantId: req.tenantId!,
            activityType: 'Note',
            relatedTo: { model: 'Lead', id: lead._id },
            subject: 'Lead note',
            description: note.trim(),
            activityDate: new Date(),
            createdBy: req.user!._id
        });

        await LeadActivity.create({
            tenantId: req.tenantId!,
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

        // 📍 SECURITY: Audit Log Note creation
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'NOTE_ADD',
            entityType: 'Lead',
            entityId: lead._id.toString(),
            ip: req.ip,
            changes: { note: note.trim() }
        });

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
            tenantId: req.tenantId!,
            status: { $nin: excludeStages },
            $or: [
                { lastStageChangedAt: { $lt: cutoff } },
                { lastStageChangedAt: { $exists: false }, createdAt: { $lt: cutoff } },
                { lastStageChangedAt: null, createdAt: { $lt: cutoff } }
            ]
        };

        if (ownerId) {
            // Verify ownerId belongs to the tenant
            const targetUser = await User.findOne({ _id: ownerId, tenantId: req.tenantId! });
            if (targetUser) {
                applyOrFilter(filter, [{ ownerId }, { assignedTo: ownerId }]);
            }
        } else if (req.user!.role === 'BDM' || req.user!.role === 'User') {
            filter.assignedTo = req.user!._id;
        } else if (req.user!.role === 'Manager' && req.user!.teamId) {
            const teamMembers = await User.find({ teamId: req.user!.teamId, tenantId: req.tenantId! }).select('_id');
            filter.assignedTo = { $in: teamMembers.map(m => m._id) };
        }

        const leads = await Lead.find(filter)
            .select('firstName lastName companyName status ownerId assignedTo lastStageChangedAt createdAt')
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
            
            // Populate logic safety check
            const owner = (doc.ownerId || doc.assignedTo) as any;
            
            return {
                leadId: doc._id,
                name: `${doc.firstName} ${doc.lastName}`.trim(),
                company: (doc as any).companyName || doc.company,
                stage: doc.status,
                owner: owner && typeof owner === 'object' && owner.firstName
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
