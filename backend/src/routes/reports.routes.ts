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

// Lead Reports
router.get('/leads/register', reportsLimiter, protect, applyExportLimiter, checkReportPermission(), leadRegisterReport);
router.get('/leads/source', reportsLimiter, protect, applyExportLimiter, checkReportPermission(), leadSourceReport);
router.get('/leads/status', reportsLimiter, protect, applyExportLimiter, checkReportPermission(), leadStatusReport);
router.get('/leads/aging', reportsLimiter, protect, applyExportLimiter, checkReportPermission(), leadAgingReport);
router.get('/leads/response-time', reportsLimiter, protect, applyExportLimiter, checkReportPermission(), leadResponseTimeReport);
router.get('/leads/duplicates', reportsLimiter, protect, applyExportLimiter, checkReportPermission(), duplicateLeadsReport);

// Activity / Follow-up Reports
router.get('/followups/due-vs-completed', reportsLimiter, protect, checkReportPermission(), followupDueVsCompletedReport);
router.get('/followups/overdue', reportsLimiter, protect, applyExportLimiter, checkReportPermission(), overdueFollowupsReport);
router.get('/activities', reportsLimiter, protect, checkReportPermission(), activityReport);
router.get('/leads/no-activity', reportsLimiter, protect, checkReportPermission(), noActivityLeadsReport);

// Sales / Revenue Reports
router.get('/pipeline/value', reportsLimiter, protect, checkReportPermission(), pipelineValueReport);
router.get('/pipeline/weighted', reportsLimiter, protect, checkReportPermission(), weightedPipelineReport);
router.get('/deals/won', reportsLimiter, protect, applyExportLimiter, checkReportPermission(), wonDealsReport);
router.get('/deals/lost', reportsLimiter, protect, applyExportLimiter, checkReportPermission(), lostDealsReport);
router.get('/conversion', reportsLimiter, protect, checkReportPermission(), conversionReport);
router.get('/deal-cycle', reportsLimiter, protect, checkReportPermission(), dealCycleTimeReport);

// Team & Productivity
router.get('/team/performance', reportsLimiter, protect, checkReportPermission(), salesRepPerformanceReport);
router.get('/team/workload', reportsLimiter, protect, checkReportPermission(), workloadReport);

// Finance (Optional)
router.get('/finance/payments', reportsLimiter, protect, checkReportPermission(), paymentCollectionReport);
router.get('/finance/proposal-to-payment', reportsLimiter, protect, checkReportPermission(), proposalToPaymentReport);

// Company Reports
router.get('/companies/register', reportsLimiter, protect, applyExportLimiter, checkReportPermission(), companyRegisterReport);
router.get('/companies/industry', reportsLimiter, protect, applyExportLimiter, checkReportPermission(), companyIndustryReport);
router.get('/companies/status', reportsLimiter, protect, applyExportLimiter, checkReportPermission(), companyStatusReport);

export default router;
