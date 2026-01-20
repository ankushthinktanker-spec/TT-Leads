import { Response, NextFunction } from 'express';
import Company from '../models/company.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { createCompanySchema, updateCompanySchema } from '../validators/company.validator';
import mongoose from 'mongoose';

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
            page = 1,
            limit = 10,
            search,
            industry,
            companySize,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter
        const filter: Record<string, unknown> = {};

        if (req.user!.role !== 'Admin' && req.user!.role !== 'Manager') {
            filter.createdBy = req.user!._id;
        }

        if (status) filter.status = status;
        if (industry) filter.industry = industry;
        if (companySize) filter.companySize = companySize;

        // Search
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { gst: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (Number(page) - 1) * Number(limit);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const companies = await Company.find(filter)
            .select('name email phone website industry companySize status createdAt createdBy')
            .populate('createdBy', 'firstName lastName email')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        const total = await Company.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                companies,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
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

        const company = await Company.findById(req.params.id)
            .populate('createdBy', 'firstName lastName email');

        if (!company) {
            throw new AppError('Company not found', 404);
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
        const { error, value } = createCompanySchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const company = await Company.create({
            ...value,
            createdBy: req.user!._id
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

        const { error, value } = updateCompanySchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const company = await Company.findById(req.params.id);
        if (!company) {
            throw new AppError('Company not found', 404);
        }

        if (
            req.user!.role !== 'Admin' &&
            req.user!.role !== 'Manager' &&
            company.createdBy.toString() !== req.user!._id.toString()
        ) {
            throw new AppError('Not authorized to update this company', 403);
        }

        const updatedCompany = await Company.findByIdAndUpdate(
            req.params.id,
            { $set: value },
            { new: true, runValidators: true }
        ).populate('createdBy', 'firstName lastName email');

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

        const company = await Company.findById(req.params.id);
        if (!company) {
            throw new AppError('Company not found', 404);
        }

        if (
            req.user!.role !== 'Admin' &&
            req.user!.role !== 'Manager' &&
            company.createdBy.toString() !== req.user!._id.toString()
        ) {
            throw new AppError('Not authorized to delete this company', 403);
        }

        await company.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Company deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
