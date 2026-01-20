import Joi from 'joi';

const proposalSectionSchema = Joi.object({
    title: Joi.string().required(),
    sectionTitle: Joi.string().optional(),
    content: Joi.string().required(),
    contentType: Joi.string().valid('richText', 'table', 'mixed', 'RichText', 'Table', 'Mixed').optional(),
    sectionType: Joi.string().valid('richText', 'table', 'mixed', 'RichText', 'Table', 'Mixed').optional(),
    order: Joi.number().min(0).optional(),
    sectionOrder: Joi.number().min(0).optional(),
    isVisible: Joi.boolean().optional(),
    includeInTOC: Joi.boolean().optional(),
    includeInIndex: Joi.boolean().optional(),
    localId: Joi.string().optional()
});

const preparedBySchema = Joi.object({
    name: Joi.string().required(),
    designation: Joi.string().optional(),
    company: Joi.string().required(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    website: Joi.string().optional()
});

const clientDetailsSchema = Joi.object({
    companyName: Joi.string().required(),
    contactPerson: Joi.string().optional(),
    designation: Joi.string().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    address: Joi.string().optional()
});

export const createProposalSchema = Joi.object({
    title: Joi.string().required().messages({
        'any.required': 'Proposal title is required'
    }),
    leadId: Joi.string().optional(),
    companyId: Joi.string().optional(),
    contactId: Joi.string().optional(),
    proposalDate: Joi.date().optional(),
    validTill: Joi.date().optional(),
    validUntil: Joi.date().optional(),
    currency: Joi.string().valid('INR', 'USD', 'EUR', 'GBP').optional(),
    totalAmount: Joi.number().min(0).optional(),
    totalValue: Joi.number().min(0).optional(),
    status: Joi.string().valid('Draft', 'Sent', 'Under Review', 'Accepted', 'Rejected').optional(),
    logoUrl: Joi.alternatives().try(
        Joi.string().uri(),
        Joi.string().pattern(/^\/uploads\//)
    ).optional(),
    headerText: Joi.string().optional(),
    footerLine1: Joi.string().optional(),
    footerLine2: Joi.string().optional(),
    showPageNumbers: Joi.boolean().optional(),
    tocDepth: Joi.number().integer().min(1).max(3).optional(),
    preparedBy: Joi.alternatives().try(preparedBySchema, Joi.string().optional()),
    clientDetails: clientDetailsSchema.optional(),
    clientName: Joi.string().optional(),
    clientEmail: Joi.string().email().optional(),
    clientPhone: Joi.string().optional(),
    clientCompany: Joi.string().optional(),
    notes: Joi.string().optional(),
    sections: Joi.array().items(proposalSectionSchema).optional()
}).or('validTill', 'validUntil');

export const updateProposalSchema = Joi.object({
    title: Joi.string().optional(),
    leadId: Joi.string().optional(),
    companyId: Joi.string().optional(),
    contactId: Joi.string().optional(),
    proposalDate: Joi.date().optional(),
    validTill: Joi.date().optional(),
    validUntil: Joi.date().optional(),
    currency: Joi.string().valid('INR', 'USD', 'EUR', 'GBP').optional(),
    totalAmount: Joi.number().min(0).optional(),
    totalValue: Joi.number().min(0).optional(),
    status: Joi.string().valid('Draft', 'Sent', 'Under Review', 'Accepted', 'Rejected').optional(),
    logoUrl: Joi.alternatives().try(
        Joi.string().uri(),
        Joi.string().pattern(/^\/uploads\//)
    ).optional(),
    headerText: Joi.string().optional(),
    footerLine1: Joi.string().optional(),
    footerLine2: Joi.string().optional(),
    showPageNumbers: Joi.boolean().optional(),
    tocDepth: Joi.number().integer().min(1).max(3).optional(),
    preparedBy: Joi.alternatives().try(preparedBySchema, Joi.string().optional()),
    clientDetails: clientDetailsSchema.optional(),
    clientName: Joi.string().optional(),
    clientEmail: Joi.string().email().optional(),
    clientPhone: Joi.string().optional(),
    clientCompany: Joi.string().optional(),
    notes: Joi.string().optional(),
    sections: Joi.array().items(proposalSectionSchema).optional()
});
