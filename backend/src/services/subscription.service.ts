import Subscription, { ISubscription } from '../models/subscription.model';
import type { FilterQuery } from 'mongoose';

export const listSubscriptions = async (
    tenantId: string,
    filter: FilterQuery<ISubscription>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
) => {
    // Force tenant isolation
    const finalFilter = { ...filter, tenantId };

    const items = await Subscription.find(finalFilter)
        .populate('companyId', 'name email phone')
        .populate('internalOwnerId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit);

    const total = await Subscription.countDocuments(finalFilter);
    return { items, total };
};

export const listUpcomingSubscriptions = async (
    tenantId: string,
    filter: FilterQuery<ISubscription>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
) => listSubscriptions(tenantId, filter, sort, skip, limit);

export const createSubscription = async (tenantId: string, data: Partial<ISubscription>) => 
    Subscription.create({ ...data, tenantId });

export const updateSubscription = async (tenantId: string, id: string, data: Partial<ISubscription>) =>
    Subscription.findOneAndUpdate({ _id: id, tenantId }, { $set: data }, { new: true, runValidators: true })
        .populate('companyId', 'name email phone')
        .populate('internalOwnerId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

export const deleteSubscription = async (tenantId: string, id: string) => 
    Subscription.findOneAndDelete({ _id: id, tenantId });

export const getSubscriptionById = async (tenantId: string, id: string) =>
    Subscription.findOne({ _id: id, tenantId })
        .populate('companyId', 'name email phone')
        .populate('internalOwnerId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');
