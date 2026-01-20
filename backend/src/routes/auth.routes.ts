import { Router } from 'express';
import {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    refreshToken,
    logout
} from '../controllers/auth.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.post('/register', protect, authorize('Admin'), checkPermission('users', 'create'), register);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);

export default router;
