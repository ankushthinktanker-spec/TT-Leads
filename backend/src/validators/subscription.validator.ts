import Joi from 'joi';

export const createSubscriptionSchema = Joi.object({
    name: Joi.string().trim().required(),
    vendorName: Joi.string().trim().optional(),
    type: Joi.string().trim().optional(),
    companyId: Joi.string().optional(),
    internalOwnerId: Joi.string().required(),
    planName: Joi.string().trim().optional(),
    billingCycle: Joi.string().trim().optional(),
    amount: Joi.number().optional(),
    currency: Joi.string().trim().optional(),
    startDate: Joi.date().optional(),
    renewDate: Joi.date().required(),
    status: Joi.string().trim().optional(),
    notes: Joi.string().trim().optional(),
    notifyBeforeDays: Joi.array().items(Joi.number().min(0)).optional(),
    notificationChannels: Joi.array().items(Joi.string().trim()).optional()
});

export const updateSubscriptionSchema = Joi.object({
    name: Joi.string().trim().optional(),
    vendorName: Joi.string().trim().optional(),
    type: Joi.string().trim().optional(),
    companyId: Joi.string().optional(),
    internalOwnerId: Joi.string().optional(),
    planName: Joi.string().trim().optional(),
    billingCycle: Joi.string().trim().optional(),
    amount: Joi.number().optional(),
    currency: Joi.string().trim().optional(),
    startDate: Joi.date().optional(),
    renewDate: Joi.date().optional(),
    status: Joi.string().trim().optional(),
    notes: Joi.string().trim().optional(),
    notifyBeforeDays: Joi.array().items(Joi.number().min(0)).optional(),
    notificationChannels: Joi.array().items(Joi.string().trim()).optional()
});
