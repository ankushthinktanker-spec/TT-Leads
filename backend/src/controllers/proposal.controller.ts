import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import Proposal from '../models/proposal.model';
import ProposalSection from '../models/proposal-section.model';
import ProposalTemplate from '../models/proposal-template.model';
import { proposalRepository } from '../repositories/proposal.repository';
import { leadRepository } from '../repositories/lead.repository';
import { companyRepository } from '../repositories/company.repository';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { createProposalSchema, updateProposalSchema, sendProposalSchema } from '../validators/proposal.validator';
import {
    createProposalSectionSchema,
    updateProposalSectionSchema,
    reorderProposalSectionsSchema
} from '../validators/proposal-section.validator';
import mongoose from 'mongoose';
import sanitizeHtml from 'sanitize-html';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';
import { getSearchTerm, applySearchFilter } from '../utils/queryFilters';
import { scanFilePlaceholder } from '../utils/fileSecurity.utils';
import { sendMail } from '../services/email.service';

const normalizeSectionType = (contentType?: string): 'RichText' | 'Table' | 'Mixed' => {
    if (!contentType) return 'RichText';
    const normalized = contentType.toLowerCase();
    if (normalized === 'table') return 'Table';
    if (normalized === 'mixed') return 'Mixed';
    return 'RichText';
};

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
    tenantId: string,
    payload: ProposalPayload,
    userId: string
): Promise<{ companyId?: string; clientCompanyName?: string }> => {
    let companyId = payload.companyId;
    let clientCompanyName = payload.clientCompany || payload.clientDetails?.companyName;

    if (!companyId && payload.leadId) {
        const lead = await leadRepository.findById(tenantId, payload.leadId);
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
        const existingCompany = await companyRepository.findByName(tenantId, clientCompanyName.trim());

        if (existingCompany) {
            companyId = existingCompany._id.toString();
        } else {
            const newCompany = await companyRepository.create(tenantId, {
                name: clientCompanyName,
                createdBy: new mongoose.Types.ObjectId(userId)
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
            status,
            companyId,
            leadId,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter
        const filter: Record<string, unknown> = { tenantId: req.tenantId! };

        if (req.user!.role !== 'Admin' && req.user!.role !== 'Manager') {
            filter.createdBy = req.user!._id;
        }

        if (status) filter.status = status;
        if (companyId) filter.companyId = companyId;
        if (leadId) filter.leadId = leadId;

        const searchTerm = getSearchTerm(req.query as Record<string, unknown>);
        applySearchFilter(filter, searchTerm, ['proposalNumber', 'title', 'clientDetails.companyName']);

        // Pagination
        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const proposals = await proposalRepository.find(req.tenantId!, filter, {
            select: 'proposalNumber title status proposalDate validTill totalAmount currency companyId leadId contactId createdBy createdAt updatedAt generatedPdfPath',
            populate: [
                { path: 'companyId', select: 'name email phone' },
                { path: 'leadId', select: 'firstName lastName email' },
                { path: 'contactId', select: 'firstName lastName email' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ],
            sort,
            skip,
            limit
        });

        const total = await Proposal.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                items: proposals,
                meta: buildPaginationMeta(page, limit, total)
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

        const proposal = await Proposal.findOne({ _id: req.params.id, tenantId: req.tenantId! })
            .populate('companyId')
            .populate('leadId')
            .populate('contactId')
            .populate('createdBy', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName email');

        if (!proposal) {
            throw new AppError('Proposal not found or unauthorized access', 404);
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

        const { companyId, clientCompanyName } = await resolveCompanyId(req.tenantId!, value, req.user!._id.toString());
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
            tenantId: req.tenantId!,
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

        const template = await ProposalTemplate.findOne({ _id: req.params.templateId, tenantId: req.tenantId! });
        if (!template) {
            throw new AppError('Template not found or unauthorized access', 404);
        }

        const { companyId, clientCompanyName } = await resolveCompanyId(req.tenantId!, value, req.user!._id.toString());
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
            tenantId: req.tenantId!,
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

        const proposal = await Proposal.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!proposal) {
            throw new AppError('Proposal not found or unauthorized access', 404);
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
            const { companyId } = await resolveCompanyId(req.tenantId!, value, req.user!._id.toString());
            if (companyId) {
                updateData.companyId = companyId;
            }
        }

        const updatedProposal = await Proposal.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId! },
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

        const proposal = await Proposal.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!proposal) {
            throw new AppError('Proposal not found or unauthorized access', 404);
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

        const proposal = await Proposal.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!proposal) {
            throw new AppError('Proposal not found or unauthorized access', 404);
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
            content: ensureHeadingIds(sanitizeSectionContent(value.content || ''), localId),
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

        const proposal = await Proposal.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!proposal) {
            throw new AppError('Proposal not found or unauthorized access', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to modify this proposal', 403);
        }

        const section = await ProposalSection.findOne({ _id: req.params.sectionId, proposalId: req.params.id });
        if (!section) {
            throw new AppError('Section not found in this proposal', 404);
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

        const proposal = await Proposal.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!proposal) {
            throw new AppError('Proposal not found or unauthorized access', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to modify this proposal', 403);
        }

        const section = await ProposalSection.findOne({ _id: req.params.sectionId, proposalId: req.params.id });
        if (!section) {
            throw new AppError('Section not found in this proposal', 404);
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

        const proposal = await Proposal.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!proposal) {
            throw new AppError('Proposal not found or unauthorized access', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to modify this proposal', 403);
        }

        const { sectionOrders } = value; // Array of { sectionId, newOrder }

        if (!Array.isArray(sectionOrders)) {
            throw new AppError('Invalid section orders format', 400);
        }

        // Update each section's order
        const updatePromises = sectionOrders.map(async ({ sectionId, newOrder }) => {
            const section = await ProposalSection.findOne({ _id: sectionId, proposalId: req.params.id });
            if (!section) {
                throw new AppError('Section does not belong to this proposal', 400);
            }
            return ProposalSection.findByIdAndUpdate(sectionId, { sectionOrder: newOrder });
        });

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

        const originalProposal = await Proposal.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!originalProposal) {
            throw new AppError('Proposal not found or unauthorized access', 404);
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

        const proposal = await Proposal.findOne({ _id: req.params.id, tenantId: req.tenantId! })
            .populate('companyId')
            .populate('contactId');

        if (!proposal) {
            throw new AppError('Proposal not found or unauthorized access', 404);
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

        const proposal = await Proposal.findOne({ _id: req.params.id, tenantId: req.tenantId! })
            .populate('companyId')
            .populate('contactId');

        if (!proposal) {
            throw new AppError('Proposal not found or unauthorized access', 404);
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

        const proposal = await Proposal.findOne({ _id: req.params.id, tenantId: req.tenantId! })
            .populate('companyId')
            .populate('contactId');

        if (!proposal) {
            throw new AppError('Proposal not found or unauthorized access', 404);
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

// @desc    Send proposal by email
// @route   POST /api/proposals/:id/send
// @access  Private
export const sendProposal = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid proposal identifier', 400);
        }

        const { error, value } = sendProposalSchema.validate(req.body || {});
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const proposal = await Proposal.findOne({ _id: req.params.id, tenantId: req.tenantId! })
            .populate('contactId', 'firstName lastName email')
            .populate('leadId', 'firstName lastName email')
            .populate('companyId', 'name');

        if (!proposal) {
            throw new AppError('Proposal not found or unauthorized access', 404);
        }

        if (!canManageProposal(proposal, req.user!)) {
            throw new AppError('Not authorized to send this proposal', 403);
        }

        const requestedTo = typeof value.to === 'string' ? value.to.trim() : '';
        const contactEmail = (proposal.contactId as { email?: string } | null)?.email || '';
        const leadEmail = (proposal.leadId as { email?: string } | null)?.email || '';
        const clientEmail = proposal.clientDetails?.email || '';
        const recipient = requestedTo || clientEmail || contactEmail || leadEmail;

        if (!recipient) {
            throw new AppError('Recipient email is required to send proposal', 400);
        }

        const preparedByName = proposal.preparedBy?.name || `${req.user!.firstName} ${req.user!.lastName}`;
        const companyName = proposal.clientDetails?.companyName
            || (proposal.companyId as { name?: string } | null)?.name
            || 'Client';
        const defaultSubject = `Proposal ${proposal.proposalNumber} from ${preparedByName}`;
        const messageText = typeof value.message === 'string' && value.message.trim()
            ? value.message.trim()
            : `Please find the proposal ${proposal.proposalNumber} for ${companyName}.`;

        const safeMessage = sanitizeHtml(messageText, {
            allowedTags: [],
            allowedAttributes: {}
        });

        let pdfPath = proposal.generatedPdfPath;
        if (!pdfPath) {
            const sections = await ProposalSection.find({ proposalId: req.params.id })
                .sort({ sectionOrder: 1 });
            const { PDFService } = await import('../services/pdf.service');
            pdfPath = await PDFService.generateProposalPDF({
                proposal,
                sections
            });
            proposal.generatedPdfPath = pdfPath;
            proposal.lastGeneratedAt = new Date();
            try {
                const generatedAbsolutePath = path.resolve(__dirname, '../../', pdfPath.replace(/^\//, ''));
                const stats = await fs.stat(generatedAbsolutePath);
                proposal.generatedPdfSize = stats.size;
            } catch {
                proposal.generatedPdfSize = undefined;
            }
        }

        if (!pdfPath) {
            throw new AppError('PDF not available for sending', 500);
        }

        const absolutePdfPath = path.resolve(__dirname, '../../', pdfPath.replace(/^\//, ''));
        await fs.access(absolutePdfPath);

        const htmlBody = [
            `<p>Hello,</p>`,
            `<p>${safeMessage}</p>`,
            `<p><strong>Proposal:</strong> ${proposal.title}</p>`,
            `<p><strong>Proposal Number:</strong> ${proposal.proposalNumber}</p>`,
            `<p><strong>Valid Till:</strong> ${new Date(proposal.validTill).toLocaleDateString()}</p>`,
            `<p>Regards,<br/>${preparedByName}</p>`
        ].join('');

        await sendMail({
            to: recipient,
            subject: (typeof value.subject === 'string' && value.subject.trim()) ? value.subject.trim() : defaultSubject,
            html: htmlBody,
            text: `${messageText}\n\nProposal: ${proposal.title}\nProposal Number: ${proposal.proposalNumber}`,
            replyTo: req.user!.email,
            attachments: [
                {
                    filename: `${proposal.proposalNumber}.pdf`,
                    path: absolutePdfPath,
                    contentType: 'application/pdf'
                }
            ]
        });

        proposal.status = 'Sent';
        await proposal.save();

        res.status(200).json({
            success: true,
            message: 'Proposal sent successfully',
            data: {
                proposal,
                sentTo: recipient
            }
        });
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

        const absolutePath = path.resolve(__dirname, '../../uploads/logos', req.file.filename);
        await scanFilePlaceholder(absolutePath);

        const filePath = `/uploads/logos/${req.file.filename}`;

        res.status(200).json({
            success: true,
            data: { logoUrl: filePath }
        });
    } catch (error) {
        next(error);
    }
};
