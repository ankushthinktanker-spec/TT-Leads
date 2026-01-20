import Joi from 'joi';

export const createLeadSchema = Joi.object({
    firstName: Joi.string().required().messages({
        'any.required': 'First name is required'
    }),
    lastName: Joi.string().required().messages({
        'any.required': 'Last name is required'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
    }),
    phone: Joi.string().required().messages({
        'any.required': 'Phone is required'
    }),
    alternatePhone: Joi.string().allow('').optional(),
    company: Joi.string().required().messages({
        'any.required': 'Company name is required'
    }),
    designation: Joi.string().allow('').optional(),
    website: Joi.string().uri().allow('').optional(),
    companyId: Joi.string().allow('').optional(),
    contactId: Joi.string().allow('').optional(),
    requirementSummary: Joi.string().allow('').optional(),

    source: Joi.string()
        .valid('Website', 'Referral', 'Cold Call', 'LinkedIn', 'Email Campaign', 'Trade Show', 'Partner', 'JustDial', 'Other')
        .required()
        .messages({
            'any.required': 'Lead source is required'
        }),
    sourceDetails: Joi.string().allow('').optional(),
    status: Joi.string()
        .valid('New', 'Contacted', 'Qualified', 'Needs Analysis', 'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Nurture')
        .optional(),
    lostReason: Joi.string().allow('').when('status', {
        is: 'Lost',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    lifecycleStage: Joi.string()
        .valid('New', 'Contacted', 'Qualified', 'Opportunity', 'Customer')
        .optional(),
    priority: Joi.string().valid('Hot', 'Warm', 'Cold').optional(),

    industry: Joi.string().allow('').optional(),
    companySize: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '500+').optional(),
    location: Joi.object({
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        country: Joi.string().required()
    }).optional(),

    serviceInterest: Joi.array()
        .items(Joi.string().valid('Web Development', 'Mobile App', 'Cloud Services', 'AI/ML', 'DevOps', 'Consulting', 'Other'))
        .optional(),
    budget: Joi.object({
        min: Joi.number().min(0).optional(),
        max: Joi.number().min(0).optional(),
        currency: Joi.string().optional()
    }).optional(),
    dealValue: Joi.alternatives().try(Joi.number().min(0), Joi.string().allow('')).optional(),
    expectedCloseDate: Joi.date().optional(),

    ownerId: Joi.string().optional(),
    assignedTo: Joi.string().optional(),
    teamId: Joi.string().optional(),

    nextFollowUpAt: Joi.date().optional(),
    nextFollowUpDate: Joi.date().optional(),
    followUpType: Joi.string().valid('CALL', 'WHATSAPP', 'EMAIL', 'MEETING').optional(),
    tags: Joi.array().items(Joi.string().allow('')).optional(),
    customFields: Joi.object().optional()
}).or('nextFollowUpDate', 'nextFollowUpAt')
  .or('ownerId', 'assignedTo');

export const updateLeadSchema = Joi.object({
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    alternatePhone: Joi.string().allow('').optional(),
    company: Joi.string().optional(),
    designation: Joi.string().allow('').optional(),
    website: Joi.string().uri().allow('').optional(),
    companyId: Joi.string().allow('').optional(),
    contactId: Joi.string().allow('').optional(),
    requirementSummary: Joi.string().allow('').optional(),

    source: Joi.string()
        .valid('Website', 'Referral', 'Cold Call', 'LinkedIn', 'Email Campaign', 'Trade Show', 'Partner', 'JustDial', 'Other')
        .optional(),
    sourceDetails: Joi.string().allow('').optional(),
    status: Joi.string()
        .valid('New', 'Contacted', 'Qualified', 'Needs Analysis', 'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Nurture')
        .optional(),
    lostReason: Joi.string().allow('').when('status', {
        is: 'Lost',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    lifecycleStage: Joi.string()
        .valid('New', 'Contacted', 'Qualified', 'Opportunity', 'Customer')
        .optional(),
    priority: Joi.string().valid('Hot', 'Warm', 'Cold').optional(),

    industry: Joi.string().allow('').optional(),
    companySize: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '500+').optional(),
    location: Joi.object({
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        country: Joi.string().optional()
    }).optional(),

    serviceInterest: Joi.array()
        .items(Joi.string().valid('Web Development', 'Mobile App', 'Cloud Services', 'AI/ML', 'DevOps', 'Consulting', 'Other'))
        .optional(),
    budget: Joi.object({
        min: Joi.number().min(0).optional(),
        max: Joi.number().min(0).optional(),
        currency: Joi.string().optional()
    }).optional(),
    dealValue: Joi.alternatives().try(Joi.number().min(0), Joi.string().allow('')).optional(),
    expectedCloseDate: Joi.date().optional(),

    ownerId: Joi.string().allow(null).optional(),
    assignedTo: Joi.string().allow(null).optional(),
    teamId: Joi.string().allow(null).optional(),

    lastContactedDate: Joi.date().optional(),
    nextFollowUpAt: Joi.date().optional(),
    nextFollowUpDate: Joi.date().optional(),
    followUpType: Joi.string().valid('CALL', 'WHATSAPP', 'EMAIL', 'MEETING').optional(),
    tags: Joi.array().items(Joi.string().allow('')).optional(),
    customFields: Joi.object().optional()
});

export const updateLeadStatusSchema = Joi.object({
    status: Joi.string()
        .valid('New', 'Contacted', 'Qualified', 'Needs Analysis', 'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Nurture')
        .required()
        .messages({
            'any.required': 'Status is required'
        }),
    lostReason: Joi.string().when('status', {
        is: 'Lost',
        then: Joi.required(),
        otherwise: Joi.optional()
    })
});

export const assignLeadSchema = Joi.object({
    assignedTo: Joi.string().required().messages({
        'any.required': 'User ID is required'
    })
});
