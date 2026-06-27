import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';
import { createCrudSlice, CrudState } from '../createCrudSlice';

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

export const fetchUpcomingSubscriptions = createAsyncThunk(
    'subscriptions/fetchUpcoming',
    async (params: { days?: number; limit?: number } = {}, { rejectWithValue }) => {
        try {
            const response = await api.get('/subscriptions/upcoming', { params });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch upcoming subscriptions'));
        }
    }
);

export const updateSubscriptionStatus = createAsyncThunk(
    'subscriptions/updateStatus',
    async ({ id, status }: { id: string; status: SubscriptionStatus }, { rejectWithValue }) => {
        try {
            const response = await api.patch(`/subscriptions/${id}/status`, { status });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update subscription status'));
        }
    }
);

const patchSubscriptionInState = (state: CrudState<Subscription>, subscription: Subscription) => {
    const index = state.items.findIndex((item) => item._id === subscription._id);
    if (index !== -1) state.items[index] = subscription;
    if (state.currentItem?._id === subscription._id) state.currentItem = subscription;
};

const { reducer, actions } = createCrudSlice<Subscription>({
    name: 'subscriptions',
    endpoint: '/subscriptions',
    entityKey: 'subscription',
    extraReducers: (builder) => {
        builder.addCase(updateSubscriptionStatus.fulfilled, (state, action) => {
            patchSubscriptionInState(state, action.payload.data.subscription);
        });
    },
});

export const fetchSubscriptions = actions.fetchList;
export const createSubscription = actions.create;
export const updateSubscription = actions.update;
export const deleteSubscription = actions.remove;

export default reducer;
