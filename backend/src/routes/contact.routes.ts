import express from 'express';
import {
    getContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact
} from '../controllers/contact.controller';
import { protect } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(checkPermission('contacts', 'view'), getContacts)
    .post(checkPermission('contacts', 'create'), createContact);

router.route('/:id')
    .get(checkPermission('contacts', 'view'), getContact)
    .put(checkPermission('contacts', 'edit'), updateContact)
    .delete(checkPermission('contacts', 'delete'), deleteContact);

export default router;
