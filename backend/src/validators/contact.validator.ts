import Joi from 'joi';

export const createContactSchema = Joi.object({
    firstName: Joi.string().required().messages({
        'any.required': 'First name is required'
    }),
    lastName: Joi.string().required().messages({
        'any.required': 'Last name is required'
    }),
    designation: Joi.string().allow('').optional(),
    department: Joi.string().allow('').optional(),
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
    }),
    phone: Joi.string().required().messages({
        'any.required': 'Phone is required'
    }),
    alternatePhone: Joi.string().allow('').optional(),
    whatsapp: Joi.string().allow('').optional(),
    companyId: Joi.string().required().messages({
        'any.required': 'Company is required'
    }),
    isPrimary: Joi.boolean().optional(),
    status: Joi.string().valid('Active', 'Inactive').optional(),
    notes: Joi.string().allow('').optional()
});

export const updateContactSchema = Joi.object({
    firstName: Joi.string().allow('').optional(),
    lastName: Joi.string().allow('').optional(),
    designation: Joi.string().allow('').optional(),
    department: Joi.string().allow('').optional(),
    email: Joi.string().email().allow('').optional(),
    phone: Joi.string().allow('').optional(),
    alternatePhone: Joi.string().allow('').optional(),
    whatsapp: Joi.string().allow('').optional(),
    companyId: Joi.string().allow('').optional(),
    isPrimary: Joi.boolean().optional(),
    status: Joi.string().valid('Active', 'Inactive').optional(),
    notes: Joi.string().allow('').optional()
});
