import { Response, NextFunction } from 'express';
import Contact from '../models/contact.model';
import Company from '../models/company.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { createContactSchema, updateContactSchema } from '../validators/contact.validator';
import mongoose from 'mongoose';

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
            page = 1,
            limit = 10,
            companyId,
            search,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter
        const filter: Record<string, unknown> = {};

        if (req.user!.role !== 'Admin' && req.user!.role !== 'Manager') {
            filter.createdBy = req.user!._id;
        }

        if (companyId) filter.companyId = companyId;
        if (status) filter.status = status;

        // Search
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (Number(page) - 1) * Number(limit);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const contacts = await Contact.find(filter)
            .select('firstName lastName email phone jobTitle department status companyId createdBy createdAt')
            .populate('companyId', 'name email phone')
            .populate('createdBy', 'firstName lastName email')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        const total = await Contact.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                contacts,
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

        const contact = await Contact.findById(req.params.id)
            .populate('companyId', 'name email phone website')
            .populate('createdBy', 'firstName lastName email');

        if (!contact) {
            throw new AppError('Contact not found', 404);
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
        const { error, value } = createContactSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const company = await Company.findById(value.companyId);
        if (!company) {
            throw new AppError('Company not found', 404);
        }

        const contact = await Contact.create({
            ...value,
            createdBy: req.user!._id
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

        const { error, value } = updateContactSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            throw new AppError('Contact not found', 404);
        }

        if (
            req.user!.role !== 'Admin' &&
            req.user!.role !== 'Manager' &&
            contact.createdBy.toString() !== req.user!._id.toString()
        ) {
            throw new AppError('Not authorized to update this contact', 403);
        }

        if (value.companyId) {
            const company = await Company.findById(value.companyId);
            if (!company) {
                throw new AppError('Company not found', 404);
            }
        }

        const updatedContact = await Contact.findByIdAndUpdate(
            req.params.id,
            { $set: value },
            { new: true, runValidators: true }
        )
            .populate('companyId', 'name email phone')
            .populate('createdBy', 'firstName lastName email');

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

        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            throw new AppError('Contact not found', 404);
        }

        if (
            req.user!.role !== 'Admin' &&
            req.user!.role !== 'Manager' &&
            contact.createdBy.toString() !== req.user!._id.toString()
        ) {
            throw new AppError('Not authorized to delete this contact', 403);
        }

        await contact.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Contact deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
