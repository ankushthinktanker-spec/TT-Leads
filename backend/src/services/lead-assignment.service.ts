import Lead from '../models/lead.model';
import User, { IUser } from '../models/user.model';
import LeadStageHistory from '../models/lead-stage-history.model';
import LeadActivity from '../models/lead-activity.model';
import Activity from '../models/activity.model';
import { AppError } from '../middleware/errorHandler';
import { writeAuditLog } from '../services/audit.service';
import mongoose from 'mongoose';

interface UserSummary {
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
    status: string;
    priority: string;
    source: string;
    assignedTo?: mongoose.Types.ObjectId | UserSummary | null;
    ownerId?: mongoose.Types.ObjectId | UserSummary | null;
    createdBy: mongoose.Types.ObjectId;
    nextFollowUpDate?: Date;
    leadHealth?: string;
}

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

const mapFollowUpTypeToActivity = (type?: string): 'Call' | 'Meeting' | 'Email' | 'WhatsApp' | 'Note' => {
    if (!type) return 'Call';
    const t = type.toLowerCase();
    if (t.includes('call')) return 'Call';
    if (t.includes('meeting')) return 'Meeting';
    if (t.includes('email')) return 'Email';
    if (t.includes('whatsapp')) return 'WhatsApp';
    return 'Note';
};

const toAuditChanges = (value: { toObject: () => Record<string, unknown> }): Record<string, unknown> => value.toObject();

const getUserTeamId = (user: Pick<IUser, 'teamId'>): mongoose.Types.ObjectId | undefined => user.teamId;

export function enrichLeadData(lead: { toObject: () => Record<string, unknown> }): LeadPlain {
    const leadData = lead.toObject() as LeadPlain;
    leadData.leadHealth = getLeadHealth(leadData.nextFollowUpDate);
    leadData.ownerId = leadData.ownerId || leadData.assignedTo || leadData.createdBy;
    return leadData;
}

export class LeadAssignmentService {
    /**
     * Assign a lead to a user, updating stats for both old and new assignee.
     */
    static async assignLead(params: {
        leadId: string;
        assignedTo: string;
        tenantId: string;
        actorId: string;
        ip?: string;
    }) {
        const { leadId, assignedTo, tenantId, actorId, ip } = params;

        const lead = await Lead.findOne({ _id: leadId, tenantId });
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        const user = await User.findOne({ _id: assignedTo, tenantId });
        if (!user) {
            throw new AppError('User not found in your organization', 404);
        }

        const previousAssignedTo = lead.assignedTo;

        if (previousAssignedTo) {
            await User.findOneAndUpdate(
                { _id: previousAssignedTo, tenantId },
                { $inc: { leadsAssigned: -1 } }
            );
        }

        await User.findOneAndUpdate(
            { _id: assignedTo, tenantId },
            { $inc: { leadsAssigned: 1 } }
        );

        lead.assignedTo = new mongoose.Types.ObjectId(assignedTo);
        lead.teamId = getUserTeamId(user);
        await lead.save();

        await writeAuditLog({
            tenantId,
            actorId,
            action: 'ASSIGN',
            entityType: 'Lead',
            entityId: lead._id.toString(),
            ip,
            changes: { from: previousAssignedTo?.toString() ?? null, to: assignedTo }
        });

        return lead;
    }

    /**
     * Handle follow-up update logic: reschedule, mark done, add notes, and create activities.
     */
    static async updateFollowUp(params: {
        leadId: string;
        tenantId: string;
        actorId: string;
        userId: mongoose.Types.ObjectId;
        ip?: string;
        nextFollowUpDate?: string;
        followUpType?: string;
        note?: string;
        action: string;
        clearFollowUp?: boolean;
    }) {
        const { leadId, tenantId, actorId, userId, ip, nextFollowUpDate, followUpType, note, action, clearFollowUp } = params;

        const lead = await Lead.findOne({ _id: leadId, tenantId });
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        const previousFollowUp = lead.nextFollowUpDate;

        if (nextFollowUpDate) {
            lead.nextFollowUpDate = new Date(nextFollowUpDate);
        } else if (clearFollowUp || action === 'done') {
            lead.nextFollowUpDate = undefined;
        }

        if (followUpType) {
            lead.followUpType = followUpType as 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING';
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
                tenantId,
                activityType,
                relatedTo: { model: 'Lead', id: lead._id },
                subject,
                description: note,
                activityDate: new Date(),
                nextFollowUpDate: lead.nextFollowUpDate,
                createdBy: userId
            });

            await LeadActivity.create({
                tenantId,
                leadId: lead._id,
                type: action === 'done' ? 'FOLLOWUP_COMPLETED' : 'FOLLOWUP_SCHEDULED',
                message: note?.trim() || subject,
                meta: {
                    followUpType: followUpType || null,
                    followUpAt: lead.nextFollowUpDate || null,
                    action
                },
                createdBy: userId
            });

