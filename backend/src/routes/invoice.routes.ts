import express from 'express';
import {
    getInvoices,
    getInvoice,
    createInvoiceHandler,
    updateInvoiceHandler,
    deleteInvoiceHandler
} from '../controllers/invoice.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';
import { Roles } from '../constants/roles';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(checkPermission('invoices', 'view'), getInvoices)
    .post(checkPermission('invoices', 'create'), createInvoiceHandler);

router.route('/:id')
    .get(checkPermission('invoices', 'view'), getInvoice)
    .put(checkPermission('invoices', 'edit'), updateInvoiceHandler)
    .delete(authorize(Roles.ADMIN, Roles.MANAGER), checkPermission('invoices', 'delete'), deleteInvoiceHandler);

export default router;
