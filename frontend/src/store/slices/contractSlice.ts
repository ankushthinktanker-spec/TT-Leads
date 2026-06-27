import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';

export type ContractStatus = 'Draft' | 'Sent' | 'Signed' | 'Expired';

export interface Contract {
    _id: string;
    contractNumber: string;
    title?: string;
    companyId: { _id?: string; name?: string } | string;
    dealId?: { _id?: string; name?: string } | string;
    ownerId?: { _id?: string; firstName?: string; lastName?: string } | string;
    status: ContractStatus | string;
    startDate?: string;
    endDate?: string;
    value?: number;
    currency?: string;
    attachmentUrls?: string[];
    tags?: string[];
    rating?: number;
    createdAt: string;
    updatedAt: string;
}

interface ContractState {
    contracts: Contract[];
    loading: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const initialState: ContractState = {
    contracts: [],
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    }
};

export const fetchContracts = createAsyncThunk(
    'contracts/fetchContracts',
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
    } = {}, { rejectWithValue }) => {
        try {
            const response = await api.get('/contracts', { params });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch contracts'));
        }
    }
);

export const createContract = createAsyncThunk(
    'contracts/createContract',
    async (payload: Partial<Contract>, { rejectWithValue }) => {
        try {
            const response = await api.post('/contracts', payload);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to create contract'));
        }
    }
);

export const updateContract = createAsyncThunk(
    'contracts/updateContract',
    async ({ id, data }: { id: string; data: Partial<Contract> }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/contracts/${id}`, data);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update contract'));
        }
    }
);

export const deleteContract = createAsyncThunk(
    'contracts/deleteContract',
    async (id: string, { rejectWithValue }) => {
        try {
            await api.delete(`/contracts/${id}`);
            return id;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to delete contract'));
        }
    }
);

export const uploadContractAttachment = createAsyncThunk(
    'contracts/uploadContractAttachment',
    async ({ id, file }: { id: string; file: File }, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('attachment', file);
            const response = await api.post(`/contracts/${id}/attachments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to upload attachment'));
        }
    }
);

const contractSlice = createSlice({
    name: 'contracts',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchContracts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchContracts.fulfilled, (state, action) => {
                state.loading = false;
                const data = action.payload?.data || {};
                const meta = data.meta || {};
                state.contracts = data.data || [];
                state.pagination = {
                    page: meta.page || 1,
                    limit: meta.limit || 10,
                    total: meta.total || 0,
                    totalPages: meta.totalPages || 0
                };
            })
            .addCase(fetchContracts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createContract.fulfilled, (state, action) => {
                const contract = action.payload.data.contract;
                state.contracts.unshift(contract);
            })
            .addCase(updateContract.fulfilled, (state, action) => {
                const contract = action.payload.data.contract;
                const index = state.contracts.findIndex((item) => item._id === contract._id);
                if (index !== -1) {
                    state.contracts[index] = contract;
                }
            })
            .addCase(deleteContract.fulfilled, (state, action) => {
                state.contracts = state.contracts.filter((item) => item._id !== action.payload);
            })
            .addCase(uploadContractAttachment.fulfilled, (state, action) => {
                const contract = action.payload.data.contract;
                const index = state.contracts.findIndex((item) => item._id === contract._id);
                if (index !== -1) {
                    state.contracts[index] = contract;
                }
            });
    }
});

export default contractSlice.reducer;
