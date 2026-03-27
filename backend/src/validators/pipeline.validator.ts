import Joi from 'joi';

export const createPipelineSchema = Joi.object({
    name: Joi.string().trim().required(),
    status: Joi.string().valid('Active', 'Inactive').optional(),
    stages: Joi.array().items(
        Joi.object({
            name: Joi.string().trim().required(),
            order: Joi.number().required()
        })
    ).optional(),
    access: Joi.string().valid('all', 'selected').optional(),
    selectedUserIds: Joi.array().items(Joi.string()).optional()
});

export const updatePipelineSchema = Joi.object({
    name: Joi.string().trim().optional(),
    status: Joi.string().valid('Active', 'Inactive').optional(),
    stages: Joi.array().items(
        Joi.object({
            name: Joi.string().trim().required(),
            order: Joi.number().required()
        })
    ).optional(),
    access: Joi.string().valid('all', 'selected').optional(),
    selectedUserIds: Joi.array().items(Joi.string()).optional()
});

export const addPipelineStageSchema = Joi.object({
    name: Joi.string().trim().required(),
    order: Joi.number().required()
});

export const updatePipelineStageSchema = Joi.object({
    name: Joi.string().trim().optional(),
    order: Joi.number().optional()
});

export const reorderPipelineStagesSchema = Joi.object({
    stages: Joi.array().items(
        Joi.object({
            stageId: Joi.string().required(),
            order: Joi.number().required()
        })
    ).min(1).required()
});
