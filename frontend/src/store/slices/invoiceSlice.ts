import { createCrudSlice } from '../createCrudSlice';

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'PartiallyPaid' | 'Unpaid' | 'Overdue';

export interface Invoice {
    _id: string;
    invoiceNumber: string;
    companyId: { _id?: string; name?: string } | string;
    dealId?: { _id?: string; name?: string } | string;
    contractId?: { _id?: string; contractNumber?: string } | string;
    ownerId?: { _id?: string; firstName?: string; lastName?: string } | string;
    status: InvoiceStatus | string;
    issueDate?: string;
    dueDate?: string;
    paidDate?: string;
    amount?: number;
    currency?: string;
    tags?: string[];
    rating?: number;
    createdAt: string;
    updatedAt: string;
}

const { reducer, actions } = createCrudSlice<Invoice>({
    name: 'invoices',
    endpoint: '/invoices',
    entityKey: 'invoice',
});

export const fetchInvoices = actions.fetchList;
export const createInvoice = actions.create;
export const updateInvoice = actions.update;
export const deleteInvoice = actions.remove;

export default reducer;
