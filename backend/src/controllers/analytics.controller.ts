import { Response, NextFunction } from 'express';
import Lead from '../models/lead.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { buildLeadFilters, parseDateRange } from '../utils/reporting.utils';
import { AnalyticsService } from '../services/analytics.service';
import { canUseOfflineMode } from '../config/runtime';

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
export const getDashboard = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (canUseOfflineMode()) {
            res.status(200).json({
                success: true,
                data: {
                    kpis: {
                        totalLeads: 24,
                        qualifiedLeads: 8,
                        wonCount: 3,
                        followUpsDueToday: 5,
                    },
                    pipeline: {
                        byStageCount: [
                            { stage: 'New', count: 7 },
                            { stage: 'Qualified', count: 8 },
                            { stage: 'Proposal Sent', count: 5 },
                            { stage: 'Negotiation', count: 4 },
                        ],
                        stuckLeads: [],
                    },
                    recentActivity: [
                        { _id: 'offline-1', subject: 'Offline mode enabled for local workspace', type: 'System', activityDate: new Date().toISOString() },
                        { _id: 'offline-2', subject: 'Database connection unavailable, using mock dashboard', type: 'Alert', activityDate: new Date().toISOString() },
                    ],
                    alerts: {},
                },
            });
            return;
        }
        const leadFilter = buildLeadFilters(req);
        const data = await AnalyticsService.getDashboardData({ leadFilter, req });
        res.status(200).json({ success: true, data });
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
        const data = await AnalyticsService.getFunnelData(leadFilter);
        res.status(200).json({ success: true, data });
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
        const data = await AnalyticsService.getVelocityData(leadFilter);
        res.status(200).json({ success: true, data });
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
        const data = await AnalyticsService.getForecastAnalyticsData(leadFilter);
        res.status(200).json({ success: true, data });
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
        const scopedLeadIds = (await Lead.find(leadFilter).select('_id').lean()).map((lead) => lead._id.toString());
        const data = await AnalyticsService.getLossData(leadFilter, scopedLeadIds, historyRange);
        res.status(200).json({ success: true, data });
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
        const data = await AnalyticsService.getQualityData(leadFilter);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};