            lead.lastActivityAt = new Date();
            if (!lead.firstResponseAt) {
                lead.firstResponseAt = new Date();
            }
            await lead.save();
        }

        await writeAuditLog({
            tenantId,
            actorId,
            action: 'FOLLOWUP_UPDATE',
            entityType: 'Lead',
            entityId: lead._id.toString(),
            ip,
            changes: { from: previousFollowUp?.toISOString() ?? null, to: lead.nextFollowUpDate ?? null, action }
        });

        return enrichLeadData(lead);
    }

    /**
     * Transition a lead's status, recording history and handling Won/Lost side-effects.
     */
    static async transitionStatus(params: {
        leadId: string;
        tenantId: string;
        actorId: string;
        userId: mongoose.Types.ObjectId;
        ip?: string;
        newStatus: string;
        lostReason?: string;
    }) {
        const { leadId, tenantId, actorId, userId, ip, newStatus, lostReason } = params;

        const lead = await Lead.findOne({ _id: leadId, tenantId });
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        const previousStatus = lead.status;
        const previousLeadState = toAuditChanges(lead);
        lead.status = newStatus;

        if (previousStatus !== newStatus) {
            lead.lastStageChangedAt = new Date();
        }

        if (newStatus === 'Won' && previousStatus !== 'Won') {
            lead.convertedAt = new Date();
            lead.closedAt = new Date();
            if (lead.assignedTo) {
                await User.findOneAndUpdate(
                    { _id: lead.assignedTo, tenantId },
                    { $inc: { leadsConverted: 1, totalRevenue: lead.dealValue || 0 } }
                );
            }
        } else if (newStatus === 'Lost') {
            lead.closedAt = new Date();
            lead.lostReason = lostReason;
        } else {
            lead.lostReason = undefined;
        }

        await lead.save();

        if (previousStatus !== newStatus) {
            await LeadStageHistory.create({
                tenantId,
                leadId: lead._id,
                fromStatus: previousStatus,
                toStatus: newStatus,
                changedBy: userId,
                changedAt: new Date()
            });
            await LeadActivity.create({
                tenantId,
                leadId: lead._id,
                type: 'STAGE_CHANGE',
                message: `Stage changed from ${previousStatus} to ${newStatus}`,
                meta: { oldStage: previousStatus, newStage: newStatus },
                createdBy: userId
            });
        }

        await writeAuditLog({
            tenantId,
            actorId,
            action: 'STATUS_UPDATE',
            entityType: 'Lead',
            entityId: lead._id.toString(),
            ip,
            changes: { from: previousStatus, to: newStatus, previousLead: previousLeadState }
        });

        return enrichLeadData(lead);
    }

    /**
     * Add a note to a lead, creating Activity + LeadActivity records and updating lead timestamps.
     * The caller must have already verified access rights.
     */
    static async addNote(params: {
        leadId: string;
        tenantId: string;
        actorId: string;
        userId: mongoose.Types.ObjectId;
        ip?: string;
        note: string;
    }) {
        const { leadId, tenantId, actorId, userId, ip, note } = params;

        const lead = await Lead.findOne({ _id: leadId, tenantId });
        if (!lead) {
            throw new AppError('Lead not found or unauthorized access', 404);
        }

        const activity = await Activity.create({
            tenantId,
            activityType: 'Note',
            relatedTo: { model: 'Lead', id: lead._id },
            subject: 'Lead note',
            description: note,
            activityDate: new Date(),
            createdBy: userId
        });

        await LeadActivity.create({
            tenantId,
            leadId: lead._id,
            type: 'NOTE',
            message: note,
            createdBy: userId
        });

        lead.lastActivityAt = new Date();
        if (!lead.firstResponseAt) lead.firstResponseAt = new Date();
        if (!lead.ownerId) lead.ownerId = lead.assignedTo || lead.createdBy;
        await lead.save();

        await writeAuditLog({
            tenantId,
            actorId,
            action: 'NOTE_ADD',
            entityType: 'Lead',
            entityId: lead._id.toString(),
            ip,
            changes: { note }
        });

        return activity._id;
    }

    /**
     * Handle assignedTo changes during a lead update, adjusting user stats and teamId.
     */
    static async handleAssignmentChange(params: {
        newAssignedTo: string | mongoose.Types.ObjectId | null | undefined;
        previousAssignedTo: string | undefined;
        tenantId: string;
        update: { $set: Record<string, unknown>; $unset?: Record<string, unknown> };
    }) {
        const { newAssignedTo, previousAssignedTo, tenantId, update } = params;

        if (!newAssignedTo) {
            if (previousAssignedTo) {
                await User.findOneAndUpdate(
                    { _id: previousAssignedTo, tenantId },
                    { $inc: { leadsAssigned: -1 } }
                );
            }
            update.$set.teamId = null;
        } else if (newAssignedTo.toString() !== previousAssignedTo) {
            const assignedUser = await User.findOne({ _id: newAssignedTo, tenantId });
            if (!assignedUser) {
                throw new AppError('Assigned user not found in your organization', 404);
            }

            if (previousAssignedTo) {
                await User.findOneAndUpdate(
                    { _id: previousAssignedTo, tenantId },
                    { $inc: { leadsAssigned: -1 } }
                );
            }

            await User.findOneAndUpdate(
                { _id: newAssignedTo, tenantId },
                { $inc: { leadsAssigned: 1 } }
            );
            update.$set.teamId = getUserTeamId(assignedUser);
        }
    }
}
