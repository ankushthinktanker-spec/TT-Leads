import Joi from 'joi';

export const createActivitySchema = Joi.object({
    activityType: Joi.string().valid('Call', 'Meeting', 'Email', 'WhatsApp', 'Note').required().messages({
        'any.required': 'Activity type is required'
    }),
    relatedTo: Joi.object({
        model: Joi.string().valid('Lead', 'Company', 'Proposal').required(),
        id: Joi.string().required()
    }).required(),
    subject: Joi.string().required().messages({
        'any.required': 'Subject is required'
    }),
    description: Joi.string().optional(),
    contactPerson: Joi.string().optional(),
    outcome: Joi.string().optional(),
    activityDate: Joi.date().optional(),
    duration: Joi.number().min(0).optional(),
    nextFollowUpDate: Joi.date().optional(),
    attendees: Joi.array().items(Joi.string()).optional()
});

export const updateActivitySchema = Joi.object({
    activityType: Joi.string().valid('Call', 'Meeting', 'Email', 'WhatsApp', 'Note').optional(),
    relatedTo: Joi.object({
        model: Joi.string().valid('Lead', 'Company', 'Proposal').optional(),
        id: Joi.string().optional()
    }).optional(),
    subject: Joi.string().optional(),
    description: Joi.string().optional(),
    contactPerson: Joi.string().optional(),
    outcome: Joi.string().optional(),
    activityDate: Joi.date().optional(),
    duration: Joi.number().min(0).optional(),
    nextFollowUpDate: Joi.date().optional(),
    attendees: Joi.array().items(Joi.string()).optional()
});
