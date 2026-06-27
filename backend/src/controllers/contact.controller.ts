import { Response, NextFunction } from 'express';
import Contact from '../models/contact.model';
import Company from '../models/company.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { Roles } from '../constants/roles';
import { createContactSchema, updateContactSchema } from '../validators/contact.validator';
import mongoose from 'mongoose';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';
import { getSearchTerm, applySearchFilter } from '../utils/queryFilters';
import { writeAuditLog } from '../services/audit.service';

const toAuditChanges = (value: { toObject: () => unknown }): Record<string, unknown> =>
    value.toObject() as unknown as Record<string, unknown>;

// @desc    Get all contacts
// @route   GET /api/contacts
// @access  Private
export const getContacts = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            companyId,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter - Critical Tenant Isolation
        const filter: Record<string, unknown> = { tenantId: req.tenantId! };

        if (req.user!.role !== Roles.ADMIN && req.user!.role !== Roles.MANAGER) {
            filter.createdBy = req.user!._id;
        }

        if (companyId) filter.companyId = companyId;
        if (status) filter.status = status;

        const searchTerm = getSearchTerm(req.query as Record<string, unknown>);
        applySearchFilter(filter, searchTerm, ['firstName', 'lastName', 'email', 'phone']);

        // Pagination
        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const contacts = await Contact.find(filter)
            .select('firstName lastName email phone jobTitle department status companyId createdBy createdAt')
            .populate({
                path: 'companyId',
                match: { tenantId: req.tenantId! },
                select: 'name email phone'
            })
            .populate('createdBy', 'firstName lastName email')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Contact.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                data: contacts,
                meta: buildPaginationMeta(page, limit, total)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single contact
// @route   GET /api/contacts/:id
// @access  Private
export const getContact = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid contact identifier', 400);
        }

        const contact = await Contact.findOne({ _id: req.params.id, tenantId: req.tenantId! })
            .populate({
                path: 'companyId',
                match: { tenantId: req.tenantId! },
                select: 'name email phone website'
            })
            .populate('createdBy', 'firstName lastName email');

        if (!contact) {
            throw new AppError('Contact not found or unauthorized access', 404);
        }

        res.status(200).json({
            success: true,
            data: { contact }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new contact
// @route   POST /api/contacts
// @access  Private
export const createContact = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { error, value } = createContactSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const company = await Company.findOne({ _id: value.companyId, tenantId: req.tenantId! });
        if (!company) {
            throw new AppError('Company not found in reachable organization', 404);
        }

        const contact = await Contact.create({
            ...value,
            tenantId: req.tenantId!,
            createdBy: req.user!._id
        });

        // 📍 SECURITY: Audit Log Creation
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'CREATE',
            entityType: 'Contact',
            entityId: contact._id.toString(),
            ip: req.ip,
            changes: toAuditChanges(contact)
        });

        res.status(201).json({
            success: true,
            message: 'Contact created successfully',
            data: { contact }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update contact
// @route   PUT /api/contacts/:id
// @access  Private
export const updateContact = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid contact identifier', 400);
        }

        const { error, value } = updateContactSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const contact = await Contact.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!contact) {
            throw new AppError('Contact not found or unauthorized access', 404);
        }

        const beforeUpdate = toAuditChanges(contact);

        if (
            req.user!.role !== Roles.ADMIN &&
            req.user!.role !== Roles.MANAGER &&
            contact.createdBy.toString() !== req.user!._id.toString()
        ) {
            throw new AppError('Not authorized to update this contact', 403);
        }

        if (value.companyId) {
            const company = await Company.findOne({ _id: value.companyId, tenantId: req.tenantId! });
            if (!company) {
                throw new AppError('Company not found in reachable organization', 404);
            }
        }

        const updatedContact = await Contact.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId! },
            { $set: value },
            { new: true, runValidators: true }
        )
            .populate({
                path: 'companyId',
                match: { tenantId: req.tenantId! },
                select: 'name email phone'
            })
            .populate('createdBy', 'firstName lastName email');

        if (!updatedContact) {
            throw new AppError('Update failed: Contact not found', 404);
        }

        // 📍 SECURITY: Audit Log Update
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'UPDATE',
            entityType: 'Contact',
            entityId: updatedContact._id.toString(),
            ip: req.ip,
            changes: { before: beforeUpdate, after: toAuditChanges(updatedContact) }
        });

        res.status(200).json({
            success: true,
            message: 'Contact updated successfully',
            data: { contact: updatedContact }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete contact
// @route   DELETE /api/contacts/:id
// @access  Private
export const deleteContact = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid contact identifier', 400);
        }

        const contact = await Contact.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!contact) {
            throw new AppError('Contact not found or unauthorized access', 404);
        }

        if (
            req.user!.role !== Roles.ADMIN &&
            req.user!.role !== Roles.MANAGER &&
            contact.createdBy.toString() !== req.user!._id.toString()
        ) {
            throw new AppError('Not authorized to delete this contact', 403);
        }

        // 📍 SECURITY: Audit Log Delete
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'DELETE',
            entityType: 'Contact',
            entityId: contact._id.toString(),
            ip: req.ip,
            changes: toAuditChanges(contact)
        });

        await contact.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Contact deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
