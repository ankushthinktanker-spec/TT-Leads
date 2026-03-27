import Deal, { IDeal } from '../models/deal.model';
import type { FilterQuery } from 'mongoose';

export const listDeals = async (
    tenantId: string,
    filter: FilterQuery<IDeal>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
) => {
    // Force tenant isolation
    const finalFilter = { ...filter, tenantId };

    const items = await Deal.find(finalFilter)
        .populate('companyId', 'name email phone')
        .populate('ownerId', 'firstName lastName email')
        .populate('pipelineId', 'name status')
        .sort(sort)
        .skip(skip)
        .limit(limit);

    const total = await Deal.countDocuments(finalFilter);
    return { items, total };
};

export const createDeal = async (tenantId: string, data: Partial<IDeal>) => {
    return Deal.create({ ...data, tenantId });
};

export const updateDeal = async (tenantId: string, id: string, data: Partial<IDeal>) =>
    Deal.findOneAndUpdate({ _id: id, tenantId }, { $set: data }, { new: true, runValidators: true });

export const deleteDeal = async (tenantId: string, id: string) =>
    Deal.findOneAndDelete({ _id: id, tenantId });

export const getDealById = async (tenantId: string, id: string) =>
    Deal.findOne({ _id: id, tenantId })
        .populate('companyId', 'name email phone')
        .populate('ownerId', 'firstName lastName email')
        .populate('pipelineId', 'name status');
