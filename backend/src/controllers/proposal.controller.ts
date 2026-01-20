import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import Proposal from '../models/proposal.model';
import ProposalSection from '../models/proposal-section.model';
import ProposalTemplate from '../models/proposal-template.model';
import Company from '../models/company.model';
import Lead from '../models/lead.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { createProposalSchema, updateProposalSchema } from '../validators/proposal.validator';
import {
    createProposalSectionSchema,
    updateProposalSectionSchema,
    reorderProposalSectionsSchema
} from '../validators/proposal-section.validator';
import mongoose from 'mongoose';
import sanitizeHtml from 'sanitize-html';

const normalizeSectionType = (contentType?: string): 'RichText' | 'Table' | 'Mixed' => {
    if (!contentType) return 'RichText';
    const normalized = contentType.toLowerCase();
    if (normalized === 'table') return 'Table';
    if (normalized === 'mixed') return 'Mixed';
    return 'RichText';
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sanitizeSectionContent = (content: string): string => {
    if (!content) return '';
    return sanitizeHtml(content, {
        allowedTags: [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
            'ul', 'ol', 'li',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
            'div', 'span', 'a', 'img', 'hr'
        ],
        allowedAttributes: {
            a: ['href', 'target', 'rel', 'title'],
            img: ['src', 'alt', 'title', 'width', 'height'],
            '*': ['class', 'id', 'colspan', 'rowspan']
        },
        allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
        allowProtocolRelative: false
    });
};

const ensureHeadingIds = (content: string, sectionId: string): string => {
    if (!content) return content;
    const htmlHeadingRegex = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;
    let headingIndex = 0;

    return content.replace(htmlHeadingRegex, (fullMatch, level, attrs, inner) => {
        const idMatch = attrs.match(/\sid=["']([^"']+)["']/i);
        if (idMatch?.[1]) {
            return fullMatch;
        }
        const id = `${sectionId}-h${level}-${headingIndex++}`;
        return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
    });
};

type SectionInput = {
    localId?: string;
    content?: string;
    order?: number;
    title?: string;
    contentType?: string;
    includeInTOC?: boolean;
    isVisible?: boolean;
};

type ProposalPayload = Record<string, unknown> & {
    companyId?: string;
    clientCompany?: string;
    clientDetails?: { companyName?: string };
    leadId?: string;
    preparedBy?: {
        name?: string;
        company?: string;
        email?: string;
        phone?: string;
    } | string;
};

const mapSections = (sections: SectionInput[], proposalId: string) => {
    return sections.map((section, index) => {
        const localId = section.localId || `section-${proposalId}-${index}`;
        const safeContent = sanitizeSectionContent(section.content || '');
        return {
            proposalId,
            sectionOrder: typeof section.order === 'number' ? section.order : index,
            sectionTitle: section.title,
            sectionType: normalizeSectionType(section.contentType),
            content: ensureHeadingIds(safeContent, localId),
            includeInIndex: section.includeInTOC !== false,
            isVisible: section.isVisible !== false,
            localId
        };
    });
};

const resolveCompanyId = async (
    payload: ProposalPayload,
    userId: string
): Promise<{ companyId?: string; clientCompanyName?: string }> => {
    let companyId = payload.companyId;
    let clientCompanyName = payload.clientCompany || payload.clientDetails?.companyName;

    if (!companyId && payload.leadId) {
        const lead = await Lead.findById(payload.leadId);
        if (lead) {
            if (!clientCompanyName && lead.company) {
                clientCompanyName = lead.company;
            }
            if (lead.companyId) {
                companyId = lead.companyId.toString();
            }
        }
    }

    if (!companyId && clientCompanyName) {
        const existingCompany = await Company.findOne({
            name: { $regex: new RegExp(`^${escapeRegExp(clientCompanyName)}$`, 'i') }
        });
        if (existingCompany) {
            companyId = existingCompany._id.toString();
        } else {
            const newCompany = await Company.create({
                name: clientCompanyName,
                createdBy: userId
            });
            companyId = newCompany._id.toString();
        }
    }

    return { companyId, clientCompanyName };
};

const buildPreparedBy = (
    payload: ProposalPayload,
    user: NonNullable<AuthRequest['user']>
) => {
    if (payload.preparedBy && typeof payload.preparedBy === 'object') {
        return payload.preparedBy;
    }

    const name = typeof payload.preparedBy === 'string' && payload.preparedBy.trim()
        ? payload.preparedBy.trim()
        : `${user.firstName} ${user.lastName}`;

    return {
        name,
        company: process.env.COMPANY_NAME || 'ThinkTanker'
    };
};

const canManageProposal = (
    proposal: { createdBy?: { toString(): string } | string; preparedBy?: { email?: string } },
    user: NonNullable<AuthRequest['user']>
) => {
    return (
        user.role === 'Admin' ||
        user.role === 'Manager' ||
        proposal.createdBy?.toString() === user._id.toString()
    );
};

// @desc    Get all proposals
// @route   GET /api/proposals
// @access  Private
export const getProposals = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            companyId,
            leadId,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter
        const filter: Record<string, unknown> = {};

        if (req.user!.role !== 'Admin' && req.user!.role !== 'Manager') {
            filter.createdBy = req.user!._id;
        }

        if (status) filter.status = status;
        if (companyId) filter.companyId = companyId;
        if (leadId) filter.leadId = leadId;

        // Search
        if (search) {
            filter.$or = [
                { proposalNumber: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { 'clientDetails.companyName': { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (Number(page) - 1) * Number(limit);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const proposals = await Proposal.find(filter)
            .select('proposalNumber title status proposalDate validTill totalAmount currency companyId leadId contactId createdBy createdAt updatedAt generatedPdfPath')
            .populate('companyId', 'name email phone')
            .populate('leadId', 'firstName lastName email')
            .populate('contactId', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        const total = await Proposal.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                proposals,
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

// @desc    Get single proposal with sections
// @route   GET /api/proposals/:id
// @access  Private
export const getProposal = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid proposal identifier', 400);
        }

        const proposal = await Proposal.findById(req.params.id)
            .populate('companyId')
            .populate('leadId')
            .populate('contactId')
            .populate('createdBy', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName email');

        if (!proposal) {
            throw new AppError('Proposal not found', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to view this proposal', 403);
        }

        // Get sections
        const sections = await ProposalSection.find({ proposalId: req.params.id })
            .sort({ sectionOrder: 1 });

        res.status(200).json({
            success: true,
            data: { proposal, sections }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new proposal
// @route   POST /api/proposals
// @access  Private
export const createProposal = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { error, value } = createProposalSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const { companyId, clientCompanyName } = await resolveCompanyId(value, req.user!._id.toString());
        if (!companyId) {
            throw new AppError('Company is required for proposal', 400);
        }

        const clientDetails = value.clientDetails || {
            companyName: clientCompanyName || value.clientCompany,
            contactPerson: value.clientName,
            email: value.clientEmail,
            phone: value.clientPhone
        };

        if (!clientDetails?.companyName) {
            throw new AppError('Client company is required', 400);
        }

        const proposalData = {
            title: value.title,
            leadId: value.leadId,
            companyId,
            contactId: value.contactId,
            proposalDate: value.proposalDate || new Date(),
            validTill: value.validTill || value.validUntil,
            currency: value.currency,
            totalAmount: value.totalAmount ?? value.totalValue,
            status: value.status,
            logoUrl: value.logoUrl,
            headerText: value.headerText,
            footerLine1: value.footerLine1,
            footerLine2: value.footerLine2,
            showPageNumbers: value.showPageNumbers,
            tocDepth: value.tocDepth,
            preparedBy: buildPreparedBy(value, req.user!),
            clientDetails,
            notes: value.notes,
            createdBy: req.user!._id
        };

        const proposal = await Proposal.create({
            ...proposalData
        });

        if (Array.isArray(value.sections) && value.sections.length > 0) {
            const mappedSections = mapSections(value.sections, proposal._id.toString());
            await ProposalSection.insertMany(mappedSections);
        }

        res.status(201).json({
            success: true,
            message: 'Proposal created successfully',
            data: { proposal }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create proposal from template
// @route   POST /api/proposals/from-template/:templateId
// @access  Private
export const createProposalFromTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { error, value } = createProposalSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const template = await ProposalTemplate.findById(req.params.templateId);
        if (!template) {
            throw new AppError('Template not found', 404);
        }

        const { companyId, clientCompanyName } = await resolveCompanyId(value, req.user!._id.toString());
        if (!companyId) {
            throw new AppError('Company is required for proposal', 400);
        }

        const clientDetails = value.clientDetails || {
            companyName: clientCompanyName || value.clientCompany,
            contactPerson: value.clientName,
            email: value.clientEmail,
            phone: value.clientPhone
        };

        if (!clientDetails?.companyName) {
            throw new AppError('Client company is required', 400);
        }

        const proposalData = {
            title: value.title,
            leadId: value.leadId,
            companyId,
            contactId: value.contactId,
            proposalDate: value.proposalDate || new Date(),
            validTill: value.validTill || value.validUntil,
            currency: value.currency,
            totalAmount: value.totalAmount ?? value.totalValue,
            status: value.status,
            logoUrl: value.logoUrl,
            headerText: value.headerText,
            footerLine1: value.footerLine1,
            footerLine2: value.footerLine2,
            showPageNumbers: value.showPageNumbers,
            tocDepth: value.tocDepth,
            preparedBy: buildPreparedBy(value, req.user!),
            clientDetails,
            notes: value.notes,
            createdBy: req.user!._id
        };

        // Create proposal
        const proposal = await Proposal.create({
            ...proposalData
        });

        // Create sections from template
        const sections = template.defaultSections.map(section => ({
            proposalId: proposal._id,
            sectionOrder: section.sectionOrder,
            sectionTitle: section.sectionTitle,
            sectionType: section.sectionType,
            content: ensureHeadingIds(sanitizeSectionContent(section.content || ''), `section-${proposal._id}-${section.sectionOrder}`),
            includeInIndex: section.includeInIndex,
            localId: `section-${proposal._id}-${section.sectionOrder}`
        }));

        await ProposalSection.insertMany(sections);

        // Update template usage
        template.usageCount += 1;
        template.lastUsedAt = new Date();
        await template.save();

        res.status(201).json({
            success: true,
            message: 'Proposal created from template successfully',
            data: { proposal }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update proposal
// @route   PUT /api/proposals/:id
// @access  Private
export const updateProposal = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid proposal identifier', 400);
        }

        const { error, value } = updateProposalSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const proposal = await Proposal.findById(req.params.id);
        if (!proposal) {
            throw new AppError('Proposal not found', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to update this proposal', 403);
        }

        const updateData: Record<string, unknown> = { ...value };
        delete updateData.sections;
        delete updateData.validUntil;
        delete updateData.totalValue;
        delete updateData.clientName;
        delete updateData.clientEmail;
        delete updateData.clientPhone;
        delete updateData.clientCompany;

        if (value.validUntil) {
            updateData.validTill = value.validUntil;
        }

        if (typeof value.totalValue === 'number') {
            updateData.totalAmount = value.totalValue;
        }

        if (value.preparedBy) {
            updateData.preparedBy = buildPreparedBy(value, req.user!);
        }

        if (
            value.clientDetails ||
            value.clientName ||
            value.clientEmail ||
            value.clientPhone ||
            value.clientCompany
        ) {
            const existing = proposal.clientDetails || {};
            const companyName = value.clientCompany || value.clientDetails?.companyName || existing.companyName;

            if (!companyName) {
                throw new AppError('Client company is required', 400);
            }

            updateData.clientDetails = {
                companyName,
                contactPerson: value.clientName || value.clientDetails?.contactPerson || existing.contactPerson,
                designation: value.clientDetails?.designation || existing.designation,
                email: value.clientEmail || value.clientDetails?.email || existing.email,
                phone: value.clientPhone || value.clientDetails?.phone || existing.phone,
                address: value.clientDetails?.address || existing.address
            };
        }

        if ((value.leadId || value.clientCompany || value.clientDetails?.companyName) && !value.companyId) {
            const { companyId } = await resolveCompanyId(value, req.user!._id.toString());
            if (companyId) {
                updateData.companyId = companyId;
            }
        }

        const updatedProposal = await Proposal.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (Array.isArray(value.sections)) {
            await ProposalSection.deleteMany({ proposalId: req.params.id });
            if (value.sections.length > 0) {
                const mappedSections = mapSections(value.sections, req.params.id);
                await ProposalSection.insertMany(mappedSections);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Proposal updated successfully',
            data: { proposal: updatedProposal }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete proposal
// @route   DELETE /api/proposals/:id
// @access  Private (Admin/Manager)
export const deleteProposal = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid proposal identifier', 400);
        }

        const proposal = await Proposal.findById(req.params.id);
        if (!proposal) {
            throw new AppError('Proposal not found', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to delete this proposal', 403);
        }

        // Delete associated sections
        await ProposalSection.deleteMany({ proposalId: req.params.id });

        await proposal.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Proposal deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add section to proposal
// @route   POST /api/proposals/:id/sections
// @access  Private
export const addSection = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid proposal identifier', 400);
        }

        const { error, value } = createProposalSectionSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const proposal = await Proposal.findById(req.params.id);
        if (!proposal) {
            throw new AppError('Proposal not found', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to modify this proposal', 403);
        }

        const sectionType = value.sectionType || normalizeSectionType(value.contentType);
        const sectionTitle = value.sectionTitle || value.title || 'Section';
        const sectionOrder = typeof value.sectionOrder === 'number'
            ? value.sectionOrder
            : typeof value.order === 'number'
                ? value.order
                : 0;

        const localId = value.localId || `section-${req.params.id}-${sectionOrder}`;
        const section = await ProposalSection.create({
            proposalId: req.params.id,
            sectionTitle,
            sectionType,
            sectionOrder,
            content: ensureHeadingIds(value.content, localId),
            includeInIndex: value.includeInIndex ?? value.includeInTOC ?? true,
            isVisible: value.isVisible ?? true,
            localId
        });

        res.status(201).json({
            success: true,
            message: 'Section added successfully',
            data: { section }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update section
// @route   PUT /api/proposals/:id/sections/:sectionId
// @access  Private
export const updateSection = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.sectionId)) {
            throw new AppError('Invalid identifier', 400);
        }

        const { error, value } = updateProposalSectionSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const section = await ProposalSection.findById(req.params.sectionId);
        if (!section) {
            throw new AppError('Section not found', 404);
        }

        const proposal = await Proposal.findById(req.params.id);
        if (!proposal) {
            throw new AppError('Proposal not found', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to modify this proposal', 403);
        }

        if (section.proposalId.toString() !== req.params.id) {
            throw new AppError('Section does not belong to this proposal', 400);
        }

        const updateData: Record<string, unknown> = {
            ...value
        };

        if (value.title) updateData.sectionTitle = value.title;
        if (value.contentType) updateData.sectionType = normalizeSectionType(value.contentType);
        if (typeof value.order === 'number') updateData.sectionOrder = value.order;
        if (typeof value.includeInTOC === 'boolean') updateData.includeInIndex = value.includeInTOC;
        if (!section.localId && value.localId) updateData.localId = value.localId;
        if (value.content) {
            const contentLocalId = section.localId || `section-${req.params.id}-${section.sectionOrder}`;
            const safeContent = sanitizeSectionContent(value.content);
            updateData.content = ensureHeadingIds(safeContent, contentLocalId);
        }

        delete updateData.title;
        delete updateData.contentType;
        delete updateData.order;
        delete updateData.includeInTOC;

        const updatedSection = await ProposalSection.findByIdAndUpdate(
            req.params.sectionId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Section updated successfully',
            data: { section: updatedSection }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete section
// @route   DELETE /api/proposals/:id/sections/:sectionId
// @access  Private
export const deleteSection = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.sectionId)) {
            throw new AppError('Invalid identifier', 400);
        }

        const section = await ProposalSection.findById(req.params.sectionId);
        if (!section) {
            throw new AppError('Section not found', 404);
        }

        const proposal = await Proposal.findById(req.params.id);
        if (!proposal) {
            throw new AppError('Proposal not found', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to modify this proposal', 403);
        }

        if (section.proposalId.toString() !== req.params.id) {
            throw new AppError('Section does not belong to this proposal', 400);
        }

        await section.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Section deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reorder sections
// @route   POST /api/proposals/:id/sections/reorder
// @access  Private
export const reorderSections = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid proposal identifier', 400);
        }

        const { error, value } = reorderProposalSectionsSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const proposal = await Proposal.findById(req.params.id);
        if (!proposal) {
            throw new AppError('Proposal not found', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to modify this proposal', 403);
        }

        const { sectionOrders } = value; // Array of { sectionId, newOrder }

        if (!Array.isArray(sectionOrders)) {
            throw new AppError('Invalid section orders format', 400);
        }

        // Update each section's order
        const updatePromises = sectionOrders.map(({ sectionId, newOrder }) =>
            ProposalSection.findByIdAndUpdate(sectionId, { sectionOrder: newOrder })
        );

        await Promise.all(updatePromises);

        res.status(200).json({
            success: true,
            message: 'Sections reordered successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Duplicate proposal (create new version)
// @route   POST /api/proposals/:id/duplicate
// @access  Private
export const duplicateProposal = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid proposal identifier', 400);
        }

        const originalProposal = await Proposal.findById(req.params.id);
        if (!originalProposal) {
            throw new AppError('Proposal not found', 404);
        }

        if (!canManageProposal(originalProposal, req.user!)) {
            throw new AppError('Not authorized to duplicate this proposal', 403);
        }

        // Create new proposal with incremented version
        const newProposal = await Proposal.create({
            ...originalProposal.toObject(),
            _id: undefined,
            proposalNumber: undefined, // Will be auto-generated
            version: originalProposal.version + 1,
            status: 'Draft',
            createdBy: req.user!._id,
            generatedPdfPath: undefined,
            lastGeneratedAt: undefined
        });

        // Copy sections
        const originalSections = await ProposalSection.find({ proposalId: req.params.id });
        const newSections = originalSections.map(section => ({
            ...section.toObject(),
            _id: undefined,
            proposalId: newProposal._id
        }));

        await ProposalSection.insertMany(newSections);

        res.status(201).json({
            success: true,
            message: 'Proposal duplicated successfully',
            data: { proposal: newProposal }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate PDF
// @route   POST /api/proposals/:id/generate-pdf
// @access  Private
export const generatePDF = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid proposal identifier', 400);
        }

        const proposal = await Proposal.findById(req.params.id)
            .populate('companyId')
            .populate('contactId');

        if (!proposal) {
            throw new AppError('Proposal not found', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to generate this proposal', 403);
        }

        const sections = await ProposalSection.find({ proposalId: req.params.id })
            .sort({ sectionOrder: 1 });

        // Import PDF service dynamically to avoid circular dependencies
        const { PDFService } = await import('../services/pdf.service');

        // Generate PDF
        const pdfPath = await PDFService.generateProposalPDF({
            proposal,
            sections
        });

        // Update proposal with PDF path
        proposal.generatedPdfPath = pdfPath;
        proposal.lastGeneratedAt = new Date();
        try {
            const absolutePath = path.resolve(__dirname, '../../', pdfPath.replace(/^\//, ''));
            const stats = await fs.stat(absolutePath);
            proposal.generatedPdfSize = stats.size;
        } catch {
            proposal.generatedPdfSize = undefined;
        }
        await proposal.save();

        res.status(200).json({
            success: true,
            message: 'PDF generated successfully',
            data: {
                proposal,
                pdfUrl: pdfPath
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Download generated PDF
// @route   GET /api/proposals/:id/download
// @access  Private
export const downloadPDF = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid proposal identifier', 400);
        }

        const proposal = await Proposal.findById(req.params.id)
            .populate('companyId')
            .populate('contactId');

        if (!proposal) {
            throw new AppError('Proposal not found', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to download this proposal', 403);
        }

        const sections = await ProposalSection.find({ proposalId: req.params.id })
            .sort({ sectionOrder: 1 });

        const { PDFService } = await import('../services/pdf.service');

        let pdfPath = proposal.generatedPdfPath;
        if (!pdfPath) {
            pdfPath = await PDFService.generateProposalPDF({
                proposal,
                sections
            });
            proposal.generatedPdfPath = pdfPath;
            proposal.lastGeneratedAt = new Date();
            try {
                const absolutePath = path.resolve(__dirname, '../../', pdfPath.replace(/^\//, ''));
                const stats = await fs.stat(absolutePath);
                proposal.generatedPdfSize = stats.size;
            } catch {
                proposal.generatedPdfSize = undefined;
            }
            await proposal.save();
        }

        if (!pdfPath) {
            throw new AppError('PDF not available', 404);
        }

        const absolutePath = path.resolve(__dirname, '../../', pdfPath.replace(/^\//, ''));
        res.download(absolutePath, `${proposal.proposalNumber}.pdf`);
    } catch (error) {
        next(error);
    }
};

// @desc    Stream generated PDF inline (preview)
// @route   GET /api/proposals/:id/pdf
// @access  Private
export const streamPDF = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid proposal identifier', 400);
        }

        const proposal = await Proposal.findById(req.params.id)
            .populate('companyId')
            .populate('contactId');

        if (!proposal) {
            throw new AppError('Proposal not found', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to view this proposal', 403);
        }

        const sections = await ProposalSection.find({ proposalId: req.params.id })
            .sort({ sectionOrder: 1 });

        const { PDFService } = await import('../services/pdf.service');

        let pdfPath = proposal.generatedPdfPath;
        if (!pdfPath) {
            pdfPath = await PDFService.generateProposalPDF({
                proposal,
                sections
            });
            proposal.generatedPdfPath = pdfPath;
            proposal.lastGeneratedAt = new Date();
            try {
                const absolutePath = path.resolve(__dirname, '../../', pdfPath.replace(/^\//, ''));
                const stats = await fs.stat(absolutePath);
                proposal.generatedPdfSize = stats.size;
            } catch {
                proposal.generatedPdfSize = undefined;
            }
            await proposal.save();
        }

        if (!pdfPath) {
            throw new AppError('PDF not available', 404);
        }

        const absolutePath = path.resolve(__dirname, '../../', pdfPath.replace(/^\//, ''));
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${proposal.proposalNumber}.pdf"`);
        res.sendFile(absolutePath);
    } catch (error) {
        next(error);
    }
};

// @desc    Stream proposal logo
// @route   GET /api/proposals/logo/:fileName
// @access  Private
export const getProposalLogo = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const fileName = path.basename(req.params.fileName || '');
        if (!fileName) {
            throw new AppError('Logo not found', 404);
        }

        const logoPath = path.resolve(__dirname, '../../uploads/logos', fileName);
        await fs.access(logoPath);
        res.sendFile(logoPath);
    } catch (error) {
        next(error);
    }
};

// @desc    Upload proposal logo
// @route   POST /api/proposals/logo
// @access  Private
export const uploadProposalLogo = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.file) {
            throw new AppError('Logo file is required', 400);
        }

        const filePath = `/uploads/logos/${req.file.filename}`;

        res.status(200).json({
            success: true,
            data: { logoUrl: filePath }
        });
    } catch (error) {
        next(error);
    }
};
