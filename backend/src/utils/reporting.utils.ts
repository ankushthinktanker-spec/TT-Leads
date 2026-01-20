import { AuthRequest } from '../middleware/auth.middleware';
import type { FilterQuery } from 'mongoose';
import type { ILead } from '../models/lead.model';

export const DEFAULT_PROBABILITY_MAP: Record<string, number> = {
    New: 10,
    Contacted: 20,
    Qualified: 40,
    'Needs Analysis': 50,
    'Proposal Sent': 60,
    Negotiation: 75,
    Won: 100,
    Lost: 0,
    Nurture: 15
};

export const parseDateRange = (startDate?: string, endDate?: string): { $gte?: Date; $lte?: Date } | undefined => {
    if (!startDate && !endDate) return undefined;
    const range: { $gte?: Date; $lte?: Date } = {};
    if (startDate) range.$gte = new Date(startDate);
    if (endDate) range.$lte = new Date(endDate);
    return range;
};

const resolveOwnerScope = (
    req: AuthRequest,
    field: string,
    ownerIdParam?: string
) => {
    const user = req.user;
    if (!user) {
        return {};
    }
    const canViewTeam = user.role === 'Admin' || user.role === 'Manager';
    const requestedScope = (req.query.ownerScope as string) || 'me';
    const scope = canViewTeam ? requestedScope : 'me';

    if (ownerIdParam) {
        if (canViewTeam || ownerIdParam.toString() === user._id.toString()) {
            return { [field]: ownerIdParam };
        }
        return { [field]: user._id };
    }

    if (scope === 'team') {
        return user.teamId ? { teamId: user.teamId } : {};
    }

    if (scope === 'all') {
        return canViewTeam ? {} : { [field]: user._id };
    }

    return { [field]: user._id };
};

export const buildLeadFilters = (req: AuthRequest): FilterQuery<ILead> => {
    const filter: FilterQuery<ILead> = {};

    Object.assign(filter, resolveOwnerScope(req, 'assignedTo', req.query.ownerId as string));

    const status = req.query.status || req.query.stage;
    if (status) filter.status = status;
    if (req.query.source) filter.source = req.query.source;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.industry) filter.industry = req.query.industry;

    if (req.query.location) {
        filter.$or = [
            { 'location.city': new RegExp(req.query.location as string, 'i') },
            { 'location.state': new RegExp(req.query.location as string, 'i') },
            { 'location.country': new RegExp(req.query.location as string, 'i') }
        ];
    }

    if (req.query.serviceType) {
        filter.serviceInterest = req.query.serviceType;
    }

    const createdAtRange = parseDateRange(req.query.startDate as string, req.query.endDate as string);
    if (createdAtRange) filter.createdAt = createdAtRange;

    return filter;
};
