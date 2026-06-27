import { Response } from 'express';
import mongoose, { type FilterQuery } from 'mongoose';
import Lead from '../models/lead.model';
import Company from '../models/company.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { buildLeadFilters, DEFAULT_PROBABILITY_MAP, parseDateRange } from '../utils/reporting.utils';
import { buildCompanyOwnerFilter } from '../utils/ownerFilters';
import { toCsv, toExcelXml, toPdfBuffer } from '../utils/export.utils';
import LeadStageHistory from '../models/lead-stage-history.model';
import Task from '../models/task.model';
import Activity, { IActivity } from '../models/activity.model';
import type { ITask } from '../models/task.model';
import { applyOrFilter, buildActivityOwnerFilter, buildTaskOwnerFilter } from '../utils/ownerFilters';

interface CompanyReportQuery {
    status?: string;
    industry?: string;
    companySize?: string;
    startDate?: string;
    endDate?: string;
}

interface LeadSourceAggregateRow {
    _id?: string | null;
    leads: number;
    qualified: number;
    won: number;
}

interface LeadStatusAggregateRow {
    _id?: string | null;
    count: number;
    value: number;
}

interface DuplicateLeadAggregateRow {
    _id: string | null;
    count: number;
    leadIds: Array<{ toString(): string }>;
}

interface WeightedPipelineResult {
    weightedValue: number;
}

interface TaskStatusAggregateRow {
    _id?: string | null;
    count: number;
}

interface ActivityAggregateRow {
    _id?: {
        owner?: string | null;
        type?: string | null;
    } | null;
    count: number;
}

const OPEN_STATUSES = ['New', 'Contacted', 'Qualified', 'Needs Analysis', 'Proposal Sent', 'Negotiation', 'Nurture'];

export const sendReportExport = async (
    res: Response,
    rows: Record<string, unknown>[],
    format: string,
    filename: string
) => {
    if (format === 'xlsx') {
        const xml = toExcelXml(rows, 'Report');
        res.setHeader('Content-Type', 'application/vnd.ms-excel');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xls"`);
        res.send(xml);
        return;
    }

    if (format === 'pdf') {
        const pdfBuffer = await toPdfBuffer(rows, filename);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        res.send(pdfBuffer);
        return;
    }

    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(csv);
};

export const formatReportUserName = (user?: { firstName?: string; lastName?: string }) => {
    if (!user) return '';
    const first = user.firstName || '';
    const last = user.lastName || '';
    return `${first} ${last}`.trim();
};

// PERF-1: Return ObjectId[] directly — avoids O(n) string conversion and
// is more efficient in MongoDB $in queries (native BSON type).
export const getScopedLeadIds = async (req: AuthRequest): Promise<mongoose.Types.ObjectId[]> => {
    const scopedLeads = await Lead.find(buildLeadFilters(req)).select('_id').lean();
    return scopedLeads.map((lead) => lead._id as mongoose.Types.ObjectId);
};

export const buildOpenLeadMatch = (filter: FilterQuery<unknown>) => ({
    ...filter,
    status: { $in: OPEN_STATUSES }
});

export const applyCompanyReportQueryFilters = (
    filter: FilterQuery<unknown> & { createdAt?: { $gte?: Date; $lte?: Date } },
    query: CompanyReportQuery
) => {
    const { status, industry, companySize, startDate, endDate } = query;

    if (status) filter.status = status;
    if (industry) filter.industry = industry;
    if (companySize) filter.companySize = companySize;

    const createdRange = parseDateRange(startDate, endDate);
    if (createdRange) filter.createdAt = createdRange;

    return filter;
};

export const buildCompanyReportFilter = async (req: AuthRequest) => {
    const filter: FilterQuery<unknown> & { createdAt?: { $gte?: Date; $lte?: Date } } =
        await buildCompanyOwnerFilter(req);

    return applyCompanyReportQueryFilters(filter, {
        status: req.query.status as string | undefined,
        industry: req.query.industry as string | undefined,
        companySize: req.query.companySize as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
    });
};

export const getCompanyRegisterRows = async (
    filter: FilterQuery<unknown> & { createdAt?: { $gte?: Date; $lte?: Date } }
) => {
    // PERF-2: .lean() avoids Mongoose Document hydration; .select() limits fields fetched
    const companies = await Company.find(filter)
        .select('name email phone industry companySize status createdAt')
        .lean();
    return companies.map((company) => ({
        name: company.name,
        email: (company.email as string | undefined) || '',
        phone: (company.phone as string | undefined) || '',
        industry: (company.industry as string | undefined) || '',
        companySize: (company.companySize as string | undefined) || '',
        status: (company.status as string | undefined) || '',
        createdAt: (company.createdAt as Date | undefined)?.toISOString()
    }));
};

export const getLeadSourceRows = async (filter: FilterQuery<unknown>) => {
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

    return mapLeadSourceRows(results);
};

