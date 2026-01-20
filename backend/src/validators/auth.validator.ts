import Joi from 'joi';

export const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
    }),
    firstName: Joi.string().required().messages({
        'any.required': 'First name is required'
    }),
    lastName: Joi.string().required().messages({
        'any.required': 'Last name is required'
    }),
    phone: Joi.string().optional(),
    role: Joi.string().max(50).optional(),
    teamId: Joi.string().optional(),
    managerId: Joi.string().optional()
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required'
    })
});

export const updateProfileSchema = Joi.object({
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    email: Joi.string().email().optional().messages({
        'string.email': 'Please provide a valid email'
    }),
    phone: Joi.string().optional(),
    avatar: Joi.string().uri().optional(),
    emailNotifications: Joi.boolean().optional(),
    smsNotifications: Joi.boolean().optional(),
    timezone: Joi.string().optional()
});

export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'any.required': 'Current password is required'
    }),
    newPassword: Joi.string().min(6).required().messages({
        'string.min': 'New password must be at least 6 characters',
        'any.required': 'New password is required'
    })
});

