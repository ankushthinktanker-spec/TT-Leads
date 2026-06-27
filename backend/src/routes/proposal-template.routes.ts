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
import { Roles } from '../constants/roles';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(checkPermission('proposal_templates', 'view'), getProposalTemplates)
    .post(authorize(Roles.ADMIN, Roles.MANAGER), checkPermission('proposal_templates', 'create'), createProposalTemplate);

router.route('/:id')
    .get(checkPermission('proposal_templates', 'view'), getProposalTemplate)
    .put(authorize(Roles.ADMIN, Roles.MANAGER), checkPermission('proposal_templates', 'edit'), updateProposalTemplate)
    .delete(authorize(Roles.ADMIN), checkPermission('proposal_templates', 'delete'), deleteProposalTemplate);

export default router;
