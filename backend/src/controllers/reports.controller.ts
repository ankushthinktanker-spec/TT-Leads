import { Response, NextFunction } from 'express';
import Lead, { ILead } from '../models/lead.model';
import Activity, { IActivity } from '../models/activity.model';
import Task, { ITask } from '../models/task.model';
import User from '../models/user.model';
import LeadStageHistory from '../models/lead-stage-history.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { buildLeadFilters, DEFAULT_PROBABILITY_MAP, parseDateRange } from '../utils/reporting.utils';
import { toCsv, toExcelXml } from '../utils/export.utils';
import type { FilterQuery } from 'mongoose';

const OPEN_STATUSES = ['New', 'Contacted', 'Qualified', 'Needs Analysis', 'Proposal Sent', 'Negotiation', 'Nurture'];

const buildTaskOwnerFilter = async (req: AuthRequest): Promise<FilterQuery<ITask>> => {
    const canViewTeam = req.user!.role === 'Admin' || req.user!.role === 'Manager';
    const requestedScope = (req.query.ownerScope as string) || 'me';
    const scope = canViewTeam ? requestedScope : 'me';

    if (scope === 'all' && canViewTeam) return {};

    if (scope === 'team' && req.user!.teamId) {
        const teamMembers = await User.find({ teamId: req.user!.teamId }).select('_id');
        return { assignedTo: { $in: teamMembers.map((m) => m._id) } };
    }

    return { assignedTo: req.user!._id };
};

const buildActivityOwnerFilter = async (req: AuthRequest): Promise<FilterQuery<IActivity>> => {
    const canViewTeam = req.user!.role === 'Admin' || req.user!.role === 'Manager';
    const requestedScope = (req.query.ownerScope as string) || 'me';
    const scope = canViewTeam ? requestedScope : 'me';

    if (scope === 'all' && canViewTeam) return {};

    if (scope === 'team' && req.user!.teamId) {
        const teamMembers = await User.find({ teamId: req.user!.teamId }).select('_id');
        return { createdBy: { $in: teamMembers.map((m) => m._id) } };
    }

    return { createdBy: req.user!._id };
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

const sendExport = (res: Response, rows: Record<string, unknown>[], format: string, filename: string) => {
    if (format === 'xlsx') {
        const xml = toExcelXml(rows, 'Report');
        res.setHeader('Content-Type', 'application/vnd.ms-excel');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xls"`);
        res.send(xml);
        return;
    }
    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(csv);
};

const formatUserName = (user?: { firstName?: string; lastName?: string }) => {
    if (!user) return '';
    const first = user.firstName || '';
    const last = user.lastName || '';
    return `${first} ${last}`.trim();
};


// Lead Register Report
export const leadRegisterReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = buildLeadFilters(req);
        const { page = '1', limit = '20', format } = req.query as { page?: string; limit?: string; format?: string };

        if (format) {
            const leads = await Lead.find(filter).populate('assignedTo', 'firstName lastName email');
            const rows = leads.map((lead) => ({
                leadNumber: lead.leadNumber,
                name: `${lead.firstName} ${lead.lastName}`,
                email: lead.email,
                phone: lead.phone,
                status: lead.status,
                source: lead.source,
                priority: lead.priority,
                dealValue: lead.dealValue || 0,
                assignedTo: formatUserName(lead.assignedTo as { firstName?: string; lastName?: string } | undefined)
            }));
            return sendExport(res, rows, format, 'lead-register');
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [paged, total] = await Promise.all([
            Lead.find(filter)
                .populate('assignedTo', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Lead.countDocuments(filter)
        ]);
        res.status(200).json({
            success: true,
            data: {
                leads: paged,
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

// Lead Source Report
export const leadSourceReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = buildLeadFilters(req);
        const { format } = req.query as { format?: string };
        const results = await Lead.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$source',
                    leads: { $sum: 1 },
                    qualified: { $sum: { $cond: [{ $eq: ['$status', 'Qualified'] }, 1, 0] } },
                    won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } }
                }
            },
            { $sort: { leads: -1 } }
        ]);

        const rows = results.map((row) => ({
            source: row._id || 'Unknown',
            leads: row.leads,
            qualified: row.qualified,
            won: row.won,
            conversionRate: row.leads ? row.won / row.leads : 0
        }));

        if (format) return sendExport(res, rows, format, 'lead-source');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Lead Status/Stage Report
export const leadStatusReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = buildLeadFilters(req);
        const { format } = req.query as { format?: string };
        const results = await Lead.aggregate([
            { $match: filter },
            { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: { $ifNull: ['$dealValue', 0] } } } }
        ]);

        const rows = results.map((row) => ({
            status: row._id,
            count: row.count,
            value: row.value
        }));

        if (format) return sendExport(res, rows, format, 'lead-status');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Lead Aging Report
