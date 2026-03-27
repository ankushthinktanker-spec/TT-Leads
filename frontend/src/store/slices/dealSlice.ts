import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';

export type DealStatus = 'Open' | 'Won' | 'Lost';

export interface Deal {
    _id: string;
    name: string;
    companyId: { _id?: string; name?: string } | string;
    ownerId?: { _id?: string; firstName?: string; lastName?: string } | string;
    pipelineId?: { _id?: string; name?: string } | string;
    stageId?: string;
    value?: number;
    currency?: string;
    expectedCloseDate?: string;
    probability?: number;
    status: DealStatus;
    rating?: number;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
}

interface DealState {
    deals: Deal[];
    loading: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
}

const initialState: DealState = {
    deals: [],
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0
    }
};

export const fetchDeals = createAsyncThunk(
    'deals/fetchDeals',
    async (params: {
        q?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        dateFrom?: string;
        dateTo?: string;
        ownerId?: string;
        status?: DealStatus | '';
        tags?: string;
        rating?: string;
    } = {}, { rejectWithValue }) => {
        try {
            const response = await api.get('/deals', { params });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch deals'));
        }
    }
);

export const createDeal = createAsyncThunk(
    'deals/createDeal',
    async (payload: Partial<Deal>, { rejectWithValue }) => {
        try {
            const response = await api.post('/deals', payload);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to create deal'));
        }
    }
);

export const updateDeal = createAsyncThunk(
    'deals/updateDeal',
    async ({ id, data }: { id: string; data: Partial<Deal> }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/deals/${id}`, data);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update deal'));
        }
    }
);

export const deleteDeal = createAsyncThunk(
    'deals/deleteDeal',
    async (id: string, { rejectWithValue }) => {
        try {
            await api.delete(`/deals/${id}`);
            return id;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to delete deal'));
        }
    }
);

export const updateDealStatus = createAsyncThunk(
    'deals/updateDealStatus',
    async ({ id, status }: { id: string; status: DealStatus }, { rejectWithValue }) => {
        try {
            const response = await api.patch(`/deals/${id}/status`, { status });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update deal status'));
        }
    }
);

export const updateDealStage = createAsyncThunk(
    'deals/updateDealStage',
    async ({ id, pipelineId, stageId }: { id: string; pipelineId?: string; stageId: string }, { rejectWithValue }) => {
        try {
            const response = await api.patch(`/deals/${id}/stage`, { pipelineId, stageId });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update deal stage'));
        }
    }
);

export const assignDealOwner = createAsyncThunk(
    'deals/assignDealOwner',
    async ({ id, ownerId }: { id: string; ownerId: string }, { rejectWithValue }) => {
        try {
            const response = await api.patch(`/deals/${id}/assign`, { ownerId });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to assign deal owner'));
        }
    }
);

const dealSlice = createSlice({
    name: 'deals',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchDeals.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDeals.fulfilled, (state, action) => {
                state.loading = false;
                const data = action.payload?.data || {};
                const meta = data.meta || action.payload?.pagination || {};
                state.deals = data.items || data.deals || [];
                state.pagination = {
                    page: meta.page || 1,
                    limit: meta.limit || 10,
                    totalItems: meta.totalItems || meta.total || 0,
                    totalPages: meta.totalPages || meta.pages || 0
                };
            })
            .addCase(fetchDeals.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createDeal.fulfilled, (state, action) => {
                const deal = action.payload.data.deal;
                state.deals.unshift(deal);
            })
            .addCase(updateDeal.fulfilled, (state, action) => {
                const deal = action.payload.data.deal;
                const index = state.deals.findIndex((item) => item._id === deal._id);
                if (index !== -1) {
                    state.deals[index] = deal;
                }
            })
            .addCase(deleteDeal.fulfilled, (state, action) => {
                state.deals = state.deals.filter((item) => item._id !== action.payload);
            })
            .addCase(updateDealStatus.fulfilled, (state, action) => {
                const deal = action.payload.data.deal;
                const index = state.deals.findIndex((item) => item._id === deal._id);
                if (index !== -1) {
                    state.deals[index] = deal;
                }
            })
            .addCase(updateDealStage.fulfilled, (state, action) => {
                const deal = action.payload.data.deal;
                const index = state.deals.findIndex((item) => item._id === deal._id);
                if (index !== -1) {
                    state.deals[index] = deal;
                }
            })
            .addCase(assignDealOwner.fulfilled, (state, action) => {
                const deal = action.payload.data.deal;
                const index = state.deals.findIndex((item) => item._id === deal._id);
                if (index !== -1) {
                    state.deals[index] = deal;
                }
            });
    }
});

export default dealSlice.reducer;
