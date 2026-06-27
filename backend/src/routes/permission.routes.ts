import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware';
import { getAllRolePermissions, getMyPermissions, updateRolePermissions } from '../controllers/permission.controller';
import { Roles } from '../constants/roles';

const router = Router();

router.get('/me', protect, getMyPermissions);

// Admin-only management
router.use(protect);
router.use(authorize(Roles.ADMIN));

router.get('/', getAllRolePermissions);
router.put('/:role', updateRolePermissions);

export default router;
