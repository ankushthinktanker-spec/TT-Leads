import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { createInvoiceSchema, updateInvoiceSchema } from '../validators/invoice.validator';
import { buildPaginationMeta, getPaginationParams } from '../utils/pagination';
import { applySearchFilter, getDateRangeParam, getSearchTerm, getStringParam, getTagsParam } from '../utils/queryFilters';
import { createInvoice, deleteInvoice, getInvoiceById, listInvoices, updateInvoice } from '../services/invoice.service';
import type { IInvoice } from '../models/invoice.model';
import { writeAuditLog } from '../services/audit.service';

type InvoiceFilter = Record<string, unknown>;

const buildInvoiceFilter = (req: AuthRequest): InvoiceFilter => {
    const filter: InvoiceFilter = { tenantId: req.tenantId! };
    const user = req.user!;

    if (user.role !== 'Admin' && user.role !== 'Manager') {
        filter.$or = [{ createdBy: user._id }, { ownerId: user._id }];
    }

    const status = getStringParam(req.query as Record<string, unknown>, 'status');
    if (status) filter.status = status;

    const ownerId = getStringParam(req.query as Record<string, unknown>, 'ownerId');
    if (ownerId) filter.ownerId = ownerId;

    const companyId = getStringParam(req.query as Record<string, unknown>, 'companyId');
    if (companyId) filter.companyId = companyId;

    const contractId = getStringParam(req.query as Record<string, unknown>, 'contractId');
    if (contractId) filter.contractId = contractId;

    const dealId = getStringParam(req.query as Record<string, unknown>, 'dealId');
    if (dealId) filter.dealId = dealId;

    const ratingRaw = getStringParam(req.query as Record<string, unknown>, 'rating');
    if (ratingRaw && !Number.isNaN(Number(ratingRaw))) {
        filter.rating = Number(ratingRaw);
    }

    const tags = getTagsParam(req.query as Record<string, unknown>);
    if (tags) {
        filter.tags = { $in: tags };
    }

    const dateRange = getDateRangeParam(req.query as Record<string, unknown>);
    if (dateRange) {
        filter.createdAt = dateRange;
    }

    const searchTerm = getSearchTerm(req.query as Record<string, unknown>);
    applySearchFilter(filter, searchTerm, ['invoiceNumber', 'status']);

    return filter;
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
export const getInvoices = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const filter = buildInvoiceFilter(req);
        const { items, total } = await listInvoices(req.tenantId!, filter as Record<string, unknown>, sort, skip, limit);

        res.status(200).json({
            success: true,
            data: {
                items,
                meta: buildPaginationMeta(page, limit, total)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get invoice
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid invoice identifier', 400);
        }

        const invoice = await getInvoiceById(req.tenantId!, req.params.id);
        if (!invoice) {
            throw new AppError('Invoice not found or unauthorized access', 404);
        }

        res.status(200).json({ success: true, data: { invoice } });
    } catch (error) {
        next(error);
    }
};

// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private
export const createInvoiceHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { error, value } = createInvoiceSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const payload: Partial<IInvoice> = {
            ...value,
            createdBy: req.user!._id
        };

        const invoice = await createInvoice(req.tenantId!, payload);

        // 📍 SECURITY: Audit Log Creation
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'CREATE',
            entityType: 'Invoice',
            entityId: invoice._id.toString(),
            ip: req.ip,
            changes: invoice.toObject() as any
        });

        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            data: { invoice }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
export const updateInvoiceHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid invoice identifier', 400);
        }

        const { error, value } = updateInvoiceSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const beforeUpdate = await getInvoiceById(req.tenantId!, req.params.id);
        if (!beforeUpdate) {
            throw new AppError('Invoice not found or unauthorized access', 404);
        }

        const invoice = await updateInvoice(req.tenantId!, req.params.id, value);
        if (!invoice) {
            throw new AppError('Update failed: Invoice not found', 404);
        }

        // 📍 SECURITY: Audit Log Update
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'UPDATE',
            entityType: 'Invoice',
            entityId: invoice._id.toString(),
            ip: req.ip,
            changes: { before: beforeUpdate.toObject() as any, after: invoice.toObject() as any }
        });

        res.status(200).json({
            success: true,
            message: 'Invoice updated successfully',
            data: { invoice }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
export const deleteInvoiceHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid invoice identifier', 400);
        }

        const invoice = await getInvoiceById(req.tenantId!, req.params.id);
        if (!invoice) {
            throw new AppError('Invoice not found or unauthorized access', 404);
        }

        // 📍 SECURITY: Audit Log Delete
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'DELETE',
            entityType: 'Invoice',
            entityId: invoice._id.toString(),
            ip: req.ip,
            changes: invoice.toObject() as any
        });

        const deleted = await deleteInvoice(req.tenantId!, req.params.id);
        if (!deleted) {
            throw new AppError('Delete failed', 404);
        }

        res.status(200).json({ success: true, message: 'Invoice deleted successfully' });
    } catch (error) {
        next(error);
    }
};