export const getLeadStatusRows = async (filter: FilterQuery<unknown>) => {
    const results = await Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: { $ifNull: ['$dealValue', 0] } } } }
    ]);

    return mapLeadStatusRows(results);
};

export const getDuplicateLeadRows = async (filter: FilterQuery<unknown>) => {
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

    return mapDuplicateLeadRows(duplicates);
};

export const getPipelineValueRows = async (filter: FilterQuery<unknown>) => Lead.aggregate([
    { $match: buildOpenLeadMatch(filter) },
    { $group: { _id: '$status', value: { $sum: { $ifNull: ['$dealValue', 0] } } } }
]);

export const normalizeWeightedPipelineResult = (
    results: Array<WeightedPipelineResult & { _id?: null }>
) => results[0] || { weightedValue: 0 };

export const getWeightedPipelineResult = async (filter: FilterQuery<unknown>) => {
    const results = await Lead.aggregate([
        { $match: buildOpenLeadMatch(filter) },
        {
            $addFields: {
                probabilityValue: {
                    $ifNull: [
                        '$probability',
                        {
                            $switch: {
                                branches: Object.entries(DEFAULT_PROBABILITY_MAP).map(([status, value]) => ({
                                    case: { $eq: ['$status', status] },
                                    then: value
                                })),
                                default: 0
                            }
                        }
                    ]
                },
                dealValueSafe: { $ifNull: ['$dealValue', 0] }
            }
        },
        {
            $group: {
                _id: null,
                weightedValue: {
                    $sum: {
                        $multiply: ['$dealValueSafe', { $divide: ['$probabilityValue', 100] }]
                    }
                }
            }
        }
    ]);

    return normalizeWeightedPipelineResult(results as Array<WeightedPipelineResult & { _id?: null }>);
};

export const getWonDealRows = async (filter: FilterQuery<unknown>) => {
    // PERF-2: .lean() + .select() — 5-10× memory reduction on large exports
    const leads = await Lead.find({ ...filter, status: 'Won' })
        .select('firstName lastName dealValue closedAt assignedTo')
        .populate('assignedTo', 'firstName lastName')
        .lean();
    return leads.map((lead) => ({
        leadName: `${lead.firstName} ${lead.lastName}`,
        dealValue: lead.dealValue || 0,
        closedAt: (lead.closedAt as Date | undefined)?.toISOString() || '',
        owner: formatReportUserName(lead.assignedTo as { firstName?: string; lastName?: string } | undefined)
    }));
};

export const getLostDealRows = async (filter: FilterQuery<unknown>) => {
    // PERF-2: .lean() + .select() — 5-10× memory reduction on large exports
    const leads = await Lead.find({ ...filter, status: 'Lost' })
        .select('firstName lastName lostReason dealValue assignedTo')
        .populate('assignedTo', 'firstName lastName')
        .lean();
    return leads.map((lead) => ({
        leadName: `${lead.firstName} ${lead.lastName}`,
        lostReason: lead.lostReason || '',
        dealValue: lead.dealValue || 0,
        owner: formatReportUserName(lead.assignedTo as { firstName?: string; lastName?: string } | undefined)
    }));
};

export const getConversionRows = async (req: AuthRequest) => {
    const historyRange = parseDateRange(req.query.startDate as string, req.query.endDate as string);
    const scopedLeadIds = await getScopedLeadIds(req);

    return LeadStageHistory.aggregate([
        {
            $match: {
                ...(historyRange ? { changedAt: historyRange } : {}),
                leadId: { $in: scopedLeadIds }
            }
        },
        { $group: { _id: { from: '$fromStatus', to: '$toStatus' }, count: { $sum: 1 } } }
    ]);
};

export const getDealCycleSummary = async (filter: FilterQuery<unknown>) => {
    const results = await Lead.aggregate([
        { $match: { ...filter, status: 'Won', closedAt: { $ne: null } } },
        { $project: { cycleMs: { $subtract: ['$closedAt', '$createdAt'] } } },
        { $group: { _id: null, avgDays: { $avg: { $divide: ['$cycleMs', 1000 * 60 * 60 * 24] } } } }
    ]);

    return results[0] || { avgDays: 0 };
};

export const getSalesRepPerformanceRows = async (filter: FilterQuery<unknown>) => Lead.aggregate([
    { $match: filter },
    {
        $group: {
            _id: '$assignedTo',
            leadsAssigned: { $sum: 1 },
            won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
            lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
            pipelineValue: {
                $sum: {
                    $cond: [{ $in: ['$status', OPEN_STATUSES] }, { $ifNull: ['$dealValue', 0] }, 0]
                }
            }
        }
    }
]);

export const getWorkloadRows = async (filter: FilterQuery<unknown>) => Lead.aggregate([
    { $match: filter },
    { $group: { _id: '$assignedTo', leadCount: { $sum: 1 } } },
    { $sort: { leadCount: -1 } }
]);

