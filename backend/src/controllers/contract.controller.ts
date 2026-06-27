import { Response, NextFunction } from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { Roles } from '../constants/roles';
import { AppError } from '../middleware/errorHandler';
import { createContractSchema, updateContractSchema } from '../validators/contract.validator';
import { buildPaginationMeta, getPaginationParams } from '../utils/pagination';
import { applySearchFilter, getDateRangeParam, getSearchTerm, getStringParam, getTagsParam } from '../utils/queryFilters';
import {
    createContract,
    deleteContract,
    getContractById,
    listContracts,
    updateContract,
    appendContractAttachment,
    findContractByAttachmentPath
} from '../services/contract.service';
import type { IContract } from '../models/contract.model';
import { scanFilePlaceholder } from '../utils/fileSecurity.utils';
import { writeAuditLog } from '../services/audit.service';

const toAuditChanges = (value: { toObject: () => unknown }): Record<string, unknown> =>
    value.toObject() as Record<string, unknown>;

type ContractFilter = Record<string, unknown>;
type AccessTarget = { createdBy?: mongoose.Types.ObjectId; ownerId?: mongoose.Types.ObjectId };

const canAccessContract = (contract: AccessTarget, user: AuthRequest['user']) => {
    if (!user) return false;
    if (user.role === Roles.ADMIN || user.role === Roles.MANAGER) return true;
    const userId = String(user._id);
    return String(contract.createdBy || '') === userId || String(contract.ownerId || '') === userId;
};

const buildContractFilter = (req: AuthRequest): ContractFilter => {
    const filter: ContractFilter = { tenantId: req.tenantId! };
    const user = req.user!;

    if (user.role !== Roles.ADMIN && user.role !== Roles.MANAGER) {
        filter.$or = [{ createdBy: user._id }, { ownerId: user._id }];
    }

    const status = getStringParam(req.query as Record<string, unknown>, 'status');
    if (status) filter.status = status;

    const ownerId = getStringParam(req.query as Record<string, unknown>, 'ownerId');
    if (ownerId) filter.ownerId = ownerId;

    const companyId = getStringParam(req.query as Record<string, unknown>, 'companyId');
    if (companyId) filter.companyId = companyId;

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
    applySearchFilter(filter, searchTerm, ['contractNumber', 'title', 'status']);

    return filter;
};

// @desc    Get all contracts
// @route   GET /api/contracts
// @access  Private
export const getContracts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const filter = buildContractFilter(req);
        const { items, total } = await listContracts(req.tenantId!, filter as Record<string, unknown>, sort, skip, limit);

        res.status(200).json({
            success: true,
            data: {
                data: items,
                meta: buildPaginationMeta(page, limit, total)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get contract
// @route   GET /api/contracts/:id
// @access  Private
export const getContract = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid contract identifier', 400);
        }

        const contract = await getContractById(req.tenantId!, req.params.id);
        if (!contract) {
            throw new AppError('Contract not found or unauthorized access', 404);
        }
        if (!canAccessContract(contract, req.user)) {
            throw new AppError('Not authorized to view this contract', 403);
        }

        res.status(200).json({ success: true, data: { contract } });
    } catch (error) {
        next(error);
    }
};

// @desc    Create contract
// @route   POST /api/contracts
// @access  Private
export const createContractHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { error, value } = createContractSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const payload: Partial<IContract> = {
            ...value,
            createdBy: req.user!._id
        };

        const contract = await createContract(req.tenantId!, payload);

        // 📍 SECURITY: Audit Log Creation
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'CREATE',
            entityType: 'Contract',
            entityId: contract._id.toString(),
            ip: req.ip,
            changes: toAuditChanges(contract)
        });

        res.status(201).json({
            success: true,
            message: 'Contract created successfully',
            data: { contract }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update contract
// @route   PUT /api/contracts/:id
// @access  Private
export const updateContractHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid contract identifier', 400);
        }

        const { error, value } = updateContractSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const existing = await getContractById(req.tenantId!, req.params.id);
        if (!existing) {
            throw new AppError('Contract not found or unauthorized access', 404);
        }
        if (!canAccessContract(existing, req.user)) {
            throw new AppError('Not authorized to update this contract', 403);
        }

        const contract = await updateContract(req.tenantId!, req.params.id, value);
        if (!contract) {
            throw new AppError('Update failed: Contract not found', 404);
        }

        // 📍 SECURITY: Audit Log Update
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'UPDATE',
            entityType: 'Contract',
            entityId: contract._id.toString(),
            ip: req.ip,
            changes: { before: toAuditChanges(existing), after: toAuditChanges(contract) }
        });

        res.status(200).json({
            success: true,
            message: 'Contract updated successfully',
            data: { contract }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete contract
// @route   DELETE /api/contracts/:id
// @access  Private
export const deleteContractHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid contract identifier', 400);
        }

        const existing = await getContractById(req.tenantId!, req.params.id);
        if (!existing) {
            throw new AppError('Contract not found or unauthorized access', 404);
        }
        if (!canAccessContract(existing, req.user)) {
            throw new AppError('Not authorized to delete this contract', 403);
        }

        // 📍 SECURITY: Audit Log Delete
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'DELETE',
            entityType: 'Contract',
            entityId: req.params.id,
            ip: req.ip,
            changes: toAuditChanges(existing)
        });

        await deleteContract(req.tenantId!, req.params.id);

        res.status(200).json({ success: true, message: 'Contract deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @route   GET /api/contracts/attachments/:fileName
// @access  Private
export const getContractAttachment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const fileName = path.basename(req.params.fileName || '');
        if (!fileName) {
            throw new AppError('Attachment not found', 404);
        }

        const filePath = `/uploads/contracts/${fileName}`;
        const ownerContract = await findContractByAttachmentPath(req.tenantId!, filePath);
        if (!ownerContract) {
            throw new AppError('Attachment not found or unauthorized access', 404);
        }
        if (!canAccessContract(ownerContract, req.user)) {
            throw new AppError('Not authorized to view this attachment', 403);
        }

        const attachmentPath = path.resolve(__dirname, '../../uploads/contracts', fileName);
        await fs.access(attachmentPath);
        res.sendFile(attachmentPath);
    } catch (error) {
        next(error);
    }
};

// @desc    Upload contract attachment
// @route   POST /api/contracts/:id/attachments
// @access  Private
export const uploadContractAttachment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid contract identifier', 400);
        }

        if (!req.file) {
            throw new AppError('Attachment file is required', 400);
        }

        const existing = await getContractById(req.tenantId!, req.params.id);
        if (!existing) {
            throw new AppError('Contract not found or unauthorized access', 404);
        }
        if (!canAccessContract(existing, req.user)) {
            throw new AppError('Not authorized to update this contract', 403);
        }

        const absolutePath = path.resolve(__dirname, '../../uploads/contracts', req.file.filename);
        await scanFilePlaceholder(absolutePath);

        const filePath = `/uploads/contracts/${req.file.filename}`;
        const contract = await appendContractAttachment(req.tenantId!, req.params.id, filePath);

        if (!contract) {
            throw new AppError('Contract not found', 404);
        }

        // 📍 SECURITY: Audit Log Attachment Upload
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'ATTACHMENT_UPLOAD',
            entityType: 'Contract',
            entityId: contract._id.toString(),
            ip: req.ip,
            changes: { fileName: req.file.filename, path: filePath }
        });

        res.status(200).json({
            success: true,
            message: 'Attachment uploaded successfully',
            data: { contract }
        });
    } catch (error) {
        next(error);
    }
};
