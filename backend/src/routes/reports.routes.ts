import express from 'express';
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
    proposalToPaymentReport
} from '../controllers/reports.controller';

const router = express.Router();

// Lead Reports
router.get('/leads/register', protect, checkReportPermission(), leadRegisterReport);
router.get('/leads/source', protect, checkReportPermission(), leadSourceReport);
router.get('/leads/status', protect, checkReportPermission(), leadStatusReport);
router.get('/leads/aging', protect, checkReportPermission(), leadAgingReport);
router.get('/leads/response-time', protect, checkReportPermission(), leadResponseTimeReport);
router.get('/leads/duplicates', protect, checkReportPermission(), duplicateLeadsReport);

// Activity / Follow-up Reports
router.get('/followups/due-vs-completed', protect, checkReportPermission(), followupDueVsCompletedReport);
router.get('/followups/overdue', protect, checkReportPermission(), overdueFollowupsReport);
router.get('/activities', protect, checkReportPermission(), activityReport);
router.get('/leads/no-activity', protect, checkReportPermission(), noActivityLeadsReport);

// Sales / Revenue Reports
router.get('/pipeline/value', protect, checkReportPermission(), pipelineValueReport);
router.get('/pipeline/weighted', protect, checkReportPermission(), weightedPipelineReport);
router.get('/deals/won', protect, checkReportPermission(), wonDealsReport);
router.get('/deals/lost', protect, checkReportPermission(), lostDealsReport);
router.get('/conversion', protect, checkReportPermission(), conversionReport);
router.get('/deal-cycle', protect, checkReportPermission(), dealCycleTimeReport);

// Team & Productivity
router.get('/team/performance', protect, checkReportPermission(), salesRepPerformanceReport);
router.get('/team/workload', protect, checkReportPermission(), workloadReport);

// Finance (Optional)
router.get('/finance/payments', protect, checkReportPermission(), paymentCollectionReport);
router.get('/finance/proposal-to-payment', protect, checkReportPermission(), proposalToPaymentReport);

export default router;
