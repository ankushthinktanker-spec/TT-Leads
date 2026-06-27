import { Response, NextFunction } from 'express';
import Lead from '../models/lead.model';
import LeadStageHistory from '../models/lead-stage-history.model';
import Company from '../models/company.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { buildLeadFilters } from '../utils/reporting.utils';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';
import {
    getActivityRows,
    buildCompanyReportFilter,
    getConversionRows,
    getDealCycleSummary,
    getCompanyIndustryRows,
    getCompanyRegisterRows,
    getCompanyStatusRows,
    getDuplicateLeadRows,
    getFollowupDueVsCompletedRows,
    getLeadRegisterExportRows,
    getLeadSourceRows,
    getLeadStatusRows,
    getLostDealRows,
    getNoActivityLeadRows,
    getOverdueFollowupRows,
    getPipelineValueRows,
    getSalesRepPerformanceRows,
    getWeightedPipelineResult,
    getWonDealRows,
    getWorkloadRows,
    sendReportExport
} from '../services/reports.service';

// Lead Register Report
export const leadRegisterReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = buildLeadFilters(req);
        const { format } = req.query as { format?: string };

        if (format) {
            const rows = await getLeadRegisterExportRows(filter);
            return await sendReportExport(res, rows, format, 'lead-register');
        }

        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>, { defaultLimit: 20 });
        const [paged, total] = await Promise.all([
            Lead.find(filter)
                .populate('assignedTo', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Lead.countDocuments(filter)
        ]);
        res.status(200).json({
            success: true,
            data: {
                data: paged,
                meta: buildPaginationMeta(page, limit, total)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Lead Source Report
export const leadSourceReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { format } = req.query as { format?: string };
        const rows = await getLeadSourceRows(buildLeadFilters(req));

        if (format) return await sendReportExport(res, rows, format, 'lead-source');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Lead Status/Stage Report
export const leadStatusReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { format } = req.query as { format?: string };
        const rows = await getLeadStatusRows(buildLeadFilters(req));

        if (format) return await sendReportExport(res, rows, format, 'lead-status');
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
            { $match: { leadId: { $in: leads.map((lead) => lead._id) } } },
            { $sort: { changedAt: -1 } },
            { $group: { _id: '$leadId', lastChangeAt: { $first: '$changedAt' } } }
        ]);

        const historyMap = new Map<string, Date>(
            history.map((entry: { _id: { toString(): string }; lastChangeAt: Date }) => [
                entry._id.toString(),
                entry.lastChangeAt
            ])
        );
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
        if (format) return await sendReportExport(res, rows, format, 'lead-aging');
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

        if (format) return await sendReportExport(res, rows, format, 'lead-response-time');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Duplicate Leads Report
export const duplicateLeadsReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { format } = req.query as { format?: string };
        const rows = await getDuplicateLeadRows(buildLeadFilters(req));

        if (format) return await sendReportExport(res, rows, format, 'duplicate-leads');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Follow-up Due vs Completed
export const followupDueVsCompletedReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const rows = await getFollowupDueVsCompletedRows(req);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Overdue Follow-ups
export const overdueFollowupsReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { format } = req.query as { format?: string };
        const rows = await getOverdueFollowupRows(req);

        if (format) return await sendReportExport(res, rows, format, 'overdue-followups');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Activity Report
export const activityReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const rows = await getActivityRows(req);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// No-Activity Leads Report
export const noActivityLeadsReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const rows = await getNoActivityLeadRows(req);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Pipeline Value Report
export const pipelineValueReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const results = await getPipelineValueRows(buildLeadFilters(req));
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        next(error);
    }
};

// Weighted Pipeline Forecast Report
export const weightedPipelineReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await getWeightedPipelineResult(buildLeadFilters(req));
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

// Won Deals Report
export const wonDealsReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { format } = req.query as { format?: string };
        const rows = await getWonDealRows(buildLeadFilters(req));
        if (format) return await sendReportExport(res, rows, format, 'won-deals');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Lost Deals Report
export const lostDealsReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { format } = req.query as { format?: string };
        const rows = await getLostDealRows(buildLeadFilters(req));
        if (format) return await sendReportExport(res, rows, format, 'lost-deals');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Conversion Report
export const conversionReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const transitions = await getConversionRows(req);
        res.status(200).json({ success: true, data: transitions });
    } catch (error) {
        next(error);
    }
};

// Deal Cycle Time Report
export const dealCycleTimeReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await getDealCycleSummary(buildLeadFilters(req));
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

// Sales Rep Performance Report
export const salesRepPerformanceReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const results = await getSalesRepPerformanceRows(buildLeadFilters(req));
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        next(error);
    }
};

// Workload Report
export const workloadReport = async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
        const results = await getWorkloadRows(buildLeadFilters(req));
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

// Company Register Report
export const companyRegisterReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { format } = req.query as { format?: string };
        const filter = await buildCompanyReportFilter(req);

        if (format) {
            const rows = await getCompanyRegisterRows(filter);
            return await sendReportExport(res, rows, format, 'company-register');
        }

        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>, { defaultLimit: 20 });
        const [paged, total] = await Promise.all([
            Company.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Company.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            data: {
                data: paged,
                meta: buildPaginationMeta(page, limit, total)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Company Industry Report
export const companyIndustryReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = await buildCompanyReportFilter(req);
        const { format } = req.query as { format?: string };
        const rows = await getCompanyIndustryRows(filter);

        if (format) {
            return await sendReportExport(res, rows, format, 'company-industry');
        }

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Company Status Report
export const companyStatusReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filter = await buildCompanyReportFilter(req);
        const { format } = req.query as { format?: string };
        const rows = await getCompanyStatusRows(filter);

        if (format) {
            return await sendReportExport(res, rows, format, 'company-status');
        }

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};
