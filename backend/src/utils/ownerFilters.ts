import User from '../models/user.model';
import { AuthRequest } from '../middleware/auth.middleware';
import mongoose, { type FilterQuery } from 'mongoose';
import { Roles } from '../constants/roles';
import type { ILead } from '../models/lead.model';
import type { ITask } from '../models/task.model';
import type { IActivity } from '../models/activity.model';

export type LeadFilter = FilterQuery<ILead>;

const toObjectIdIfValid = (value?: string | mongoose.Types.ObjectId | null) => {
    if (!value) return undefined;
    if (value instanceof mongoose.Types.ObjectId) return value;
    return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : value;
};

// PERF-3: Single helper for team member ID lookup — prevents duplicate User.find
// queries when multiple filter builders are called on the same request.
const getTeamMemberIds = async (teamId: mongoose.Types.ObjectId | string) => {
    const members = await User.find({ teamId }).select('_id');
    return members.map((m) => m._id);
};

export const buildTaskOwnerFilter = async (req: AuthRequest): Promise<FilterQuery<ITask>> => {
    const base: FilterQuery<ITask> = {};
    // Enforce tenant isolation
    if (req.tenantId) (base as Record<string, unknown>).tenantId = toObjectIdIfValid(req.tenantId);

    const canViewTeam = req.user!.role === Roles.ADMIN || req.user!.role === Roles.MANAGER;
    const requestedScope = (req.query.ownerScope as string) || 'me';
    const scope = canViewTeam ? requestedScope : 'me';

    if (scope === 'all' && canViewTeam) return base;

    if (scope === 'team' && req.user!.teamId) {
        const memberIds = await getTeamMemberIds(req.user!.teamId as mongoose.Types.ObjectId);
        return { ...base, assignedTo: { $in: memberIds } };
    }

    return { ...base, assignedTo: req.user!._id };
};

export const buildActivityOwnerFilter = async (req: AuthRequest): Promise<FilterQuery<IActivity>> => {
    const base: FilterQuery<IActivity> = {};
    // Enforce tenant isolation
    if (req.tenantId) (base as Record<string, unknown>).tenantId = toObjectIdIfValid(req.tenantId);

    const canViewTeam = req.user!.role === Roles.ADMIN || req.user!.role === Roles.MANAGER;
    const requestedScope = (req.query.ownerScope as string) || 'me';
    const scope = canViewTeam ? requestedScope : 'me';

    if (scope === 'all' && canViewTeam) return base;

    if (scope === 'team' && req.user!.teamId) {
        const memberIds = await getTeamMemberIds(req.user!.teamId as mongoose.Types.ObjectId);
        return { ...base, createdBy: { $in: memberIds } };
    }

    return { ...base, createdBy: req.user!._id };
};

export const buildCompanyOwnerFilter = async (req: AuthRequest): Promise<Record<string, unknown>> => {
    const base: Record<string, unknown> = {};
    // Enforce tenant isolation
    if (req.tenantId) base.tenantId = toObjectIdIfValid(req.tenantId);

    const canViewTeam = req.user!.role === Roles.ADMIN || req.user!.role === Roles.MANAGER;
    const requestedScope = (req.query.ownerScope as string) || 'me';
    const scope = canViewTeam ? requestedScope : 'me';

    if (scope === 'all' && canViewTeam) return base;

    if (scope === 'team' && req.user!.teamId) {
        const memberIds = await getTeamMemberIds(req.user!.teamId as mongoose.Types.ObjectId);
        return { ...base, createdBy: { $in: memberIds } };
    }

    return { ...base, createdBy: req.user!._id };
};

export const applyOrFilter = (filter: LeadFilter, orClause: LeadFilter[]): LeadFilter => {
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
