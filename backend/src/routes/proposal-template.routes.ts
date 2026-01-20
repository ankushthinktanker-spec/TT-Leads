import express from 'express';
import {
    getProposalTemplates,
    getProposalTemplate,
    createProposalTemplate,
    updateProposalTemplate,
    deleteProposalTemplate
} from '../controllers/proposal-template.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(checkPermission('proposal_templates', 'view'), getProposalTemplates)
    .post(authorize('Admin', 'Manager'), checkPermission('proposal_templates', 'create'), createProposalTemplate);

router.route('/:id')
    .get(checkPermission('proposal_templates', 'view'), getProposalTemplate)
    .put(authorize('Admin', 'Manager'), checkPermission('proposal_templates', 'edit'), updateProposalTemplate)
    .delete(authorize('Admin'), checkPermission('proposal_templates', 'delete'), deleteProposalTemplate);

export default router;
