import { Router } from 'express';
import {
    getLeads,
    getLead,
    createLead,
    updateLead,
    deleteLead,
    updateLeadStatus,
    assignLead,
    getMyLeads,
    updateLeadFollowUp,
    addLeadNote,
    getStuckLeads
} from '../controllers/lead.controller';
import { getLeadActivities, createLeadActivity } from '../controllers/lead-activity.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Public routes (for all authenticated users)
router.get('/my-leads', checkPermission('leads', 'view'), getMyLeads);
router.get('/stuck', checkPermission('leads', 'view'), getStuckLeads);
router.get('/', checkPermission('leads', 'view'), getLeads);
router.get('/:id', checkPermission('leads', 'view'), getLead);
router.post('/', checkPermission('leads', 'create'), createLead);
router.put('/:id', checkPermission('leads', 'edit'), updateLead);
router.patch('/:id/status', checkPermission('leads', 'status_change'), updateLeadStatus);
router.patch('/:id/followup', checkPermission('leads', 'edit'), updateLeadFollowUp);
router.post('/:id/notes', checkPermission('leads', 'edit'), addLeadNote);
router.get('/:id/activities', checkPermission('leads', 'view'), getLeadActivities);
router.post('/:id/activities', checkPermission('leads', 'edit'), createLeadActivity);

// Admin/Manager only routes
router.delete('/:id', authorize('Admin', 'Manager'), checkPermission('leads', 'delete'), deleteLead);
router.patch('/:id/assign', authorize('Admin', 'Manager'), checkPermission('leads', 'assign'), assignLead);

export default router;
