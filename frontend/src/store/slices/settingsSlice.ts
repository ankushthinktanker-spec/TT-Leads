import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';

export interface CompanySettings {
    name: string;
    email: string;
    phone: string;
    website: string;
    address: {
        street: string;
        city: string;
        state: string;
        country: string;
        pinCode: string;
    };
    currency: string;
    taxRate: number;
    logo?: string;
}

interface SettingsState {
    company: CompanySettings | null;
    loading: boolean;
    error: string | null;
}

const initialState: SettingsState = {
    company: null,
    loading: false,
    error: null
};

export const fetchCompanySettings = createAsyncThunk(
    'settings/fetchCompany',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/settings/Company');
            return response.data.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch settings'));
        }
    }
);

export const updateCompanySettings = createAsyncThunk(
    'settings/updateCompany',
    async (data: CompanySettings, { rejectWithValue }) => {
        try {
            const response = await api.put('/settings/Company', data);
            return response.data.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update settings'));
        }
    }
);

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
    },
    extraReducers: (builder) => {
        // Fetch
        builder
            .addCase(fetchCompanySettings.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCompanySettings.fulfilled, (state, action) => {
                state.loading = false;
                state.company = action.payload;
            })
            .addCase(fetchCompanySettings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Update
        builder
            .addCase(updateCompanySettings.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateCompanySettings.fulfilled, (state, action) => {
                state.loading = false;
                state.company = action.payload;
            })
            .addCase(updateCompanySettings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    }
});

export default settingsSlice.reducer;
