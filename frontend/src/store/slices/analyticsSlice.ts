import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';

interface DashboardState {
    data: unknown | null;
    loading: boolean;
    error: string | null;
}

const initialState: DashboardState = {
    data: null,
    loading: false,
    error: null
};

export const fetchDashboardAnalytics = createAsyncThunk(
    'analytics/fetchDashboard',
    async (params: Record<string, string | number | undefined> = {}, { rejectWithValue }) => {
        try {
            const response = await api.get('/analytics/dashboard', { params });
            return response.data.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch analytics'));
        }
    }
);

const analyticsSlice = createSlice({
    name: 'analytics',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboardAnalytics.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDashboardAnalytics.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload;
            })
            .addCase(fetchDashboardAnalytics.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    }
});

export default analyticsSlice.reducer;
