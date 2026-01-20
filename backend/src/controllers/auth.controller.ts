import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import User from '../models/user.model';
import { AppError } from '../middleware/errorHandler';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';
import {
    registerSchema,
    loginSchema,
    updateProfileSchema,
    changePasswordSchema
} from '../validators/auth.validator';
import { AuthRequest } from '../middleware/auth.middleware';

const hashToken = (token: string): string =>
    crypto.createHash('sha256').update(token).digest('hex');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private (Admin only)
export const register = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Validate request body
        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const { email, password, firstName, lastName, phone, role, teamId, managerId } = value;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('User with this email already exists', 400);
        }

        // Create user
        const user = await User.create({
            email,
            password,
            firstName,
            lastName,
            phone,
            role,
            teamId,
            managerId
        });

        // Generate tokens
        const token = generateToken(user._id.toString());
        const refreshToken = generateRefreshToken(user._id.toString());
        const refreshDecoded = verifyRefreshToken(refreshToken) as { exp?: number };
        user.refreshTokenHash = hashToken(refreshToken);
        if (refreshDecoded?.exp) {
            user.refreshTokenExpiresAt = new Date(refreshDecoded.exp * 1000);
        }
        await user.save();

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    status: user.status
                },
                token,
                refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Validate request body
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const { email, password } = value;

        // Check if user exists (include password for comparison)
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        // Check if password matches
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            throw new AppError('Invalid credentials', 401);
        }

        // Check if user is active
        if (user.status !== 'Active') {
            throw new AppError('Your account is not active. Please contact administrator', 403);
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate tokens
        const token = generateToken(user._id.toString());
        const refreshToken = generateRefreshToken(user._id.toString());
        const refreshDecoded = verifyRefreshToken(refreshToken) as { exp?: number };
        user.refreshTokenHash = hashToken(refreshToken);
        if (refreshDecoded?.exp) {
            user.refreshTokenExpiresAt = new Date(refreshDecoded.exp * 1000);
        }
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    status: user.status,
                    avatar: user.avatar
                },
                token,
                refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user?._id) {
            throw new AppError('Not authorized', 401);
        }
        const user = await User.findById(req.user._id)
            .populate('teamId', 'name')
            .populate('managerId', 'firstName lastName email');

        res.status(200).json({
            success: true,
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user?._id) {
            throw new AppError('Not authorized', 401);
        }
        // Validate request body
        const { error, value } = updateProfileSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: value },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user?._id) {
            throw new AppError('Not authorized', 401);
        }
        // Validate request body
        const { error, value } = changePasswordSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const { currentPassword, newPassword } = value;

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Check current password
        const isPasswordMatch = await user.comparePassword(currentPassword);
        if (!isPasswordMatch) {
            throw new AppError('Current password is incorrect', 401);
        }

        // Update password
        user.password = newPassword;
        user.refreshTokenHash = undefined;
        user.refreshTokenExpiresAt = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            throw new AppError('Refresh token is required', 400);
        }

        // Verify refresh token
        const decoded = verifyRefreshToken(token);
        if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object' || !('id' in decoded)) {
            throw new AppError('Refresh token is invalid', 401);
        }

        // Get user
        const user = await User.findById(decoded.id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (!user.refreshTokenHash || user.refreshTokenHash !== hashToken(token)) {
            throw new AppError('Refresh token is invalid', 401);
        }

        if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt.getTime() < Date.now()) {
            throw new AppError('Refresh token expired', 401);
        }

        if (user.status !== 'Active') {
            throw new AppError('User account is not active', 403);
        }

        // Generate new tokens
        const newToken = generateToken(user._id.toString());
        const newRefreshToken = generateRefreshToken(user._id.toString());
        const refreshDecoded = verifyRefreshToken(newRefreshToken) as { exp?: number };
        user.refreshTokenHash = hashToken(newRefreshToken);
        if (refreshDecoded?.exp) {
            user.refreshTokenExpiresAt = new Date(refreshDecoded.exp * 1000);
        }
        await user.save();

        res.status(200).json({
            success: true,
            data: {
                token: newToken,
                refreshToken: newRefreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (req.user?._id) {
            await User.findByIdAndUpdate(req.user._id, {
                $unset: { refreshTokenHash: '', refreshTokenExpiresAt: '' }
            });
        }
        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        next(error);
    }
};