export const leadAgingReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = buildLeadFilters(req);
        const { format, stuckDays = '14' } = req.query as { format?: string; stuckDays?: string };
        const leads = await Lead.find(filter).select('status createdAt firstName lastName');
        const history = await LeadStageHistory.aggregate([
            { $sort: { changedAt: -1 } },
            { $group: { _id: '$leadId', lastChangeAt: { $first: '$changedAt' } } }
        ]);

        const historyMap = new Map(history.map((entry) => [entry._id.toString(), entry.lastChangeAt]));
        const now = Date.now();

        const rows = leads.map((lead) => {
            const lastChange = historyMap.get(lead._id.toString()) || lead.createdAt;
            const daysInStage = Math.floor((now - new Date(lastChange).getTime()) / (1000 * 60 * 60 * 24));
            return {
                leadId: lead._id.toString(),
                leadName: `${lead.firstName} ${lead.lastName}`,
                status: lead.status,
                daysInStage
            };
        });

        const stuck = rows.filter((row) => row.daysInStage >= Number(stuckDays));
        if (format) return sendExport(res, rows, format, 'lead-aging');
        res.status(200).json({ success: true, data: { rows, stuck } });
    } catch (error) {
        next(error);
    }
};

// Lead Response Time Report
export const leadResponseTimeReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = buildLeadFilters(req);
        const { format, slaHours = '24' } = req.query as { format?: string; slaHours?: string };
        const leads = await Lead.find(filter)
            .select('firstName lastName createdAt firstResponseAt status');

        const rows = leads.map((lead) => {
            const diffMs = lead.firstResponseAt ? lead.firstResponseAt.getTime() - lead.createdAt.getTime() : null;
            const hours = diffMs ? diffMs / (1000 * 60 * 60) : null;
            return {
                leadName: `${lead.firstName} ${lead.lastName}`,
                status: lead.status,
                responseHours: hours !== null ? Number(hours.toFixed(2)) : null,
                slaBreached: hours === null
                    ? lead.createdAt.getTime() <= Date.now() - Number(slaHours) * 60 * 60 * 1000
                    : hours > Number(slaHours)
            };
        });

        if (format) return sendExport(res, rows, format, 'lead-response-time');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Duplicate Leads Report
export const duplicateLeadsReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = buildLeadFilters(req);
        const { format } = req.query as { format?: string };
        const duplicates = await Lead.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$email',
                    count: { $sum: 1 },
                    leadIds: { $push: '$_id' }
                }
            },
            { $match: { _id: { $ne: null }, count: { $gt: 1 } } }
        ]);

        const rows = duplicates.map((dup) => ({
            email: dup._id,
            count: dup.count,
            leadIds: dup.leadIds.map((id: { toString(): string }) => id.toString()).join(',')
        }));

        if (format) return sendExport(res, rows, format, 'duplicate-leads');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Follow-up Due vs Completed
export const followupDueVsCompletedReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const dateRange = parseDateRange(req.query.startDate as string, req.query.endDate as string);
        const match: FilterQuery<ITask> & { dueDate?: { $gte?: Date; $lte?: Date } } = await buildTaskOwnerFilter(req);
        if (dateRange) match.dueDate = dateRange;
        const results = await Task.aggregate([
            { $match: match },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        next(error);
    }
};

// Overdue Follow-ups
export const overdueFollowupsReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { format } = req.query as { format?: string };
        const now = new Date();
        const tasks = await Task.find({
            ...(await buildTaskOwnerFilter(req)),
            dueDate: { $lt: now },
            status: { $ne: 'Completed' }
        })
            .populate('assignedTo', 'firstName lastName email');

        const rows = tasks.map((task) => ({
            title: task.title,
            dueDate: task.dueDate?.toISOString(),
            status: task.status,
            assignedTo: formatUserName(task.assignedTo as { firstName?: string; lastName?: string } | undefined)
        }));

        if (format) return sendExport(res, rows, format, 'overdue-followups');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Activity Report
export const activityReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const dateRange = parseDateRange(req.query.startDate as string, req.query.endDate as string);
        const match: FilterQuery<IActivity> & { activityDate?: { $gte?: Date; $lte?: Date } } = await buildActivityOwnerFilter(req);
        if (dateRange) match.activityDate = dateRange;
        const results = await Activity.aggregate([
            { $match: match },
            { $group: { _id: { owner: '$createdBy', type: '$activityType' }, count: { $sum: 1 } } }
        ]);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        next(error);
    }
};

// No-Activity Leads Report
export const noActivityLeadsReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { days = '14' } = req.query as { days?: string };
        const threshold = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
        const baseFilter = buildLeadFilters(req);
        const filter = applyOrFilter(baseFilter, [{ lastActivityAt: { $lt: threshold } }, { lastActivityAt: null }]);
        const leads = await Lead.find(filter).select('firstName lastName lastActivityAt status');
        res.status(200).json({ success: true, data: leads });
    } catch (error) {
        next(error);
    }
};

