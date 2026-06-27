import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { protect, requireRole } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';
import { Roles } from '../constants/roles';

const router = Router();

router.use(protect);

// Get settings (accessible to all authenticated users)
router.get('/:type', requireRole(Roles.ADMIN), checkPermission('settings', 'view'), getSettings);

// Update settings (Admin only)
router.put('/:type', requireRole(Roles.ADMIN), checkPermission('settings', 'edit'), updateSettings);

export default router;
