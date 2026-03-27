import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';

interface ReportsState {
    rows: any[];
    loading: boolean;
    error: string | null;
    reportKey: string | null;
}

const initialState: ReportsState = {
    rows: [],
    loading: false,
    error: null,
    reportKey: null
};

export const fetchReport = createAsyncThunk(
    'reports/fetchReport',
    async ({ endpoint, params }: { endpoint: string; params?: Record<string, string | number | boolean> }, { rejectWithValue }) => {
        try {
            const response = await api.get(endpoint, { params });
            return { endpoint, data: response.data.data };
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch report'));
        }
    }
);

const reportsSlice = createSlice({
    name: 'reports',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchReport.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchReport.fulfilled, (state, action) => {
                state.loading = false;
                state.reportKey = action.payload.endpoint;
                state.rows = action.payload.data?.rows || action.payload.data?.leads || action.payload.data || [];
            })
            .addCase(fetchReport.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    }
});

export default reportsSlice.reducer;
