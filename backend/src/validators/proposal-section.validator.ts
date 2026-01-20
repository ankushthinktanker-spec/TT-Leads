import Joi from 'joi';

export const createProposalSectionSchema = Joi.object({
    sectionTitle: Joi.string().optional(),
    sectionType: Joi.string().valid('RichText', 'Table', 'Mixed').optional(),
    sectionOrder: Joi.number().min(0).optional(),
    content: Joi.string().required().messages({
        'any.required': 'Section content is required'
    }),
    includeInIndex: Joi.boolean().optional(),
    isVisible: Joi.boolean().optional(),
    title: Joi.string().optional(),
    contentType: Joi.string().valid('richText', 'table', 'mixed').optional(),
    order: Joi.number().min(0).optional(),
    includeInTOC: Joi.boolean().optional(),
    localId: Joi.string().optional()
});

export const updateProposalSectionSchema = Joi.object({
    sectionTitle: Joi.string().optional(),
    sectionType: Joi.string().valid('RichText', 'Table', 'Mixed').optional(),
    sectionOrder: Joi.number().min(0).optional(),
    content: Joi.string().optional(),
    includeInIndex: Joi.boolean().optional(),
    isVisible: Joi.boolean().optional(),
    title: Joi.string().optional(),
    contentType: Joi.string().valid('richText', 'table', 'mixed').optional(),
    order: Joi.number().min(0).optional(),
    includeInTOC: Joi.boolean().optional(),
    localId: Joi.string().optional()
});

export const reorderProposalSectionsSchema = Joi.object({
    sectionOrders: Joi.array()
        .items(
            Joi.object({
                sectionId: Joi.string().required(),
                newOrder: Joi.number().min(0).required()
            })
        )
        .min(1)
        .required()
});
