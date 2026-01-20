import { Response, NextFunction } from 'express';
import Lead, { ILead } from '../models/lead.model';
import Activity from '../models/activity.model';
import Task from '../models/task.model';
import User from '../models/user.model';
import LeadStageHistory from '../models/lead-stage-history.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { buildLeadFilters, DEFAULT_PROBABILITY_MAP, parseDateRange } from '../utils/reporting.utils';
import type { FilterQuery } from 'mongoose';

const OPEN_STATUSES = ['New', 'Contacted', 'Qualified', 'Needs Analysis', 'Proposal Sent', 'Negotiation', 'Nurture'];

const getProbabilityExpression = () => ({
    $switch: {
        branches: Object.entries(DEFAULT_PROBABILITY_MAP).map(([status, probability]) => ({
            case: { $eq: ['$status', status] },
            then: probability
        })),
        default: 0
    }
});

const buildTaskOwnerFilter = async (req: AuthRequest) => {
    const canViewTeam = req.user!.role === 'Admin' || req.user!.role === 'Manager';
    const requestedScope = (req.query.ownerScope as string) || 'me';
    const scope = canViewTeam ? requestedScope : 'me';

    if (scope === 'all' && canViewTeam) {
        return {};
    }

    if (scope === 'team' && req.user!.teamId) {
        const teamMembers = await User.find({ teamId: req.user!.teamId }).select('_id');
        return { assignedTo: { $in: teamMembers.map((m) => m._id) } };
    }

    return { assignedTo: req.user!._id };
};

