import Lead, { ILead } from '../models/lead.model';
import Activity from '../models/activity.model';
import Task from '../models/task.model';
import User from '../models/user.model';
import LeadStageHistory from '../models/lead-stage-history.model';
import { DEFAULT_PROBABILITY_MAP, parseDateRange } from '../utils/reporting.utils';
import { buildTaskOwnerFilter, buildActivityOwnerFilter, applyOrFilter, LeadFilter } from '../utils/ownerFilters';
import { AuthRequest } from '../middleware/auth.middleware';
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

export interface DashboardFilters {
    leadFilter: FilterQuery<ILead>;
    req: AuthRequest;
}

export class AnalyticsService {
    /**
     * OPTIMIZED: The main dashboard data method.
     *
     * Previous implementation ran 15+ sequential/parallel queries against the Lead collection.
     * Now uses a single $facet aggregate for all Lead-collection analytics, and a single
     * $facet aggregate for all Task queries, drastically reducing round-trips to the database.
     */
    static async getDashboardData(filters: DashboardFilters) {
        const { leadFilter, req } = filters;
        const openStatusFilter = leadFilter.status ? leadFilter.status : { $in: OPEN_STATUSES };

        const todayRange = getDayRange(new Date());
        const nowDate = new Date();
        const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
        const monthEnd = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0);
        const nextMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 1);
        const nextMonthEnd = new Date(nowDate.getFullYear(), nowDate.getMonth() + 2, 0);
        const upcomingRangeEnd = new Date(todayRange.end);
        upcomingRangeEnd.setDate(upcomingRangeEnd.getDate() + 7);

        // ------------------------------------------------------------------
        // OPTIMIZED: Single $facet replaces ~12 separate Lead queries
        // (countDocuments x4, aggregate x8 including byStatus, pipelineTotals,
        //  avgResponse, sourcePerformance, teamPerformance, wonTrend,
        //  thisMonthWeighted, nextMonthPipeline, duplicateLeads, leadsForAging)
        // ------------------------------------------------------------------
        const leadFacetPromise = Lead.aggregate([
            { $match: leadFilter },
            {
                $facet: {
                    byStatus: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 },
                                value: { $sum: { $ifNull: ['$dealValue', 0] } }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    pipelineTotals: [
                        { $match: { status: openStatusFilter } },
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
                    ],
                    avgResponse: [
                        { $match: { firstResponseAt: { $ne: null } } },
                        {
                            $project: {
                                responseMs: { $subtract: ['$firstResponseAt', '$createdAt'] }
                            }
                        },
                        { $group: { _id: null, avgMs: { $avg: '$responseMs' } } }
                    ],
                    sourcePerformance: [
                        {
                            $group: {
                                _id: '$source',
                                leads: { $sum: 1 },
                                qualified: { $sum: { $cond: [{ $eq: ['$status', 'Qualified'] }, 1, 0] } },
                                won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } }
                            }
                        },
                        { $sort: { leads: -1 } }
                    ],
                    teamPerformance: [
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
                    ],
                    wonTrend: [
                        { $match: { status: 'Won' } },
                        {
                            $group: {
                                _id: { year: { $year: '$closedAt' }, month: { $month: '$closedAt' } },
                                value: { $sum: { $ifNull: ['$dealValue', 0] } },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { '_id.year': 1, '_id.month': 1 } }
                    ],
                    thisMonthWeighted: [
                        {
                            $match: {
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
                    ],
                    nextMonthPipeline: [
                        {
                            $match: {
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
                    ],
                    duplicateLeads: [
                        {
                            $group: {
                                _id: '$email',
                                count: { $sum: 1 },
                                leadIds: { $push: '$_id' }
                            }
                        },
                        { $match: { _id: { $ne: null }, count: { $gt: 1 } } }
                    ],
                    leadsForAging: [
                        { $project: { status: 1, createdAt: 1 } }
                    ]
                }
            }
        ]);

        // ------------------------------------------------------------------
        // OPTIMIZED: Single $facet replaces 3 separate Task queries
        // ------------------------------------------------------------------
        const taskOwnerFilterPromise = buildTaskOwnerFilter(req);
        const activityOwnerFilterPromise = buildActivityOwnerFilter(req);

        const [taskOwnerFilter, activityOwnerFilter] = await Promise.all([
            taskOwnerFilterPromise,
            activityOwnerFilterPromise
        ]);

        const taskFacetPromise = Task.aggregate([
            { $match: { ...taskOwnerFilter, status: { $ne: 'Completed' } } },
            {
                $facet: {
                    overdue: [
                        { $match: { dueDate: { $lt: todayRange.start } } },
                        { $sort: { dueDate: 1 } }
                    ],
                    today: [
                        { $match: { dueDate: { $gte: todayRange.start, $lte: todayRange.end } } },
                        { $sort: { dueDate: 1 } }
                    ],
                    upcoming: [
                        { $match: { dueDate: { $gt: todayRange.end, $lte: upcomingRangeEnd } } },
                        { $sort: { dueDate: 1 } }
                    ]
                }
            }
        ]);

        // Alert queries that cannot be folded into the main $facet (complex $or filters, $lookup)
        const noFirstResponseHours = Number(req.query.noFirstResponseHours) || 24;
        const highValueThreshold = Number(req.query.highValue) || 100000;

        const noFirstResponseFilter = applyOrFilter({ ...leadFilter }, [
            { firstResponseAt: null },
            { firstResponseAt: { $exists: false } }
        ]);
        noFirstResponseFilter.createdAt = { $lte: new Date(Date.now() - noFirstResponseHours * 60 * 60 * 1000) };

        const highValueFilter = applyOrFilter({ ...leadFilter, dealValue: { $gte: highValueThreshold } }, [
            { nextFollowUpDate: { $exists: false } },
            { nextFollowUpDate: null }
        ]);

        // Run all independent queries in parallel
        const [
            leadFacetResult,
            taskFacetResult,
            activityCounts,
            noFirstResponseLeads,
            highValueNoNext,
            hotNoMeeting,
            recentActivity,
            leadFollowups
        ] = await Promise.all([
            leadFacetPromise,
            taskFacetPromise,
            Activity.aggregate([
                {
                    $match: {
                        ...activityOwnerFilter,
                        activityDate: parseDateRange(req.query.startDate as string, req.query.endDate as string) || { $exists: true }
                    }
                },
                { $group: { _id: '$createdBy', count: { $sum: 1 } } }
            ]),
            Lead.find(noFirstResponseFilter)
                .select('_id status assignedTo createdAt dealValue priority'),
            Lead.find(highValueFilter)
                .select('_id status assignedTo dealValue priority'),
            Lead.aggregate([
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
            ]),
            Activity.find({ ...activityOwnerFilter })
                .sort({ activityDate: -1 })
                .limit(20),
            buildFollowUpSnapshot(leadFilter)
        ]);

        // ------------------------------------------------------------------
        // Extract results from the single Lead $facet
        // ------------------------------------------------------------------
        const facet = leadFacetResult[0];
        const byStatus: Array<{ _id: string; count: number; value: number }> = facet.byStatus;
        const pipelineByStage = byStatus;
        const statusMap = new Map(byStatus.map((s) => [s._id, s]));

        // Derive counts from byStatus instead of separate countDocuments calls
        const totalLeads = byStatus.reduce((sum, s) => sum + s.count, 0);
        const newLeads = statusMap.get('New')?.count || 0;
        const qualifiedLeads = statusMap.get('Qualified')?.count || 0;
        const wonCount = statusMap.get('Won')?.count || 0;
        const wonValue = statusMap.get('Won')?.value || 0;
        const lostCount = statusMap.get('Lost')?.count || 0;
        const lostValue = statusMap.get('Lost')?.value || 0;

        // openLeads: if user filtered by a specific status, that count; otherwise sum of OPEN_STATUSES
        const openLeads = leadFilter.status
            ? totalLeads
            : OPEN_STATUSES.reduce((sum, s) => sum + (statusMap.get(s)?.count || 0), 0);

        const pipelineTotals = facet.pipelineTotals[0] || null;
        const avgResponse = facet.avgResponse[0] || null;
        const sourcePerformance: Array<{ _id: string; leads: number; qualified: number; won: number }> = facet.sourcePerformance;
        const teamPerformance: Array<{
            _id: string; leadsAssigned: number; contacted: number; meetings: number;
            proposals: number; won: number; lost: number; pipelineValue: number;
        }> = facet.teamPerformance;
        const wonTrend: Array<{ _id: { year: number; month: number }; value: number; count: number }> = facet.wonTrend;
        const thisMonthWeighted = facet.thisMonthWeighted[0] || null;
        const nextMonthPipeline = facet.nextMonthPipeline[0] || null;
        const duplicateLeads: Array<{ _id: string; count: number; leadIds: string[] }> = facet.duplicateLeads;
        const leadsForAging: Array<{ _id: string; status: string; createdAt: Date }> = facet.leadsForAging;

        // Scoped lead IDs derived from facet data (no extra query needed)
        const scopedLeadIds = leadsForAging.map((l) => l._id);

        // ------------------------------------------------------------------
        // Stage history queries (different collection, depends on scopedLeadIds)
        // ------------------------------------------------------------------
        const historyDateRange = parseDateRange(req.query.startDate as string, req.query.endDate as string);
        const [stageConversion, latestStageChanges] = await Promise.all([
            LeadStageHistory.aggregate([
                {
                    $match: {
                        ...(historyDateRange ? { changedAt: historyDateRange } : {}),
                        leadId: { $in: scopedLeadIds }
                    }
                },
                { $group: { _id: { from: '$fromStatus', to: '$toStatus' }, count: { $sum: 1 } } }
            ]),
            LeadStageHistory.aggregate([
                { $match: { leadId: { $in: scopedLeadIds } } },
                { $sort: { changedAt: -1 } },
                {
                    $group: {
                        _id: '$leadId',
                        lastChangeAt: { $first: '$changedAt' }
                    }
                }
            ])
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

        // ------------------------------------------------------------------
        // Stage aging / stuck leads (computed in-memory from facet data)
        // ------------------------------------------------------------------
        const lastChangeMap = new Map(latestStageChanges.map((entry) => [entry._id.toString(), entry.lastChangeAt]));
        const stuckDays = Number(req.query.stuckDays) || 14;
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

        // ------------------------------------------------------------------
        // Extract task facet results
        // ------------------------------------------------------------------
        const taskFacet = taskFacetResult[0];
        const overdueTasks = taskFacet.overdue;
        const tasksToday = taskFacet.today;
        const upcomingTasks = taskFacet.upcoming;
        const followUpsDueToday = tasksToday.length;

        // ------------------------------------------------------------------
        // Team snapshot (needs teamPerformance from facet + user names + activity counts)
        // ------------------------------------------------------------------
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

        const avgDealSize = wonCount ? wonValue / wonCount : 0;

        // ------------------------------------------------------------------
        // Response — same shape as before
        // ------------------------------------------------------------------
        return {
            kpis: {
                totalLeads,
                newLeads,
                openLeads,
                qualifiedLeads,
                wonCount,
                wonValue,
                lostCount,
                lostValue,
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
        };
    }

    static async getFunnelData(leadFilter: FilterQuery<ILead>) {
        const stages = await Lead.aggregate([
            { $match: leadFilter },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        return { stages };
    }

    static async getVelocityData(leadFilter: FilterQuery<ILead>) {
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

        return {
            avgFirstResponseMins: avgResponse?.avgMs ? avgResponse.avgMs / (1000 * 60) : 0,
            avgSalesCycleDays: avgSalesCycle?.avgMs ? avgSalesCycle.avgMs / (1000 * 60 * 60 * 24) : 0
        };
    }

    static async getForecastAnalyticsData(leadFilter: FilterQuery<ILead>) {
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

        return forecast[0] || { weightedValue: 0, pipelineValue: 0 };
    }

    static async getLossData(leadFilter: FilterQuery<ILead>, scopedLeadIds: string[], historyRange?: { $gte?: Date; $lte?: Date }) {
        const lostReasons = await Lead.aggregate([
            { $match: { ...leadFilter, status: 'Lost' } },
            { $group: { _id: '$lostReason', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const dropOffStages = await LeadStageHistory.aggregate([
            {
                $match: {
                    ...(historyRange ? { changedAt: historyRange } : {}),
                    leadId: { $in: scopedLeadIds }
                }
            },
            { $group: { _id: '$fromStatus', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        return { lostReasons, dropOffStages };
    }

    static async getQualityData(leadFilter: FilterQuery<ILead>) {
        const scored = await Lead.aggregate([
            { $match: leadFilter },
            {
                $group: {
                    _id: null,
                    avgQualityScore: { $avg: { $ifNull: ['$leadQualityScore', 0] } }
                }
            }
        ]);

        return scored[0] || { avgQualityScore: 0 };
    }
}
