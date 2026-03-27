import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';

export type SubscriptionStatus = 'Active' | 'Paused' | 'Cancelled' | 'Expired';
export type SubscriptionType = 'Software' | 'Domain' | 'Hosting' | 'Email' | 'API' | 'License' | 'Other';
export type BillingCycle = 'Monthly' | 'Quarterly' | 'HalfYearly' | 'Yearly' | 'Custom';

export interface Subscription {
    _id: string;
    name: string;
    vendorName?: string;
    type?: SubscriptionType | string;
    companyId?: { _id?: string; name?: string } | string;
    internalOwnerId?: { _id?: string; firstName?: string; lastName?: string } | string;
    planName?: string;
    billingCycle?: BillingCycle | string;
    amount?: number;
    currency?: string;
    startDate?: string;
    renewDate: string;
    status: SubscriptionStatus | string;
    notes?: string;
    notifyBeforeDays?: number[];
    notificationChannels?: string[];
    createdAt: string;
    updatedAt: string;
}

interface SubscriptionState {
    subscriptions: Subscription[];
    loading: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
}

const initialState: SubscriptionState = {
    subscriptions: [],
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0
    }
};

export const fetchSubscriptions = createAsyncThunk(
    'subscriptions/fetchSubscriptions',
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
        type?: string;
    } = {}, { rejectWithValue }) => {
        try {
            const response = await api.get('/subscriptions', { params });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch subscriptions'));
        }
    }
);

export const fetchUpcomingSubscriptions = createAsyncThunk(
    'subscriptions/fetchUpcomingSubscriptions',
    async (params: { days?: number; limit?: number } = {}, { rejectWithValue }) => {
        try {
            const response = await api.get('/subscriptions/upcoming', { params });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch upcoming subscriptions'));
        }
    }
);

export const createSubscription = createAsyncThunk(
    'subscriptions/createSubscription',
    async (payload: Partial<Subscription>, { rejectWithValue }) => {
        try {
            const response = await api.post('/subscriptions', payload);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to create subscription'));
        }
    }
);

export const updateSubscription = createAsyncThunk(
    'subscriptions/updateSubscription',
    async ({ id, data }: { id: string; data: Partial<Subscription> }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/subscriptions/${id}`, data);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update subscription'));
        }
    }
);

export const updateSubscriptionStatus = createAsyncThunk(
    'subscriptions/updateSubscriptionStatus',
    async ({ id, status }: { id: string; status: SubscriptionStatus }, { rejectWithValue }) => {
        try {
            const response = await api.patch(`/subscriptions/${id}/status`, { status });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update subscription status'));
        }
    }
);

export const deleteSubscription = createAsyncThunk(
    'subscriptions/deleteSubscription',
    async (id: string, { rejectWithValue }) => {
        try {
            await api.delete(`/subscriptions/${id}`);
            return id;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to delete subscription'));
        }
    }
);

const subscriptionSlice = createSlice({
    name: 'subscriptions',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchSubscriptions.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSubscriptions.fulfilled, (state, action) => {
                state.loading = false;
                const data = action.payload?.data || {};
                const meta = data.meta || action.payload?.pagination || {};
                state.subscriptions = data.items || data.subscriptions || [];
                state.pagination = {
                    page: meta.page || 1,
                    limit: meta.limit || 10,
                    totalItems: meta.totalItems || meta.total || 0,
                    totalPages: meta.totalPages || meta.pages || 0
                };
            })
            .addCase(fetchSubscriptions.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createSubscription.fulfilled, (state, action) => {
                const subscription = action.payload.data.subscription;
                state.subscriptions.unshift(subscription);
            })
            .addCase(updateSubscription.fulfilled, (state, action) => {
                const subscription = action.payload.data.subscription;
                const index = state.subscriptions.findIndex((item) => item._id === subscription._id);
                if (index !== -1) {
                    state.subscriptions[index] = subscription;
                }
            })
            .addCase(updateSubscriptionStatus.fulfilled, (state, action) => {
                const subscription = action.payload.data.subscription;
                const index = state.subscriptions.findIndex((item) => item._id === subscription._id);
                if (index !== -1) {
                    state.subscriptions[index] = subscription;
                }
            })
            .addCase(deleteSubscription.fulfilled, (state, action) => {
                state.subscriptions = state.subscriptions.filter((item) => item._id !== action.payload);
            });
    }
});

export default subscriptionSlice.reducer;