export const mapLeadSourceRows = (results: LeadSourceAggregateRow[]) => results.map((row) => ({
    source: row._id || 'Unknown',
    leads: row.leads,
    qualified: row.qualified,
    won: row.won,
    conversionRate: row.leads ? row.won / row.leads : 0
}));

export const mapLeadStatusRows = (results: LeadStatusAggregateRow[]) => results.map((row) => ({
    status: row._id,
    count: row.count,
    value: row.value
}));

export const mapDuplicateLeadRows = (duplicates: DuplicateLeadAggregateRow[]) => duplicates.map((dup) => ({
    email: dup._id,
    count: dup.count,
    leadIds: dup.leadIds.map((id) => id.toString()).join(',')
}));

export const mapCompanyAggregateRows = (results: Array<{ _id?: string | null; count: number }>, key: string) =>
    results.map((row) => ({
        [key]: row._id || 'Unknown',
        count: row.count
    }));

export const getCompanyIndustryRows = async (
    filter: FilterQuery<unknown> & { createdAt?: { $gte?: Date; $lte?: Date } }
) => {
    const results = await Company.aggregate([
        { $match: filter },
        { $group: { _id: '$industry', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    return mapCompanyAggregateRows(results, 'industry');
};

export const getCompanyStatusRows = async (
    filter: FilterQuery<unknown> & { createdAt?: { $gte?: Date; $lte?: Date } }
) => {
    const results = await Company.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    return mapCompanyAggregateRows(results, 'status');
};

export const getLeadRegisterExportRows = async (filter: FilterQuery<unknown>) => {
    // PERF-2: .lean() + .select() — 5-10× memory reduction on large exports
    const leads = await Lead.find(filter)
        .select('leadNumber firstName lastName email phone status source priority dealValue assignedTo')
        .populate('assignedTo', 'firstName lastName email')
        .lean();
    return leads.map((lead) => ({
        leadNumber: lead.leadNumber,
        name: `${lead.firstName} ${lead.lastName}`.trim(),
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        source: lead.source,
        priority: lead.priority,
        dealValue: lead.dealValue || 0,
        assignedTo: formatReportUserName(lead.assignedTo as { firstName?: string; lastName?: string } | undefined),
    }));
};

export const getFollowupDueVsCompletedRows = async (req: AuthRequest) => {
    const dateRange = parseDateRange(req.query.startDate as string, req.query.endDate as string);
    const match: FilterQuery<ITask> & { dueDate?: { $gte?: Date; $lte?: Date } } = await buildTaskOwnerFilter(req);
    if (dateRange) match.dueDate = dateRange;

    const results = await Task.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return mapTaskStatusRows(results as TaskStatusAggregateRow[]);
};

export const getOverdueFollowupRows = async (req: AuthRequest) => {
    const now = new Date();
    const tasks = await Task.find({
        ...(await buildTaskOwnerFilter(req)),
        dueDate: { $lt: now },
        status: { $ne: 'Completed' },
    }).populate('assignedTo', 'firstName lastName email');

    return tasks.map((task) => ({
        title: task.title,
        dueDate: task.dueDate?.toISOString(),
        status: task.status,
        assignedTo: formatReportUserName(task.assignedTo as { firstName?: string; lastName?: string } | undefined),
    }));
};

export const getActivityRows = async (req: AuthRequest) => {
    const dateRange = parseDateRange(req.query.startDate as string, req.query.endDate as string);
    const match: FilterQuery<IActivity> & { activityDate?: { $gte?: Date; $lte?: Date } } = await buildActivityOwnerFilter(req);
    if (dateRange) match.activityDate = dateRange;

    const results = await Activity.aggregate([
        { $match: match },
        { $group: { _id: { owner: '$createdBy', type: '$activityType' }, count: { $sum: 1 } } },
    ]);

    return mapActivityAggregateRows(results as ActivityAggregateRow[]);
};

export const getNoActivityLeadRows = async (req: AuthRequest) => {
    const { days = '14' } = req.query as { days?: string };
    const threshold = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    const baseFilter = buildLeadFilters(req);
    const filter = applyOrFilter(baseFilter, [{ lastActivityAt: { $lt: threshold } }, { lastActivityAt: null }]);
    const leads = await Lead.find(filter).select('firstName lastName lastActivityAt status');

    return leads.map((lead) => ({
        leadName: `${lead.firstName} ${lead.lastName}`.trim(),
        status: lead.status,
        lastActivityAt: lead.lastActivityAt?.toISOString() || '',
    }));
};

export const mapTaskStatusRows = (results: TaskStatusAggregateRow[]) =>
    results.map((row) => ({
        status: row._id || 'Unknown',
        count: row.count,
    }));

export const mapActivityAggregateRows = (results: ActivityAggregateRow[]) =>
    results.map((row) => ({
        owner: row._id?.owner || 'Unknown',
        activityType: row._id?.type || 'Unknown',
        count: row.count,
    }));
