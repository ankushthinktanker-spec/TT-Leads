import Joi from 'joi';

export const createContractSchema = Joi.object({
    contractNumber: Joi.string().trim().required(),
    title: Joi.string().trim().optional(),
    companyId: Joi.string().required(),
    dealId: Joi.string().optional(),
    ownerId: Joi.string().optional(),
    status: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    value: Joi.number().optional(),
    currency: Joi.string().optional(),
    attachmentUrls: Joi.array().items(Joi.string()).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    rating: Joi.number().min(1).max(5).optional()
});

export const updateContractSchema = Joi.object({
    contractNumber: Joi.string().trim().optional(),
    title: Joi.string().trim().optional(),
    companyId: Joi.string().optional(),
    dealId: Joi.string().optional(),
    ownerId: Joi.string().optional(),
    status: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    value: Joi.number().optional(),
    currency: Joi.string().optional(),
    attachmentUrls: Joi.array().items(Joi.string()).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    rating: Joi.number().min(1).max(5).optional()
});
