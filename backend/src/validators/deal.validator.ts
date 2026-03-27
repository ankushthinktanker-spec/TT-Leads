import Joi from 'joi';

export const createDealSchema = Joi.object({
    name: Joi.string().trim().required(),
    companyId: Joi.string().required(),
    ownerId: Joi.string().optional(),
    pipelineId: Joi.string().optional(),
    stageId: Joi.string().optional(),
    status: Joi.string().valid('Open', 'Won', 'Lost').optional(),
    value: Joi.number().optional(),
    currency: Joi.string().optional(),
    expectedCloseDate: Joi.date().optional(),
    probability: Joi.number().min(0).max(100).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    rating: Joi.number().min(1).max(5).optional()
});

export const updateDealSchema = Joi.object({
    name: Joi.string().trim().optional(),
    companyId: Joi.string().optional(),
    ownerId: Joi.string().optional(),
    pipelineId: Joi.string().optional(),
    stageId: Joi.string().optional(),
    status: Joi.string().valid('Open', 'Won', 'Lost').optional(),
    value: Joi.number().optional(),
    currency: Joi.string().optional(),
    expectedCloseDate: Joi.date().optional(),
    probability: Joi.number().min(0).max(100).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    rating: Joi.number().min(1).max(5).optional()
});

export const updateDealStatusSchema = Joi.object({
    status: Joi.string().valid('Open', 'Won', 'Lost').required()
});

export const updateDealStageSchema = Joi.object({
    pipelineId: Joi.string().optional(),
    stageId: Joi.string().required()
});

export const assignDealSchema = Joi.object({
    ownerId: Joi.string().required()
});
