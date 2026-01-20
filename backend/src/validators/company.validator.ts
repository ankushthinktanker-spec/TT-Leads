import Joi from 'joi';

export const createCompanySchema = Joi.object({
    name: Joi.string().required().messages({
        'any.required': 'Company name is required'
    }),
    website: Joi.string().uri().optional(),
    industry: Joi.string().optional(),
    companySize: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '500+').optional(),
    address: Joi.object({
        street: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        country: Joi.string().optional(),
        pinCode: Joi.string().optional()
    }).optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
    gst: Joi.string().optional(),
    pan: Joi.string().optional(),
    registrationNumber: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    customFields: Joi.object().optional(),
    status: Joi.string().valid('Active', 'Inactive').optional()
});

export const updateCompanySchema = Joi.object({
    name: Joi.string().optional(),
    website: Joi.string().uri().optional(),
    industry: Joi.string().optional(),
    companySize: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '500+').optional(),
    address: Joi.object({
        street: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        country: Joi.string().optional(),
        pinCode: Joi.string().optional()
    }).optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
    gst: Joi.string().optional(),
    pan: Joi.string().optional(),
    registrationNumber: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    customFields: Joi.object().optional(),
    status: Joi.string().valid('Active', 'Inactive').optional()
});
