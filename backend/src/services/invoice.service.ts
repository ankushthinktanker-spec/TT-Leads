import Invoice, { IInvoice } from '../models/invoice.model';
import type { FilterQuery } from 'mongoose';

export const listInvoices = async (
    tenantId: string,
    filter: FilterQuery<IInvoice>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
) => {
    // Force tenant isolation
    const finalFilter = { ...filter, tenantId };

    const items = await Invoice.find(finalFilter)
        .populate('companyId', 'name email phone')
        .populate('dealId', 'name value status')
        .populate('contractId', 'contractNumber status')
        .populate('ownerId', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit);

    const total = await Invoice.countDocuments(finalFilter);
    return { items, total };
};

export const createInvoice = async (tenantId: string, data: Partial<IInvoice>) => {
    return Invoice.create({ ...data, tenantId });
};

export const updateInvoice = async (tenantId: string, id: string, data: Partial<IInvoice>) =>
    Invoice.findOneAndUpdate({ _id: id, tenantId }, { $set: data }, { new: true, runValidators: true });

export const deleteInvoice = async (tenantId: string, id: string) =>
    Invoice.findOneAndDelete({ _id: id, tenantId });

export const getInvoiceById = async (tenantId: string, id: string) =>
    Invoice.findOne({ _id: id, tenantId })
        .populate('companyId', 'name email phone')
        .populate('dealId', 'name value status')
        .populate('contractId', 'contractNumber status')
        .populate('ownerId', 'firstName lastName email');
