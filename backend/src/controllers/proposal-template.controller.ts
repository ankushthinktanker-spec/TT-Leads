import { Response, NextFunction } from 'express';
import ProposalTemplate from '../models/proposal-template.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

// @desc    Get all proposal templates
// @route   GET /api/proposal-templates
// @access  Private
export const getProposalTemplates = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { category, isActive } = req.query;

        const filter: Record<string, unknown> = { tenantId: req.tenantId! };
        if (category) filter.category = category;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const templates = await ProposalTemplate.find(filter)
            .populate('createdBy', 'firstName lastName email')
            .sort({ isDefault: -1, name: 1 });

        res.status(200).json({
            success: true,
            data: { templates }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single proposal template
// @route   GET /api/proposal-templates/:id
// @access  Private
export const getProposalTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const template = await ProposalTemplate.findOne({ _id: req.params.id, tenantId: req.tenantId! })
            .populate('createdBy', 'firstName lastName email');

        if (!template) {
            throw new AppError('Template not found or unauthorized access', 404);
        }

        res.status(200).json({
            success: true,
            data: { template }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create proposal template
// @route   POST /api/proposal-templates
// @access  Private (Admin/Manager)
export const createProposalTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const template = await ProposalTemplate.create({
            ...req.body,
            tenantId: req.tenantId!,
            createdBy: req.user!._id
        });

        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            data: { template }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update proposal template
// @route   PUT /api/proposal-templates/:id
// @access  Private (Admin/Manager)
export const updateProposalTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const template = await ProposalTemplate.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!template) {
            throw new AppError('Template not found or unauthorized access', 404);
        }

        const updatedTemplate = await ProposalTemplate.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId! },
            { $set: req.body },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Template updated successfully',
            data: { template: updatedTemplate }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete proposal template
// @route   DELETE /api/proposal-templates/:id
// @access  Private (Admin)
export const deleteProposalTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const template = await ProposalTemplate.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!template) {
            throw new AppError('Template not found or unauthorized access', 404);
        }

        await template.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Template deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
