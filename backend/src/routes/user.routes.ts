import { Router } from 'express';
import {
    getUsers,
    getUser,
    updateUser,
    deleteUser
} from '../controllers/user.controller';
import { protect, requireRole } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';
import { Roles } from '../constants/roles';

const router = Router();

// All routes are protected and restricted to Admin
router.use(protect);
router.use(requireRole(Roles.ADMIN));

router.route('/')
    .get(checkPermission('users', 'view'), getUsers);

router.route('/:id')
    .get(checkPermission('users', 'view'), getUser)
    .put(checkPermission('users', 'edit'), updateUser)
    .delete(checkPermission('users', 'delete'), deleteUser);

export default router;
