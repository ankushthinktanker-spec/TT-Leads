import { Response, NextFunction } from 'express';
import Lead from '../models/lead.model';
import User, { IUser } from '../models/user.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { Roles } from '../constants/roles';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';
import { createLeadSchema, updateLeadSchema, updateLeadStatusSchema, assignLeadSchema } from '../validators/lead.validator';
import mongoose from 'mongoose';
import { leadRepository } from '../repositories/lead.repository';
import LeadStageHistory from '../models/lead-stage-history.model';
import LeadActivity from '../models/lead-activity.model';
import { queue } from '../services/queue.service';
import { JobType } from '../jobs/job.types';
import { writeAuditLog } from '../services/audit.service';
import { escapeRegex } from '../utils/regex.utils';
import { LeadAssignmentService, enrichLeadData } from '../services/lead-assignment.service';
import { applyOrFilter, LeadFilter } from '../utils/ownerFilters';

interface PopulatedUser {
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
}

interface LeadPlain extends Record<string, unknown> {
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    companyName?: string;
    status: string;
    priority: string;
    source: string;
    assignedTo?: mongoose.Types.ObjectId | PopulatedUser | null;
    ownerId?: mongoose.Types.ObjectId | PopulatedUser | null;
    createdBy: mongoose.Types.ObjectId;
    createdAt?: Date;
    lastStageChangedAt?: Date | null;
    nextFollowUpDate?: Date;
    leadHealth?: string;
}

const toAuditChanges = (value: { toObject: () => Record<string, unknown> }): Record<string, unknown> => value.toObject();

const getUserTeamId = (user: Pick<IUser, 'teamId'>): mongoose.Types.ObjectId | undefined => user.teamId;

