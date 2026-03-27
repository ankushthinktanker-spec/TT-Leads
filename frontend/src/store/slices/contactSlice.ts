import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

interface Contact {
    _id: string;
    firstName: string;
    lastName: string;
    designation?: string;
    department?: string;
    email: string;
    phone: string;
    alternatePhone?: string;
    whatsapp?: string;
    companyId: { _id?: string; name?: string } | string;
    isPrimary: boolean;
    status: 'Active' | 'Inactive';
    notes?: string;
    createdBy: { _id?: string; firstName?: string; lastName?: string } | string;
    createdAt: string;
    updatedAt: string;
}

interface ContactState {
    contacts: Contact[];
    currentContact: Contact | null;
    loading: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

const initialState: ContactState = {
    contacts: [],
    currentContact: null,
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
export const fetchContacts = createAsyncThunk(
    'contacts/fetchContacts',
    async (params: {
        page?: number;
        limit?: number;
        companyId?: string;
        search?: string;
        status?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    } = {}) => {
        const response = await api.get('/contacts', { params });
        return response.data;
    }
);

const fetchContact = createAsyncThunk(
    'contacts/fetchContact',
    async (id: string) => {
        const response = await api.get(`/contacts/${id}`);
        return response.data;
    }
);

export const createContact = createAsyncThunk(
    'contacts/createContact',
    async (contactData: Partial<Contact>) => {
        const response = await api.post('/contacts', contactData);
        return response.data;
    }
);

export const updateContact = createAsyncThunk(
    'contacts/updateContact',
    async ({ id, data }: { id: string; data: Partial<Contact> }) => {
        const response = await api.put(`/contacts/${id}`, data);
        return response.data;
    }
);

export const deleteContact = createAsyncThunk(
    'contacts/deleteContact',
    async (id: string) => {
        await api.delete(`/contacts/${id}`);
        return id;
    }
);

const contactSlice = createSlice({
    name: 'contacts',
    initialState,
    reducers: {
    },
    extraReducers: (builder) => {
        // Fetch Contacts
        builder.addCase(fetchContacts.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchContacts.fulfilled, (state, action) => {
            state.loading = false;
            const data = action.payload?.data || {};
            const meta = data.meta || action.payload?.pagination || {};
            state.contacts = data.items || data.contacts || [];
            state.pagination = {
                page: meta?.page ?? 1,
                limit: meta?.limit ?? 10,
                total: meta?.totalItems ?? meta?.total ?? 0,
                pages: meta?.totalPages ?? meta?.pages ?? 0
            };
        });
        builder.addCase(fetchContacts.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to fetch contacts';
        });

        // Fetch Contact
        builder.addCase(fetchContact.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchContact.fulfilled, (state, action) => {
            state.loading = false;
            state.currentContact = action.payload.data.contact;
        });
        builder.addCase(fetchContact.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to fetch contact';
        });

        // Create Contact
        builder.addCase(createContact.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(createContact.fulfilled, (state, action) => {
            state.loading = false;
            state.contacts.unshift(action.payload.data.contact);
        });
        builder.addCase(createContact.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to create contact';
        });

        // Update Contact
        builder.addCase(updateContact.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(updateContact.fulfilled, (state, action) => {
            state.loading = false;
            const index = state.contacts.findIndex(c => c._id === action.payload.data.contact._id);
            if (index !== -1) {
                state.contacts[index] = action.payload.data.contact;
            }
            state.currentContact = action.payload.data.contact;
        });
        builder.addCase(updateContact.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to update contact';
        });

        // Delete Contact
        builder.addCase(deleteContact.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(deleteContact.fulfilled, (state, action) => {
            state.loading = false;
            state.contacts = state.contacts.filter(c => c._id !== action.payload);
        });
        builder.addCase(deleteContact.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to delete contact';
        });
    }
});

export default contactSlice.reducer;
