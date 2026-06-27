import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';

export type PipelineStatus = 'Active' | 'Inactive';
export type PipelineAccess = 'all' | 'selected';

export interface PipelineStage {
    _id: string;
    name: string;
    order: number;
}

export interface Pipeline {
    _id: string;
    name: string;
    status: PipelineStatus;
    access: PipelineAccess;
    selectedUserIds: string[];
    stages: PipelineStage[];
    createdAt: string;
    updatedAt: string;
}

interface PipelineState {
    pipelines: Pipeline[];
    loading: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const initialState: PipelineState = {
    pipelines: [],
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    }
};

export const fetchPipelines = createAsyncThunk(
    'pipelines/fetchPipelines',
    async (params: {
        q?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        dateFrom?: string;
        dateTo?: string;
        status?: PipelineStatus | '';
    } = {}, { rejectWithValue }) => {
        try {
            const response = await api.get('/pipelines', { params });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch pipelines'));
        }
    }
);

export const createPipeline = createAsyncThunk(
    'pipelines/createPipeline',
    async (payload: Partial<Pipeline>, { rejectWithValue }) => {
        try {
            const response = await api.post('/pipelines', payload);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to create pipeline'));
        }
    }
);

export const updatePipeline = createAsyncThunk(
    'pipelines/updatePipeline',
    async ({ id, data }: { id: string; data: Partial<Pipeline> }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/pipelines/${id}`, data);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update pipeline'));
        }
    }
);

export const deletePipeline = createAsyncThunk(
    'pipelines/deletePipeline',
    async (id: string, { rejectWithValue }) => {
        try {
            await api.delete(`/pipelines/${id}`);
            return id;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to delete pipeline'));
        }
    }
);

export const addPipelineStage = createAsyncThunk(
    'pipelines/addStage',
    async ({ id, stage }: { id: string; stage: { name: string; order: number } }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/pipelines/${id}/stages`, stage);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to add stage'));
        }
    }
);

export const updatePipelineStage = createAsyncThunk(
    'pipelines/updateStage',
    async ({ id, stageId, data }: { id: string; stageId: string; data: { name?: string; order?: number } }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/pipelines/${id}/stages/${stageId}`, data);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update stage'));
        }
    }
);

export const deletePipelineStage = createAsyncThunk(
    'pipelines/deleteStage',
    async ({ id, stageId }: { id: string; stageId: string }, { rejectWithValue }) => {
        try {
            const response = await api.delete(`/pipelines/${id}/stages/${stageId}`);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to delete stage'));
        }
    }
);

export const reorderPipelineStages = createAsyncThunk(
    'pipelines/reorderStages',
    async ({ id, stages }: { id: string; stages: Array<{ stageId: string; order: number }> }, { rejectWithValue }) => {
        try {
            const response = await api.patch(`/pipelines/${id}/reorder-stages`, { stages });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to reorder stages'));
        }
    }
);

const pipelineSlice = createSlice({
    name: 'pipelines',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchPipelines.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPipelines.fulfilled, (state, action) => {
                state.loading = false;
                const data = action.payload?.data || {};
                const meta = data.meta || {};
                state.pipelines = data.data || [];
                state.pagination = {
                    page: meta.page || 1,
                    limit: meta.limit || 10,
                    total: meta.total || 0,
                    totalPages: meta.totalPages || 0
                };
            })
            .addCase(fetchPipelines.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createPipeline.fulfilled, (state, action) => {
                const pipeline = action.payload.data.pipeline;
                state.pipelines.unshift(pipeline);
            })
            .addCase(updatePipeline.fulfilled, (state, action) => {
                const pipeline = action.payload.data.pipeline;
                const index = state.pipelines.findIndex((item) => item._id === pipeline._id);
                if (index !== -1) {
                    state.pipelines[index] = pipeline;
                }
            })
            .addCase(deletePipeline.fulfilled, (state, action) => {
                state.pipelines = state.pipelines.filter((item) => item._id !== action.payload);
            })
            .addCase(addPipelineStage.fulfilled, (state, action) => {
                const pipeline = action.payload.data.pipeline;
                const index = state.pipelines.findIndex((item) => item._id === pipeline._id);
                if (index !== -1) {
                    state.pipelines[index] = pipeline;
                }
            })
            .addCase(updatePipelineStage.fulfilled, (state, action) => {
                const pipeline = action.payload.data.pipeline;
                const index = state.pipelines.findIndex((item) => item._id === pipeline._id);
                if (index !== -1) {
                    state.pipelines[index] = pipeline;
                }
            })
            .addCase(deletePipelineStage.fulfilled, (state, action) => {
                const pipeline = action.payload.data.pipeline;
                const index = state.pipelines.findIndex((item) => item._id === pipeline._id);
                if (index !== -1) {
                    state.pipelines[index] = pipeline;
                }
            })
            .addCase(reorderPipelineStages.fulfilled, (state, action) => {
                const pipeline = action.payload.data.pipeline;
                const index = state.pipelines.findIndex((item) => item._id === pipeline._id);
                if (index !== -1) {
                    state.pipelines[index] = pipeline;
                }
            });
    }
});

export default pipelineSlice.reducer;