const getPopulatedUser = (
    user: mongoose.Types.ObjectId | PopulatedUser | null | undefined
): PopulatedUser | null => {
    if (!user || user instanceof mongoose.Types.ObjectId) {
        return null;
    }

    return user;
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
        if (req.user!.role === Roles.BDM || req.user!.role === Roles.USER) {
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
            const dateFilter: { $gte?: Date; $lte?: Date } = {};
            if (startDate) dateFilter.$gte = new Date(startDate as string);
            if (endDate) dateFilter.$lte = new Date(endDate as string);
            filter.createdAt = dateFilter;
        }

        // Search filter
        if (search) {
            const searchRegex = new RegExp(escapeRegex(search as string), 'i');
            applyOrFilter(filter, [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
                { company: searchRegex }
            ]);
        }

        // Pagination
        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const [leads, total] = await Promise.all([
            Lead.find(filter)
                .populate('assignedTo', 'firstName lastName email avatar')
                .populate('ownerId', 'firstName lastName email')
                .populate('createdBy', 'firstName lastName email')
                .sort(sort)
                .skip(skip)
                .limit(limit),
            leadRepository.count(req.tenantId!, filter)
        ]);

        const leadsWithHealth = leads.map((lead) => enrichLeadData(lead));

        res.status(200).json({
            success: true,
            data: {
                data: leadsWithHealth,
                meta: buildPaginationMeta(page, limit, total)
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

        const lead = await leadRepository.findById(req.tenantId!, req.params.id, {
            populate: [
                { path: 'assignedTo', select: 'firstName lastName email avatar status leadsAssigned' },
                { path: 'ownerId', select: 'firstName lastName email' },
                { path: 'createdBy', select: 'firstName lastName email' },
                { path: 'teamId', select: 'name' }
            ]
        });

        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        // Check access
        if ((req.user!.role === Roles.BDM || req.user!.role === Roles.USER) && lead.assignedTo?.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to view this lead', 403);
        }

        const leadData = enrichLeadData(lead);

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
        const { error, value } = createLeadSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        // Check for duplicate email or phone via repository (tenant-scoped)
        const existingLead = await leadRepository.exists(
            req.tenantId!,
            { $or: [{ email: value.email }, { phone: value.phone }] }
        );

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
            teamId = getUserTeamId(assignedUser);
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

        // Notification Queue
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

        // SECURITY: Audit Log Creation
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'CREATE',
            entityType: 'Lead',
            entityId: lead._id.toString(),
            ip: req.ip,
            changes: toAuditChanges(lead)
        });

        const leadData = enrichLeadData(lead);

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

        const { error, value } = updateLeadSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const lead = await leadRepository.findById(req.tenantId!, req.params.id);
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        // Check access
        if ((req.user!.role === Roles.BDM || req.user!.role === Roles.USER) && lead.assignedTo?.toString() !== req.user!._id.toString()) {
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
            await LeadAssignmentService.handleAssignmentChange({
                newAssignedTo: updateValue.assignedTo,
                previousAssignedTo: lead.assignedTo?.toString(),
                tenantId: req.tenantId!,
                update
            });
        }

        // Update lead via repository (tenant-scoped)
        const updatedLead = await leadRepository.updateById(req.tenantId!, req.params.id, update, {
            populate: [{ path: 'assignedTo', select: 'firstName lastName email' }]
        });

        if (!updatedLead) {
            throw new AppError('Update failed: Lead not found', 404);
        }

        // SECURITY: Audit Log Update
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'UPDATE',
            entityType: 'Lead',
            entityId: updatedLead._id.toString(),
            ip: req.ip,
            changes: { before: toAuditChanges(lead), after: toAuditChanges(updatedLead) }
        });

        const updatedLeadData = enrichLeadData(updatedLead);

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
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid lead identifier', 400);
        }
        const lead = await leadRepository.findById(req.tenantId!, req.params.id);
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        // SECURITY: Audit Log Delete
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'DELETE',
            entityType: 'Lead',
            entityId: lead._id.toString(),
            ip: req.ip,
            changes: toAuditChanges(lead)
        });

        await leadRepository.deleteById(req.tenantId!, req.params.id);

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
        const { error, value } = updateLeadStatusSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const lead = await leadRepository.findById(req.tenantId!, req.params.id);
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        // Check access
        if ((req.user!.role === Roles.BDM || req.user!.role === Roles.USER) && lead.assignedTo?.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to update this lead', 403);
        }

        const leadData = await LeadAssignmentService.transitionStatus({
            leadId: req.params.id,
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            userId: req.user!._id,
            ip: req.ip,
            newStatus: value.status,
            lostReason: value.lostReason
        });

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
        const { error, value } = assignLeadSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const lead = await LeadAssignmentService.assignLead({
            leadId: req.params.id,
            assignedTo: value.assignedTo,
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            ip: req.ip
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
        const leads = await leadRepository.find(req.tenantId!, { assignedTo: req.user!._id }, {
            populate: [{ path: 'createdBy', select: 'firstName lastName email' }],
            sort: { createdAt: -1 },
            lean: true
        });

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

        // Access check before delegating to service
        const lead = await leadRepository.findById(req.tenantId!, req.params.id);
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        if ((req.user!.role === Roles.BDM || req.user!.role === Roles.USER) && lead.assignedTo?.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to update this lead', 403);
        }

        const leadData = await LeadAssignmentService.updateFollowUp({
            leadId: req.params.id,
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            userId: req.user!._id,
            ip: req.ip,
            nextFollowUpDate: req.body.nextFollowUpAt || req.body.nextFollowUpDate,
            followUpType: req.body.followUpType,
            note: req.body.note,
            action: req.body.action || 'reschedule',
            clearFollowUp: req.body.clearFollowUp
        });

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

        const lead = await leadRepository.findById(req.tenantId!, req.params.id);
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        if ((req.user!.role === Roles.BDM || req.user!.role === Roles.USER) && lead.assignedTo?.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to update this lead', 403);
        }

        const note = req.body.note;
        if (!note || typeof note !== 'string' || !note.trim()) {
            throw new AppError('Note is required', 400);
        }

        const activityId = await LeadAssignmentService.addNote({
            leadId: req.params.id,
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            userId: req.user!._id,
            ip: req.ip,
            note: note.trim()
        });

        res.status(201).json({
            success: true,
            message: 'Note added successfully',
            data: { activityId }
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
        } else if (req.user!.role === Roles.BDM || req.user!.role === Roles.USER) {
            filter.assignedTo = req.user!._id;
        } else if (req.user!.role === Roles.MANAGER && req.user!.teamId) {
            const teamMembers = await User.find({ teamId: req.user!.teamId, tenantId: req.tenantId! }).select('_id');
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
            const doc = lead.toObject() as unknown as LeadPlain;
            const lastChangeDate = doc.lastStageChangedAt || doc.createdAt;
            const lastChange = lastChangeDate ? new Date(lastChangeDate).getTime() : now;
            const daysStuck = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));

            const owner = getPopulatedUser(doc.ownerId || doc.assignedTo);

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
