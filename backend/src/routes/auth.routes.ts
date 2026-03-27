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
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Standardize with centralized rate limiters
// 10 attempts / 15 mins for login
router.post('/login', authLimiter, login);

// Slightly more lenient for refresh tokens
router.post('/refresh-token', refreshToken);

// Protected routes
router.post('/register', protect, authorize('Admin'), checkPermission('users', 'create'), register);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);

export default router;
