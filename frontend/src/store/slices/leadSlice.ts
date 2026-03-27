import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';
import { getErrorMessage } from '../../utils/error';

// Define Lead Interface matching backend model
export interface Lead {
    _id: string;
    leadNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    status: string;
    priority: 'Hot' | 'Warm' | 'Cold';
    source: string;
    lostReason?: string;
    leadHealth?: 'UNHEALTHY' | 'OVERDUE' | 'DUE_TODAY' | 'SCHEDULED';
    nextFollowUpDate?: string;
    followUpType?: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING';
    ownerId?: {
        _id: string;
        firstName?: string;
        lastName?: string;
    } | string;
    assignedTo?: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    createdAt: string;
    updatedAt: string;
}

interface LeadState {
    leads: Lead[];
    lead: Lead | null;
    loading: boolean;
    error: string | null;
    total: number;
    page: number;
    pages: number;
}

const initialState: LeadState = {
    leads: [],
    lead: null,
    loading: false,
    error: null,
    total: 0,
    page: 1,
    pages: 1,
};

// Async Thunks
export const fetchLeads = createAsyncThunk(
    'leads/fetchLeads',
    async (
        {
            page = 1,
            limit = 10,
            status,
            search,
            due,
            ownerId,
            source,
            sortBy,
            sortOrder
        }: {
            page?: number;
            limit?: number;
            status?: string;
            search?: string;
            due?: string;
            ownerId?: string;
            source?: string;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
        },
        { rejectWithValue }
    ) => {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });
            if (status) params.append('status', status);
            if (search) params.append('search', search);
            if (due) params.append('due', due);
            if (ownerId) params.append('ownerId', ownerId);
            if (source) params.append('source', source);
            if (sortBy) params.append('sortBy', sortBy);
            if (sortOrder) params.append('sortOrder', sortOrder);

            const response = await axios.get(`/leads?${params.toString()}`);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch leads'));
        }
    }
);

export const fetchLead = createAsyncThunk(
    'leads/fetchLead',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await axios.get(`/leads/${id}`);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch lead'));
        }
    }
);

export const createLead = createAsyncThunk(
    'leads/createLead',
    async (leadData: Partial<Lead>, { rejectWithValue }) => {
        try {
            const response = await axios.post('/leads', leadData);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to create lead'));
        }
    }
);

export const updateLead = createAsyncThunk(
    'leads/updateLead',
    async ({ id, data }: { id: string; data: Partial<Lead> }, { rejectWithValue }) => {
        try {
            const response = await axios.put(`/leads/${id}`, data);
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update lead'));
        }
    }
);

export const updateLeadStatus = createAsyncThunk(
    'leads/updateLeadStatus',
    async ({ id, status, lostReason }: { id: string; status: string; lostReason?: string }, { rejectWithValue }) => {
        try {
            const response = await axios.patch(`/leads/${id}/status`, {
                status,
                ...(lostReason ? { lostReason } : {})
            });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update lead status'));
        }
    }
);

export const updateLeadFollowUp = createAsyncThunk(
    'leads/updateLeadFollowUp',
    async (
        {
            id,
            nextFollowUpAt,
            followUpType,
            note,
            action
        }: { id: string; nextFollowUpAt?: string; followUpType?: string; note?: string; action?: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await axios.patch(`/leads/${id}/followup`, {
                nextFollowUpAt,
                followUpType,
                note,
                action
            });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update follow-up'));
        }
    }
);

export const addLeadNote = createAsyncThunk(
    'leads/addLeadNote',
    async ({ id, note }: { id: string; note: string }, { rejectWithValue }) => {
        try {
            const response = await axios.post(`/leads/${id}/notes`, { note });
            return { id, data: response.data };
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to add note'));
        }
    }
);

export const deleteLead = createAsyncThunk(
    'leads/deleteLead',
    async (id: string, { rejectWithValue }) => {
        try {
            await axios.delete(`/leads/${id}`);
            return id;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to delete lead'));
        }
    }
);

const leadSlice = createSlice({
    name: 'leads',
    initialState,
    reducers: {
        clearCurrentLead: (state) => {
            state.lead = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch Leads
        builder.addCase(fetchLeads.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchLeads.fulfilled, (state, action) => {
            state.loading = false;
            const data = action.payload?.data || {};
            const meta = data.meta || action.payload?.pagination || {};
            state.leads = data.items || data.leads || [];
            state.total = meta?.totalItems ?? meta?.total ?? 0;
            state.page = meta?.page ?? 1;
            state.pages = meta?.totalPages ?? meta?.pages ?? 1;
        });
        builder.addCase(fetchLeads.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload as string;
        });

        // Fetch Single Lead
        builder.addCase(fetchLead.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchLead.fulfilled, (state, action) => {
            state.loading = false;
            state.lead = action.payload.data.lead;
        });
        builder.addCase(fetchLead.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload as string;
        });

        // Create Lead
        builder.addCase(createLead.fulfilled, (state, action) => {
            state.leads.unshift(action.payload.data.lead);
            state.total += 1;
        });

        // Update Lead
        builder.addCase(updateLead.fulfilled, (state, action) => {
            const updatedLead = action.payload.data.lead;
            const index = state.leads.findIndex((l) => l._id === updatedLead._id);
            if (index !== -1) {
                state.leads[index] = updatedLead;
            }
            if (state.lead?._id === updatedLead._id) {
                state.lead = updatedLead;
            }
        });

        // Update Lead Status
        builder.addCase(updateLeadStatus.fulfilled, (state, action) => {
            const updatedLead = action.payload.data.lead;
            const index = state.leads.findIndex((l) => l._id === updatedLead._id);
            if (index !== -1) {
                state.leads[index] = updatedLead;
            }
            if (state.lead?._id === updatedLead._id) {
                state.lead = updatedLead;
            }
        });

        // Update Lead Follow-up
        builder.addCase(updateLeadFollowUp.fulfilled, (state, action) => {
            const updatedLead = action.payload.data.lead;
            const index = state.leads.findIndex((l) => l._id === updatedLead._id);
            if (index !== -1) {
                state.leads[index] = updatedLead;
            }
            if (state.lead?._id === updatedLead._id) {
                state.lead = updatedLead;
            }
        });

        // Delete Lead
        builder.addCase(deleteLead.fulfilled, (state, action) => {
            state.leads = state.leads.filter((l) => l._id !== action.payload);
            state.total -= 1;
        });
    },
});

export const { clearCurrentLead } = leadSlice.actions;
export default leadSlice.reducer;