// Pipeline Value Report
export const pipelineValueReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = buildLeadFilters(req);
        const results = await Lead.aggregate([
            { $match: { ...filter, status: { $in: OPEN_STATUSES } } },
            { $group: { _id: '$status', value: { $sum: { $ifNull: ['$dealValue', 0] } } } }
        ]);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        next(error);
    }
};

// Weighted Pipeline Forecast Report
export const weightedPipelineReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = buildLeadFilters(req);
        const results = await Lead.aggregate([
            { $match: { ...filter, status: { $in: OPEN_STATUSES } } },
            {
                $addFields: {
                    probabilityValue: { $ifNull: ['$probability', { $switch: { branches: Object.entries(DEFAULT_PROBABILITY_MAP).map(([status, value]) => ({ case: { $eq: ['$status', status] }, then: value })), default: 0 } }] },
                    dealValueSafe: { $ifNull: ['$dealValue', 0] }
                }
            },
            { $group: { _id: null, weightedValue: { $sum: { $multiply: ['$dealValueSafe', { $divide: ['$probabilityValue', 100] }] } } } }
        ]);
        res.status(200).json({ success: true, data: results[0] || { weightedValue: 0 } });
    } catch (error) {
        next(error);
    }
};

// Won Deals Report
export const wonDealsReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = buildLeadFilters(req);
        const { format } = req.query as { format?: string };
        const leads = await Lead.find({ ...filter, status: 'Won' }).populate('assignedTo', 'firstName lastName');
        const rows = leads.map((lead) => ({
            leadName: `${lead.firstName} ${lead.lastName}`,
            dealValue: lead.dealValue || 0,
            closedAt: lead.closedAt?.toISOString() || '',
            owner: formatUserName(lead.assignedTo as { firstName?: string; lastName?: string } | undefined)
        }));
        if (format) return sendExport(res, rows, format, 'won-deals');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Lost Deals Report
export const lostDealsReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = buildLeadFilters(req);
        const { format } = req.query as { format?: string };
        const leads = await Lead.find({ ...filter, status: 'Lost' }).populate('assignedTo', 'firstName lastName');
        const rows = leads.map((lead) => ({
            leadName: `${lead.firstName} ${lead.lastName}`,
            lostReason: lead.lostReason || '',
            dealValue: lead.dealValue || 0,
            owner: formatUserName(lead.assignedTo as { firstName?: string; lastName?: string } | undefined)
        }));
        if (format) return sendExport(res, rows, format, 'lost-deals');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Conversion Report
export const conversionReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const historyRange = parseDateRange(req.query.startDate as string, req.query.endDate as string);
        const transitions = await LeadStageHistory.aggregate([
            { $match: historyRange ? { changedAt: historyRange } : {} },
            { $group: { _id: { from: '$fromStatus', to: '$toStatus' }, count: { $sum: 1 } } }
        ]);
        res.status(200).json({ success: true, data: transitions });
    } catch (error) {
        next(error);
    }
};

// Deal Cycle Time Report
export const dealCycleTimeReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = buildLeadFilters(req);
        const results = await Lead.aggregate([
            { $match: { ...filter, status: 'Won', closedAt: { $ne: null } } },
            { $project: { cycleMs: { $subtract: ['$closedAt', '$createdAt'] } } },
            { $group: { _id: null, avgDays: { $avg: { $divide: ['$cycleMs', 1000 * 60 * 60 * 24] } } } }
        ]);
        res.status(200).json({ success: true, data: results[0] || { avgDays: 0 } });
    } catch (error) {
        next(error);
    }
};

// Sales Rep Performance Report
export const salesRepPerformanceReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = buildLeadFilters(req);
        const results = await Lead.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$assignedTo',
                    leadsAssigned: { $sum: 1 },
                    won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
                    lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
                    pipelineValue: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, { $ifNull: ['$dealValue', 0] }, 0] } }
                }
            }
        ]);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        next(error);
    }
};

// Workload Report
export const workloadReport = async (_req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
        const results = await Lead.aggregate([
            { $group: { _id: '$assignedTo', leadCount: { $sum: 1 } } },
            { $sort: { leadCount: -1 } }
        ]);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        _next(error);
    }
};

// Finance Reports (Optional)
export const paymentCollectionReport = async (_req: AuthRequest, res: Response): Promise<void> => {
    res.status(200).json({ success: true, data: [], message: 'No payment module detected' });
};

export const proposalToPaymentReport = async (_req: AuthRequest, res: Response): Promise<void> => {
    res.status(200).json({ success: true, data: [], message: 'No payment module detected' });
};
