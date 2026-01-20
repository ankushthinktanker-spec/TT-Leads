import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';
import { createRole, deleteRole, getRoles, updateRole } from '../controllers/role.controller';

const router = Router();

router.use(protect);
router.use(authorize('Admin'));

router.get('/', checkPermission('users', 'view'), getRoles);
router.post('/', checkPermission('users', 'create'), createRole);
router.put('/:id', checkPermission('users', 'edit'), updateRole);
router.delete('/:id', checkPermission('users', 'delete'), deleteRole);

export default router;
