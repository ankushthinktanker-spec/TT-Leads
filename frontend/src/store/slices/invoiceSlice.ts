import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';

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

interface InvoiceState {
    invoices: Invoice[];
    loading: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
}

const initialState: InvoiceState = {
    invoices: [],
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0
    }
};

export const fetchInvoices = createAsyncThunk(
    'invoices/fetchInvoices',
    async (params: {
        q?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        dateFrom?: string;
        dateTo?: string;
        ownerId?: string;
        status?: string;
        tags?: string;
        rating?: string;
        companyId?: string;
        dealId?: string;
        contractId?: string;
    } = {}, { rejectWithValue }) => {
        try {
            const response = await api.get('/invoices', { params });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch invoices'));
        }
    }
);

export const createInvoice = createAsyncThunk(
    'invoices/createInvoice',
    async (payload: Partial<Invoice>, { rejectWithValue }) => {
        try {
            const response = await api.post('/invoices', payload);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to create invoice'));
        }
    }
);

export const updateInvoice = createAsyncThunk(
    'invoices/updateInvoice',
    async ({ id, data }: { id: string; data: Partial<Invoice> }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/invoices/${id}`, data);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update invoice'));
        }
    }
);

export const deleteInvoice = createAsyncThunk(
    'invoices/deleteInvoice',
    async (id: string, { rejectWithValue }) => {
        try {
            await api.delete(`/invoices/${id}`);
            return id;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to delete invoice'));
        }
    }
);

const invoiceSlice = createSlice({
    name: 'invoices',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchInvoices.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchInvoices.fulfilled, (state, action) => {
                state.loading = false;
                const data = action.payload?.data || {};
                const meta = data.meta || action.payload?.pagination || {};
                state.invoices = data.items || data.invoices || [];
                state.pagination = {
                    page: meta.page || 1,
                    limit: meta.limit || 10,
                    totalItems: meta.totalItems || meta.total || 0,
                    totalPages: meta.totalPages || meta.pages || 0
                };
            })
            .addCase(fetchInvoices.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createInvoice.fulfilled, (state, action) => {
                const invoice = action.payload.data.invoice;
                state.invoices.unshift(invoice);
            })
            .addCase(updateInvoice.fulfilled, (state, action) => {
                const invoice = action.payload.data.invoice;
                const index = state.invoices.findIndex((item) => item._id === invoice._id);
                if (index !== -1) {
                    state.invoices[index] = invoice;
                }
            })
            .addCase(deleteInvoice.fulfilled, (state, action) => {
                state.invoices = state.invoices.filter((item) => item._id !== action.payload);
            });
    }
});

export default invoiceSlice.reducer;
