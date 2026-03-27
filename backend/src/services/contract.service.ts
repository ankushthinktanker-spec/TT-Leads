import Contract, { IContract } from '../models/contract.model';
import type { FilterQuery } from 'mongoose';

export const listContracts = async (
    tenantId: string,
    filter: FilterQuery<IContract>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
) => {
    // Force tenant isolation
    const finalFilter = { ...filter, tenantId };

    const items = await Contract.find(finalFilter)
        .populate('companyId', 'name email phone')
        .populate('dealId', 'name value status')
        .populate('ownerId', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit);

    const total = await Contract.countDocuments(finalFilter);
    return { items, total };
};

export const createContract = async (tenantId: string, data: Partial<IContract>) => {
    return Contract.create({ ...data, tenantId });
};

export const updateContract = async (tenantId: string, id: string, data: Partial<IContract>) =>
    Contract.findOneAndUpdate({ _id: id, tenantId }, { $set: data }, { new: true, runValidators: true });

export const deleteContract = async (tenantId: string, id: string) =>
    Contract.findOneAndDelete({ _id: id, tenantId });

export const getContractById = async (tenantId: string, id: string) =>
    Contract.findOne({ _id: id, tenantId })
        .populate('companyId', 'name email phone')
        .populate('dealId', 'name value status')
        .populate('ownerId', 'firstName lastName email');

export const findContractByAttachmentPath = async (tenantId: string, filePath: string) =>
    Contract.findOne({ tenantId, attachmentUrls: filePath })
        .select('ownerId createdBy');

export const appendContractAttachment = async (tenantId: string, id: string, filePath: string) =>
    Contract.findOneAndUpdate(
        { _id: id, tenantId },
        { $push: { attachmentUrls: filePath } },
        { new: true, runValidators: true }
    )
        .populate('companyId', 'name email phone')
        .populate('dealId', 'name value status')
        .populate('ownerId', 'firstName lastName email');