const buildActivityOwnerFilter = async (req: AuthRequest) => {
    const canViewTeam = req.user!.role === 'Admin' || req.user!.role === 'Manager';
    const requestedScope = (req.query.ownerScope as string) || 'me';
    const scope = canViewTeam ? requestedScope : 'me';

    if (scope === 'all' && canViewTeam) {
        return {};
    }

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

const getDayRange = (date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

type LeadOwner = { _id: string; firstName: string; lastName: string; email?: string };
type LeadSnapshot = {
    _id: string;
    name: string;
    company?: string;
    status?: string;
    nextFollowUpDate?: Date;
    followUpType?: string;
    owner: LeadOwner | null;
};

const buildFollowUpSnapshot = async (leadFilter: LeadFilter) => {
    const todayRange = getDayRange(new Date());
    const upcomingEnd = new Date(todayRange.end);
    upcomingEnd.setDate(upcomingEnd.getDate() + 7);

    const baseFilter = { ...leadFilter };
    const [overdue, today, upcoming] = await Promise.all([
        Lead.find({ ...baseFilter, nextFollowUpDate: { $lt: todayRange.start } })
            .select('firstName lastName company status nextFollowUpDate followUpType assignedTo ownerId')
            .populate('assignedTo', 'firstName lastName email')
            .populate('ownerId', 'firstName lastName email')
            .sort({ nextFollowUpDate: 1 })
            .limit(20),
        Lead.find({ ...baseFilter, nextFollowUpDate: { $gte: todayRange.start, $lte: todayRange.end } })
            .select('firstName lastName company status nextFollowUpDate followUpType assignedTo ownerId')
            .populate('assignedTo', 'firstName lastName email')
            .populate('ownerId', 'firstName lastName email')
            .sort({ nextFollowUpDate: 1 })
            .limit(20),
        Lead.find({ ...baseFilter, nextFollowUpDate: { $gt: todayRange.end, $lte: upcomingEnd } })
            .select('firstName lastName company status nextFollowUpDate followUpType assignedTo ownerId')
            .populate('assignedTo', 'firstName lastName email')
            .populate('ownerId', 'firstName lastName email')
            .sort({ nextFollowUpDate: 1 })
            .limit(20)
    ]);

    const mapLead = (lead: { toObject: () => Record<string, unknown> }): LeadSnapshot => {
        const data = lead.toObject() as {
            _id: string;
            firstName: string;
            lastName: string;
            company?: string;
            status?: string;
            nextFollowUpDate?: Date;
            followUpType?: string;
            ownerId?: LeadOwner;
            assignedTo?: LeadOwner;
        };
        const owner = data.ownerId || data.assignedTo || null;
        return {
            _id: data._id,
            name: `${data.firstName} ${data.lastName}`.trim(),
            company: data.company,
            status: data.status,
            nextFollowUpDate: data.nextFollowUpDate,
            followUpType: data.followUpType,
            owner: owner
                ? {
                    _id: owner._id,
                    firstName: owner.firstName,
                    lastName: owner.lastName,
                    email: owner.email
                }
                : null
        };
    };

    return {
        overdue: overdue.map(mapLead),
        today: today.map(mapLead),
        upcoming: upcoming.map(mapLead)
    };
};

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
export const getDashboard = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const leadFilter = buildLeadFilters(req);

        const openStatusFilter = leadFilter.status ? leadFilter.status : { $in: OPEN_STATUSES };
        const [totalLeads, newLeads, openLeads, qualifiedLeads, wonDeals, lostDeals] = await Promise.all([
            Lead.countDocuments(leadFilter),
            Lead.countDocuments({ ...leadFilter, status: 'New' }),
            Lead.countDocuments({ ...leadFilter, status: openStatusFilter }),
            Lead.countDocuments({ ...leadFilter, status: 'Qualified' }),
            Lead.aggregate([
                { $match: { ...leadFilter, status: 'Won' } },
                { $group: { _id: null, count: { $sum: 1 }, value: { $sum: { $ifNull: ['$dealValue', 0] } } } }
            ]),
            Lead.aggregate([
                { $match: { ...leadFilter, status: 'Lost' } },
                { $group: { _id: null, count: { $sum: 1 }, value: { $sum: { $ifNull: ['$dealValue', 0] } } } }
            ])
        ]);

        const [pipelineTotals] = await Lead.aggregate([
            { $match: { ...leadFilter, status: openStatusFilter } },
            {
                $addFields: {
                    probabilityValue: {
                        $ifNull: ['$probability', getProbabilityExpression()]
                    },
                    dealValueSafe: { $ifNull: ['$dealValue', 0] }
                }
            },
            {
                $group: {
                    _id: null,
                    pipelineValue: { $sum: '$dealValueSafe' },
                    weightedPipelineValue: {
                        $sum: {
                            $multiply: ['$dealValueSafe', { $divide: ['$probabilityValue', 100] }]
                        }
                    }
                }
            }
        ]);

        const [avgResponse] = await Lead.aggregate([
            { $match: { ...leadFilter, firstResponseAt: { $ne: null } } },
            {
                $project: {
                    responseMs: { $subtract: ['$firstResponseAt', '$createdAt'] }
                }
            },
            { $group: { _id: null, avgMs: { $avg: '$responseMs' } } }
        ]);

        const todayRange = getDayRange(new Date());
        const taskOwnerFilter = await buildTaskOwnerFilter(req);

        const tasksToday = await Task.find({
            ...taskOwnerFilter,
            dueDate: { $gte: todayRange.start, $lte: todayRange.end },
            status: { $ne: 'Completed' }
        }).sort({ dueDate: 1 });

        const followUpsDueToday = tasksToday.length;

        const pipelineByStage = await Lead.aggregate([
            { $match: leadFilter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    value: { $sum: { $ifNull: ['$dealValue', 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const historyDateRange = parseDateRange(req.query.startDate as string, req.query.endDate as string);
        const stageConversion = await LeadStageHistory.aggregate([
            { $match: historyDateRange ? { changedAt: historyDateRange } : {} },
            { $group: { _id: { from: '$fromStatus', to: '$toStatus' }, count: { $sum: 1 } } }
        ]);

        const stageConversionTotals = stageConversion.reduce<Record<string, number>>((acc, row) => {
            const from = row._id.from || 'Unknown';
            acc[from] = (acc[from] || 0) + row.count;
            return acc;
        }, {});

        const conversionRates = stageConversion.map((row) => ({
            from: row._id.from,
            to: row._id.to,
            rate: stageConversionTotals[row._id.from] ? row.count / stageConversionTotals[row._id.from] : 0
        }));

        const latestStageChanges = await LeadStageHistory.aggregate([
            { $sort: { changedAt: -1 } },
            {
                $group: {
                    _id: '$leadId',
                    lastChangeAt: { $first: '$changedAt' }
                }
            }
        ]);

        const lastChangeMap = new Map(latestStageChanges.map((entry) => [entry._id.toString(), entry.lastChangeAt]));
        const stuckDays = Number(req.query.stuckDays) || 14;

        const leadsForAging = await Lead.find(leadFilter).select('status createdAt');
        const now = Date.now();
        const stageAging: Record<string, { totalDays: number; count: number }> = {};
        const stuckLeads: Array<{ leadId: string; stage: string; daysInStage: number }> = [];

        leadsForAging.forEach((lead) => {
            const lastChange = lastChangeMap.get(lead._id.toString()) || lead.createdAt;
            const daysInStage = Math.floor((now - new Date(lastChange).getTime()) / (1000 * 60 * 60 * 24));
            const bucket = stageAging[lead.status] || { totalDays: 0, count: 0 };
            bucket.totalDays += daysInStage;
            bucket.count += 1;
            stageAging[lead.status] = bucket;

            if (daysInStage >= stuckDays) {
                stuckLeads.push({
                    leadId: lead._id.toString(),
                    stage: lead.status,
                    daysInStage
                });
            }
        });

        const stageAgingResult = Object.entries(stageAging).map(([stage, data]) => ({
            stage,
            avgDays: data.count ? data.totalDays / data.count : 0
        }));

        const overdueTasks = await Task.find({
            ...taskOwnerFilter,
            dueDate: { $lt: todayRange.start },
            status: { $ne: 'Completed' }
        }).sort({ dueDate: 1 });

        const upcomingRangeEnd = new Date(todayRange.end);
        upcomingRangeEnd.setDate(upcomingRangeEnd.getDate() + 7);
        const upcomingTasks = await Task.find({
            ...taskOwnerFilter,
            dueDate: { $gt: todayRange.end, $lte: upcomingRangeEnd },
            status: { $ne: 'Completed' }
        }).sort({ dueDate: 1 });

        const sourcePerformance = await Lead.aggregate([
            { $match: leadFilter },
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

        const teamPerformance = await Lead.aggregate([
            { $match: leadFilter },
            {
                $group: {
                    _id: '$assignedTo',
                    leadsAssigned: { $sum: 1 },
                    contacted: { $sum: { $cond: [{ $eq: ['$status', 'Contacted'] }, 1, 0] } },
                    meetings: { $sum: { $cond: [{ $eq: ['$status', 'Qualified'] }, 1, 0] } },
                    proposals: { $sum: { $cond: [{ $eq: ['$status', 'Proposal Sent'] }, 1, 0] } },
                    won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
                    lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
                    pipelineValue: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, { $ifNull: ['$dealValue', 0] }, 0] } }
                }
            }
        ]);

        const activityOwnerFilter = await buildActivityOwnerFilter(req);
        const activityCounts = await Activity.aggregate([
            {
                $match: {
                    ...activityOwnerFilter,
                    activityDate: parseDateRange(req.query.startDate as string, req.query.endDate as string) || { $exists: true }
                }
            },
            { $group: { _id: '$createdBy', count: { $sum: 1 } } }
        ]);
        const activityMap = new Map(activityCounts.map((row) => [row._id?.toString(), row.count]));

        const teamWithNames = await User.find({ _id: { $in: teamPerformance.map((row) => row._id).filter(Boolean) } })
            .select('firstName lastName');
        const userMap = new Map(teamWithNames.map((u) => [u._id.toString(), `${u.firstName} ${u.lastName}`]));

        const teamSnapshot = teamPerformance.map((row) => ({
            ownerId: row._id,
            ownerName: row._id ? userMap.get(row._id.toString()) : 'Unassigned',
            leadsAssigned: row.leadsAssigned,
            contacted: row.contacted,
            meetings: row.meetings,
            proposals: row.proposals,
            won: row.won,
            lost: row.lost,
            pipelineValue: row.pipelineValue,
            activityCount: row._id ? activityMap.get(row._id.toString()) || 0 : 0
        }));

        const nowDate = new Date();
        const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
        const monthEnd = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0);
        const nextMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 1);
        const nextMonthEnd = new Date(nowDate.getFullYear(), nowDate.getMonth() + 2, 0);

        const [thisMonthWeighted] = await Lead.aggregate([
            {
                $match: {
                    ...leadFilter,
                    status: { $in: OPEN_STATUSES },
                    expectedCloseDate: { $gte: monthStart, $lte: monthEnd }
                }
            },
            {
                $addFields: {
                    probabilityValue: { $ifNull: ['$probability', getProbabilityExpression()] },
                    dealValueSafe: { $ifNull: ['$dealValue', 0] }
                }
            },
            {
                $group: {
                    _id: null,
                    weightedValue: {
                        $sum: { $multiply: ['$dealValueSafe', { $divide: ['$probabilityValue', 100] }] }
                    }
                }
            }
        ]);

        const [nextMonthPipeline] = await Lead.aggregate([
            {
                $match: {
                    ...leadFilter,
                    status: { $in: OPEN_STATUSES },
                    expectedCloseDate: { $gte: nextMonthStart, $lte: nextMonthEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $ifNull: ['$dealValue', 0] } }
                }
            }
        ]);

        const wonTrend = await Lead.aggregate([
            { $match: { ...leadFilter, status: 'Won' } },
            {
                $group: {
                    _id: { year: { $year: '$closedAt' }, month: { $month: '$closedAt' } },
                    value: { $sum: { $ifNull: ['$dealValue', 0] } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const avgDealSize = wonDeals[0]?.count
            ? (wonDeals[0].value || 0) / wonDeals[0].count
            : 0;

        const noFirstResponseHours = Number(req.query.noFirstResponseHours) || 24;
        const highValueThreshold = Number(req.query.highValue) || 100000;

        const noFirstResponseFilter = applyOrFilter({ ...leadFilter }, [
            { firstResponseAt: null },
            { firstResponseAt: { $exists: false } }
        ]);
        noFirstResponseFilter.createdAt = { $lte: new Date(Date.now() - noFirstResponseHours * 60 * 60 * 1000) };

        const noFirstResponseLeads = await Lead.find(noFirstResponseFilter)
            .select('_id status assignedTo createdAt dealValue priority');

        const highValueFilter = applyOrFilter({ ...leadFilter, dealValue: { $gte: highValueThreshold } }, [
            { nextFollowUpDate: { $exists: false } },
            { nextFollowUpDate: null }
        ]);
        const highValueNoNext = await Lead.find(highValueFilter)
            .select('_id status assignedTo dealValue priority');

        const hotNoMeeting = await Lead.aggregate([
            { $match: { ...leadFilter, priority: 'Hot' } },
            {
                $lookup: {
                    from: 'activities',
                    let: { leadId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$relatedTo.model', 'Lead'] },
                                        { $eq: ['$relatedTo.id', '$$leadId'] },
                                        { $eq: ['$activityType', 'Meeting'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'meetings'
                }
            },
            { $match: { meetings: { $size: 0 } } },
            { $project: { _id: 1, status: 1, assignedTo: 1, priority: 1 } }
        ]);

        const duplicateLeads = await Lead.aggregate([
            { $match: leadFilter },
            {
                $group: {
                    _id: '$email',
                    count: { $sum: 1 },
                    leadIds: { $push: '$_id' }
                }
            },
            { $match: { _id: { $ne: null }, count: { $gt: 1 } } }
        ]);

        const recentActivity = await Activity.find({
            ...(await buildActivityOwnerFilter(req))
        })
            .sort({ activityDate: -1 })
            .limit(20);

        const leadFollowups = await buildFollowUpSnapshot(leadFilter);

        res.status(200).json({
            success: true,
            data: {
                kpis: {
                    totalLeads,
                    newLeads,
                    openLeads,
                    qualifiedLeads,
                    wonCount: wonDeals[0]?.count || 0,
                    wonValue: wonDeals[0]?.value || 0,
                    lostCount: lostDeals[0]?.count || 0,
                    lostValue: lostDeals[0]?.value || 0,
                    totalPipelineValue: pipelineTotals?.pipelineValue || 0,
                    weightedPipelineValue: pipelineTotals?.weightedPipelineValue || 0,
                    avgFirstResponseMins: avgResponse?.avgMs ? avgResponse.avgMs / (1000 * 60) : 0,
                    followUpsDueToday
                },
                pipeline: {
                    byStageCount: pipelineByStage.map((row) => ({ stage: row._id, count: row.count })),
                    byStageValue: pipelineByStage.map((row) => ({ stage: row._id, value: row.value })),
                    conversionRates,
                    stageAging: stageAgingResult,
                    stuckLeads
                },
                followups: {
                    today: tasksToday,
                    overdue: overdueTasks,
                    upcoming: upcomingTasks,
                    leads: leadFollowups
                },
                sources: sourcePerformance.map((row) => ({
                    source: row._id || 'Unknown',
                    leads: row.leads,
                    qualified: row.qualified,
                    won: row.won,
                    conversionRate: row.leads ? row.won / row.leads : 0
                })),
                team: teamSnapshot,
                forecast: {
                    expectedThisMonth: thisMonthWeighted?.weightedValue || 0,
                    nextMonthPipeline: nextMonthPipeline?.total || 0,
                    wonTrend: wonTrend.map((row) => ({
                        month: `${row._id.year}-${String(row._id.month).padStart(2, '0')}`,
                        count: row.count,
                        value: row.value
                    })),
                    avgDealSize
                },
                alerts: {
                    noFirstResponse: noFirstResponseLeads,
                    stuckLeads,
                    highValueNoNext,
                    hotNoMeeting,
                    duplicateLeads
                },
                recentActivity
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Funnel analytics
// @route   GET /api/analytics/funnel
// @access  Private
export const getFunnelAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const leadFilter = buildLeadFilters(req);
        const stages = await Lead.aggregate([
            { $match: leadFilter },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        res.status(200).json({ success: true, data: { stages } });
    } catch (error) {
        next(error);
    }
};

// @desc    Velocity analytics
// @route   GET /api/analytics/velocity
// @access  Private
export const getVelocityAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const leadFilter = buildLeadFilters(req);
        const [avgResponse] = await Lead.aggregate([
            { $match: { ...leadFilter, firstResponseAt: { $ne: null } } },
            { $project: { responseMs: { $subtract: ['$firstResponseAt', '$createdAt'] } } },
            { $group: { _id: null, avgMs: { $avg: '$responseMs' } } }
        ]);

        const [avgSalesCycle] = await Lead.aggregate([
            { $match: { ...leadFilter, status: 'Won', closedAt: { $ne: null } } },
            {
                $project: {
                    cycleMs: { $subtract: ['$closedAt', '$createdAt'] }
                }
            },
            { $group: { _id: null, avgMs: { $avg: '$cycleMs' } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                avgFirstResponseMins: avgResponse?.avgMs ? avgResponse.avgMs / (1000 * 60) : 0,
                avgSalesCycleDays: avgSalesCycle?.avgMs ? avgSalesCycle.avgMs / (1000 * 60 * 60 * 24) : 0
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Forecast analytics
// @route   GET /api/analytics/forecast
// @access  Private
export const getForecastAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const leadFilter = buildLeadFilters(req);
        const forecast = await Lead.aggregate([
            { $match: { ...leadFilter, status: { $in: OPEN_STATUSES } } },
            {
                $addFields: {
                    probabilityValue: { $ifNull: ['$probability', getProbabilityExpression()] },
                    dealValueSafe: { $ifNull: ['$dealValue', 0] }
                }
            },
            {
                $group: {
                    _id: null,
                    weightedValue: {
                        $sum: { $multiply: ['$dealValueSafe', { $divide: ['$probabilityValue', 100] }] }
                    },
                    pipelineValue: { $sum: '$dealValueSafe' }
                }
            }
        ]);

        res.status(200).json({ success: true, data: forecast[0] || { weightedValue: 0, pipelineValue: 0 } });
    } catch (error) {
        next(error);
    }
};

// @desc    Loss analytics
// @route   GET /api/analytics/loss
// @access  Private
export const getLossAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const leadFilter = buildLeadFilters(req);
        const historyRange = parseDateRange(req.query.startDate as string, req.query.endDate as string);
        const lostReasons = await Lead.aggregate([
            { $match: { ...leadFilter, status: 'Lost' } },
            { $group: { _id: '$lostReason', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const dropOffStages = await LeadStageHistory.aggregate([
            { $match: historyRange ? { changedAt: historyRange } : {} },
            { $group: { _id: '$fromStatus', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                lostReasons,
                dropOffStages
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Quality analytics
// @route   GET /api/analytics/quality
// @access  Private
export const getQualityAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const leadFilter = buildLeadFilters(req);
        const scored = await Lead.aggregate([
            { $match: leadFilter },
            {
                $group: {
                    _id: null,
                    avgQualityScore: { $avg: { $ifNull: ['$leadQualityScore', 0] } }
                }
            }
        ]);

        res.status(200).json({ success: true, data: scored[0] || { avgQualityScore: 0 } });
    } catch (error) {
        next(error);
    }
};
