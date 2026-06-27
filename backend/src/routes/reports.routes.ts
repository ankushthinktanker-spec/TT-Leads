import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth.middleware';
import { checkReportPermission } from '../middleware/permission.middleware';
import {
    leadRegisterReport,
    leadSourceReport,
    leadStatusReport,
    leadAgingReport,
    leadResponseTimeReport,
    duplicateLeadsReport,
    followupDueVsCompletedReport,
    overdueFollowupsReport,
    activityReport,
    noActivityLeadsReport,
    pipelineValueReport,
    weightedPipelineReport,
    wonDealsReport,
    lostDealsReport,
    conversionReport,
    dealCycleTimeReport,
    salesRepPerformanceReport,
    workloadReport,
    paymentCollectionReport,
    proposalToPaymentReport,
    companyRegisterReport,
    companyIndustryReport,
    companyStatusReport
} from '../controllers/reports.controller';

const router = express.Router();

const reportsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
});

const reportExportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false
});

const applyExportLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.query.format) {
        return reportExportLimiter(req, res, next);
    }
    return next();
};

// PERF-8: Browser-side caching for non-export GET requests — eliminates repeat DB
// round-trips when users navigate between report views within the same 30s window.
const cacheControl = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.query.format) {
        res.setHeader('Cache-Control', 'private, max-age=30');
    }
    next();
};

// Lead Reports
router.get('/leads/register', reportsLimiter, protect, applyExportLimiter, cacheControl, checkReportPermission(), leadRegisterReport);
router.get('/leads/source', reportsLimiter, protect, applyExportLimiter, cacheControl, checkReportPermission(), leadSourceReport);
router.get('/leads/status', reportsLimiter, protect, applyExportLimiter, cacheControl, checkReportPermission(), leadStatusReport);
router.get('/leads/aging', reportsLimiter, protect, applyExportLimiter, cacheControl, checkReportPermission(), leadAgingReport);
router.get('/leads/response-time', reportsLimiter, protect, applyExportLimiter, cacheControl, checkReportPermission(), leadResponseTimeReport);
router.get('/leads/duplicates', reportsLimiter, protect, applyExportLimiter, cacheControl, checkReportPermission(), duplicateLeadsReport);

// Activity / Follow-up Reports
router.get('/followups/due-vs-completed', reportsLimiter, protect, cacheControl, checkReportPermission(), followupDueVsCompletedReport);
router.get('/followups/overdue', reportsLimiter, protect, applyExportLimiter, cacheControl, checkReportPermission(), overdueFollowupsReport);
router.get('/activities', reportsLimiter, protect, cacheControl, checkReportPermission(), activityReport);
router.get('/leads/no-activity', reportsLimiter, protect, cacheControl, checkReportPermission(), noActivityLeadsReport);

// Sales / Revenue Reports
router.get('/pipeline/value', reportsLimiter, protect, cacheControl, checkReportPermission(), pipelineValueReport);
router.get('/pipeline/weighted', reportsLimiter, protect, cacheControl, checkReportPermission(), weightedPipelineReport);
router.get('/deals/won', reportsLimiter, protect, applyExportLimiter, cacheControl, checkReportPermission(), wonDealsReport);
router.get('/deals/lost', reportsLimiter, protect, applyExportLimiter, cacheControl, checkReportPermission(), lostDealsReport);
router.get('/conversion', reportsLimiter, protect, cacheControl, checkReportPermission(), conversionReport);
router.get('/deal-cycle', reportsLimiter, protect, cacheControl, checkReportPermission(), dealCycleTimeReport);

// Team & Productivity
router.get('/team/performance', reportsLimiter, protect, cacheControl, checkReportPermission(), salesRepPerformanceReport);
router.get('/team/workload', reportsLimiter, protect, cacheControl, checkReportPermission(), workloadReport);

// Finance (Optional)
router.get('/finance/payments', reportsLimiter, protect, cacheControl, checkReportPermission(), paymentCollectionReport);
router.get('/finance/proposal-to-payment', reportsLimiter, protect, cacheControl, checkReportPermission(), proposalToPaymentReport);

// Company Reports
router.get('/companies/register', reportsLimiter, protect, applyExportLimiter, cacheControl, checkReportPermission(), companyRegisterReport);
router.get('/companies/industry', reportsLimiter, protect, applyExportLimiter, cacheControl, checkReportPermission(), companyIndustryReport);
router.get('/companies/status', reportsLimiter, protect, applyExportLimiter, cacheControl, checkReportPermission(), companyStatusReport);

export default router;
