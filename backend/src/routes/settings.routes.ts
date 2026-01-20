import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { protect, requireRole } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = Router();

router.use(protect);

// Get settings (accessible to all authenticated users)
router.get('/:type', requireRole('Admin'), checkPermission('settings', 'view'), getSettings);

// Update settings (Admin only)
router.put('/:type', requireRole('Admin'), checkPermission('settings', 'edit'), updateSettings);

export default router;
