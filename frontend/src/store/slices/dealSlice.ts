import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';
import { createCrudSlice, CrudState } from '../createCrudSlice';

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

const patchDealInState = (state: CrudState<Deal>, deal: Deal) => {
    const index = state.items.findIndex((item) => item._id === deal._id);
    if (index !== -1) state.items[index] = deal;
    if (state.currentItem?._id === deal._id) state.currentItem = deal;
};

const { reducer, actions } = createCrudSlice<Deal>({
    name: 'deals',
    endpoint: '/deals',
    entityKey: 'deal',
    extraReducers: (builder) => {
        builder
            .addCase(updateDealStatus.fulfilled, (state, action) => {
                patchDealInState(state, action.payload.data.deal);
            })
            .addCase(updateDealStage.fulfilled, (state, action) => {
                patchDealInState(state, action.payload.data.deal);
            })
            .addCase(assignDealOwner.fulfilled, (state, action) => {
                patchDealInState(state, action.payload.data.deal);
            });
    },
});

export const fetchDeals = actions.fetchList;
export const createDeal = actions.create;
export const updateDeal = actions.update;
export const deleteDeal = actions.remove;

export default reducer;
