import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

interface Company {
    _id: string;
    name: string;
    website?: string;
    industry?: string;
    companySize?: string;
    address: {
        street?: string;
        city?: string;
        state?: string;
        country: string;
        pinCode?: string;
    };
    phone?: string;
    email?: string;
    gst?: string;
    pan?: string;
    registrationNumber?: string;
    tags: string[];
    status: 'Active' | 'Inactive';
    createdBy: { _id?: string; firstName?: string; lastName?: string } | string;
    createdAt: string;
    updatedAt: string;
}

interface CompanyState {
    companies: Company[];
    currentCompany: Company | null;
    loading: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

const initialState: CompanyState = {
    companies: [],
    currentCompany: null,
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
    }
};

// Async thunks
export const fetchCompanies = createAsyncThunk(
    'companies/fetchCompanies',
    async (params: {
        page?: number;
        limit?: number;
        search?: string;
        industry?: string;
        companySize?: string;
        status?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    } = {}) => {
        const response = await api.get('/companies', { params });
        return response.data;
    }
);

export const fetchCompany = createAsyncThunk(
    'companies/fetchCompany',
    async (id: string) => {
        const response = await api.get(`/companies/${id}`);
        return response.data;
    }
);

export const createCompany = createAsyncThunk(
    'companies/createCompany',
    async (companyData: Partial<Company>) => {
        const response = await api.post('/companies', companyData);
        return response.data;
    }
);

export const updateCompany = createAsyncThunk(
    'companies/updateCompany',
    async ({ id, data }: { id: string; data: Partial<Company> }) => {
        const response = await api.put(`/companies/${id}`, data);
        return response.data;
    }
);

export const deleteCompany = createAsyncThunk(
    'companies/deleteCompany',
    async (id: string) => {
        await api.delete(`/companies/${id}`);
        return id;
    }
);

const companySlice = createSlice({
    name: 'companies',
    initialState,
    reducers: {
        clearCurrentCompany: (state) => {
            state.currentCompany = null;
        }
    },
    extraReducers: (builder) => {
        // Fetch Companies
        builder.addCase(fetchCompanies.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchCompanies.fulfilled, (state, action) => {
            state.loading = false;
            const data = action.payload?.data || {};
            const meta = data.meta || action.payload?.pagination || {};
            state.companies = data.items || data.companies || [];
            state.pagination = {
                page: meta?.page ?? 1,
                limit: meta?.limit ?? 10,
                total: meta?.totalItems ?? meta?.total ?? 0,
                pages: meta?.totalPages ?? meta?.pages ?? 0
            };
        });
        builder.addCase(fetchCompanies.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to fetch companies';
        });

        // Fetch Company
        builder.addCase(fetchCompany.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchCompany.fulfilled, (state, action) => {
            state.loading = false;
            state.currentCompany = action.payload.data.company;
        });
        builder.addCase(fetchCompany.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to fetch company';
        });

        // Create Company
        builder.addCase(createCompany.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(createCompany.fulfilled, (state, action) => {
            state.loading = false;
            state.companies.unshift(action.payload.data.company);
        });
        builder.addCase(createCompany.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to create company';
        });

        // Update Company
        builder.addCase(updateCompany.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(updateCompany.fulfilled, (state, action) => {
            state.loading = false;
            const index = state.companies.findIndex(c => c._id === action.payload.data.company._id);
            if (index !== -1) {
                state.companies[index] = action.payload.data.company;
            }
            state.currentCompany = action.payload.data.company;
        });
        builder.addCase(updateCompany.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to update company';
        });

        // Delete Company
        builder.addCase(deleteCompany.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(deleteCompany.fulfilled, (state, action) => {
            state.loading = false;
            state.companies = state.companies.filter(c => c._id !== action.payload);
        });
        builder.addCase(deleteCompany.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to delete company';
        });
    }
});

export const { clearCurrentCompany } = companySlice.actions;
export default companySlice.reducer;
