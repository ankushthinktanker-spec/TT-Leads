import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware';
import { getAllRolePermissions, getMyPermissions, updateRolePermissions } from '../controllers/permission.controller';

const router = Router();

router.get('/me', protect, getMyPermissions);

// Admin-only management
router.use(protect);
router.use(authorize('Admin'));

router.get('/', getAllRolePermissions);
router.put('/:role', updateRolePermissions);

export default router;
