import { Response, NextFunction } from 'express';
import Company from '../models/company.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { Roles } from '../constants/roles';
import { createCompanySchema, updateCompanySchema } from '../validators/company.validator';
import mongoose from 'mongoose';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';
import { getSearchTerm, applySearchFilter } from '../utils/queryFilters';
import { writeAuditLog } from '../services/audit.service';

const toAuditChanges = (value: { toObject: () => unknown }): Record<string, unknown> =>
    value.toObject() as unknown as Record<string, unknown>;

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private
export const getCompanies = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            industry,
            companySize,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter - Critical Tenant Isolation
        const filter: Record<string, unknown> = { tenantId: req.tenantId! };

        if (req.user!.role !== Roles.ADMIN && req.user!.role !== Roles.MANAGER) {
            filter.createdBy = req.user!._id;
        }

        if (status) filter.status = status;
        if (industry) filter.industry = industry;
        if (companySize) filter.companySize = companySize;

        const searchTerm = getSearchTerm(req.query as Record<string, unknown>);
        applySearchFilter(filter, searchTerm, ['name', 'email', 'phone']);

        // Pagination
        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const companies = await Company.find(filter)
            .select('name email phone website industry companySize status createdAt createdBy')
            .populate('createdBy', 'firstName lastName email')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Company.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                data: companies,
                meta: buildPaginationMeta(page, limit, total)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Private
export const getCompany = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid company identifier', 400);
        }

        const company = await Company.findOne({ _id: req.params.id, tenantId: req.tenantId! })
            .populate('createdBy', 'firstName lastName email');

        if (!company) {
            throw new AppError('Company not found or unauthorized access', 404);
        }

        res.status(200).json({
            success: true,
            data: { company }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new company
// @route   POST /api/companies
// @access  Private
export const createCompany = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { error, value } = createCompanySchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const company = await Company.create({
            ...value,
            tenantId: req.tenantId!,
            createdBy: req.user!._id
        });

        // 📍 SECURITY: Audit Log Creation
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'CREATE',
            entityType: 'Company',
            entityId: company._id.toString(),
            ip: req.ip,
            changes: toAuditChanges(company)
        });

        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            data: { company }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private
export const updateCompany = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid company identifier', 400);
        }

        const { error, value } = updateCompanySchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const company = await Company.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!company) {
            throw new AppError('Company not found or unauthorized access', 404);
        }

        const beforeUpdate = toAuditChanges(company);

        if (
            req.user!.role !== Roles.ADMIN &&
            req.user!.role !== Roles.MANAGER &&
            company.createdBy.toString() !== req.user!._id.toString()
        ) {
            throw new AppError('Not authorized to update this company', 403);
        }

        const updatedCompany = await Company.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId! },
            { $set: value },
            { new: true, runValidators: true }
        ).populate('createdBy', 'firstName lastName email');

        if (!updatedCompany) {
            throw new AppError('Update failed: Company not found', 404);
        }

        // 📍 SECURITY: Audit Log Update
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'UPDATE',
            entityType: 'Company',
            entityId: updatedCompany._id.toString(),
            ip: req.ip,
            changes: { before: beforeUpdate, after: toAuditChanges(updatedCompany) }
        });

        res.status(200).json({
            success: true,
            message: 'Company updated successfully',
            data: { company: updatedCompany }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete company
// @route   DELETE /api/companies/:id
// @access  Private (Admin/Manager)
export const deleteCompany = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid company identifier', 400);
        }

        const company = await Company.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!company) {
            throw new AppError('Company not found or unauthorized access', 404);
        }

        if (
            req.user!.role !== Roles.ADMIN &&
            req.user!.role !== Roles.MANAGER &&
            company.createdBy.toString() !== req.user!._id.toString()
        ) {
            throw new AppError('Not authorized to delete this company', 403);
        }

        // 📍 SECURITY: Audit Log Delete
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'DELETE',
            entityType: 'Company',
            entityId: company._id.toString(),
            ip: req.ip,
            changes: toAuditChanges(company)
        });

        await company.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Company deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const getCompanyListForInvoice = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const companies = await Company.find({ tenantId: req.tenantId!, status: 'Active' })
            .select('name gst address stateCode city phone email')
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            data: { companies }
        });
    } catch (error) {
        next(error);
    }
};
