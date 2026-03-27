import Joi from 'joi';

export const createInvoiceSchema = Joi.object({
    invoiceNumber: Joi.string().trim().required(),
    companyId: Joi.string().required(),
    dealId: Joi.string().optional(),
    contractId: Joi.string().optional(),
    ownerId: Joi.string().optional(),
    status: Joi.string().optional(),
    issueDate: Joi.date().optional(),
    dueDate: Joi.date().optional(),
    paidDate: Joi.date().optional(),
    amount: Joi.number().optional(),
    currency: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    rating: Joi.number().min(1).max(5).optional()
});

export const updateInvoiceSchema = Joi.object({
    invoiceNumber: Joi.string().trim().optional(),
    companyId: Joi.string().optional(),
    dealId: Joi.string().optional(),
    contractId: Joi.string().optional(),
    ownerId: Joi.string().optional(),
    status: Joi.string().optional(),
    issueDate: Joi.date().optional(),
    dueDate: Joi.date().optional(),
    paidDate: Joi.date().optional(),
    amount: Joi.number().optional(),
    currency: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    rating: Joi.number().min(1).max(5).optional()
});
