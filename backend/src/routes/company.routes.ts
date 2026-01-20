import express from 'express';
import {
    getCompanies,
    getCompany,
    createCompany,
    updateCompany,
    deleteCompany
} from '../controllers/company.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = express.Router();

router.use(protect); // All routes require authentication

router.route('/')
    .get(checkPermission('companies', 'view'), getCompanies)
    .post(checkPermission('companies', 'create'), createCompany);

router.route('/:id')
    .get(checkPermission('companies', 'view'), getCompany)
    .put(checkPermission('companies', 'edit'), updateCompany)
    .delete(authorize('Admin', 'Manager'), checkPermission('companies', 'delete'), deleteCompany);

export default router;
