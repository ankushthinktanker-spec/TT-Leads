import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../api/axios';

interface ProposalSection {
    _id?: string;
    localId?: string;
    title?: string;
    sectionTitle?: string;
    content: string;
    contentType?: 'richText' | 'table' | 'mixed';
    sectionType?: 'RichText' | 'Table' | 'Mixed' | 'richText' | 'table' | 'mixed';
    order?: number;
    sectionOrder?: number;
    isVisible: boolean;
    includeInTOC?: boolean;
    includeInIndex?: boolean;
}

interface Proposal {
    _id: string;
    proposalNumber: string;
    title: string;
    leadId?: string;
    companyId?: string;
    contactId?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientCompany?: string;
    preparedBy?: {
        name: string;
        designation?: string;
        company: string;
        email?: string;
        phone?: string;
        website?: string;
    };
    clientDetails?: {
        companyName: string;
        contactPerson?: string;
        designation?: string;
        email?: string;
        phone?: string;
        address?: string;
    };
    proposalDate?: string;
    validTill?: string;
    validUntil?: string;
    currency?: string;
    status: 'Draft' | 'Sent' | 'Under Review' | 'Accepted' | 'Rejected';
    totalAmount?: number;
    totalValue?: number;
    tocDepth?: number;
    logoUrl?: string;
    headerText?: string;
    footerLine1?: string;
    footerLine2?: string;
    showPageNumbers?: boolean;
    sections: ProposalSection[];
    generatedPdfPath?: string;
    generatedPdfSize?: number;
    lastGeneratedAt?: string;
    pdfBranding?: {
        logoUrl?: string;
        headerText?: string;
        footerText?: string;
    };
    version: number;
    parentProposalId?: string;
    createdAt: string;
    updatedAt: string;
}

interface ProposalState {
    proposals: Proposal[];
    currentProposal: Proposal | null;
    loading: boolean;
    error: string | null;
    pagination: {
        total: number;
        page: number;
        pages: number;
        limit: number;
    };
}

interface ProposalListPayload {
    proposals?: Proposal[];
    pagination: {
        total?: number;
        page?: number;
        pages?: number;
        limit?: number;
    };
}

interface ProposalDetailPayload {
    proposal: Proposal;
    sections?: ProposalSectionApi[];
}

interface ProposalItemPayload {
    proposal: Proposal;
}

interface SectionItemPayload {
    section: ProposalSectionApi;
}

type ProposalSectionApi = ProposalSection & {
    sectionTitle?: string;
    sectionType?: ProposalSection['sectionType'];
    sectionOrder?: number;
    includeInIndex?: boolean;
    localId?: string;
};

const initialState: ProposalState = {
    proposals: [],
    currentProposal: null,
    loading: false,
    error: null,
    pagination: {
        total: 0,
        page: 1,
        pages: 1,
        limit: 10,
    },
};

// Async thunks
export const fetchProposals = createAsyncThunk(
    'proposals/fetchAll',
    async (params: {
        page?: number;
        limit?: number;
        status?: string;
        leadId?: string;
        search?: string;
    } = {}) => {
        const response = await api.get('/proposals', { params });
        return response.data;
    }
);

export const fetchProposalById = createAsyncThunk(
    'proposals/fetchById',
    async (id: string) => {
        const response = await api.get(`/proposals/${id}`);
        return response.data;
    }
);

export const createProposal = createAsyncThunk(
    'proposals/create',
    async (data: Partial<Proposal>) => {
        const response = await api.post('/proposals', data);
        return response.data;
    }
);

export const updateProposal = createAsyncThunk(
    'proposals/update',
    async ({ id, data }: { id: string; data: Partial<Proposal> }) => {
        const response = await api.put(`/proposals/${id}`, data);
        return response.data;
    }
);

export const deleteProposal = createAsyncThunk(
    'proposals/delete',
    async (id: string) => {
        await api.delete(`/proposals/${id}`);
        return id;
    }
);

export const duplicateProposal = createAsyncThunk(
    'proposals/duplicate',
    async (id: string) => {
        const response = await api.post(`/proposals/${id}/duplicate`);
        return response.data;
    }
);

export const generateProposalPDF = createAsyncThunk(
    'proposals/generatePDF',
    async (id: string) => {
        const response = await api.post(`/proposals/${id}/generate-pdf`);
        return response.data;
    }
);

const addSection = createAsyncThunk(
    'proposals/addSection',
    async ({ proposalId, section }: { proposalId: string; section: Partial<ProposalSection> }) => {
        const response = await api.post(`/proposals/${proposalId}/sections`, section);
        return response.data;
    }
);

const updateSection = createAsyncThunk(
    'proposals/updateSection',
    async ({ proposalId, sectionId, data }: { proposalId: string; sectionId: string; data: Partial<ProposalSection> }) => {
        const response = await api.put(`/proposals/${proposalId}/sections/${sectionId}`, data);
        return response.data;
    }
);

export const deleteSection = createAsyncThunk(
    'proposals/deleteSection',
    async ({ proposalId, sectionId }: { proposalId: string; sectionId: string }) => {
        await api.delete(`/proposals/${proposalId}/sections/${sectionId}`);
        return { proposalId, sectionId };
    }
);

const reorderSections = createAsyncThunk(
    'proposals/reorderSections',
    async ({ proposalId, sectionOrders }: { proposalId: string; sectionOrders: { sectionId: string; newOrder: number }[] }) => {
        const response = await api.post(`/proposals/${proposalId}/sections/reorder`, { sectionOrders });
        return response.data;
    }
);

const proposalSlice = createSlice({
    name: 'proposals',
    initialState,
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            // Fetch all proposals
            .addCase(fetchProposals.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProposals.fulfilled, (state, action: PayloadAction<{ data: ProposalListPayload }>) => {
                state.loading = false;
                state.proposals = action.payload.data.proposals || [];
                state.pagination = {
                    total: action.payload.data.pagination.total || 0,
                    page: action.payload.data.pagination.page || 1,
                    pages: action.payload.data.pagination.pages || 1,
                    limit: action.payload.data.pagination.limit || 10,
                };
            })
            .addCase(fetchProposals.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch proposals';
            })
            // Fetch proposal by ID
            .addCase(fetchProposalById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProposalById.fulfilled, (state, action: PayloadAction<{ data: ProposalDetailPayload }>) => {
                state.loading = false;
                const proposal = action.payload.data.proposal;
                const sections = action.payload.data.sections || [];
                state.currentProposal = {
                    ...proposal,
                    sections: sections.map((section: ProposalSectionApi) => ({
                        ...section,
                        title: section.sectionTitle,
                        contentType: section.sectionType,
                        order: section.sectionOrder,
                        includeInTOC: section.includeInIndex,
                        localId: section.localId
                    }))
                };
            })
            .addCase(fetchProposalById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch proposal';
            })
            // Create proposal
            .addCase(createProposal.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createProposal.fulfilled, (state, action: PayloadAction<{ data: ProposalItemPayload }>) => {
                state.loading = false;
                state.proposals.unshift(action.payload.data.proposal);
            })
            .addCase(createProposal.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to create proposal';
            })
            // Update proposal
            .addCase(updateProposal.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateProposal.fulfilled, (state, action: PayloadAction<{ data: ProposalItemPayload }>) => {
                state.loading = false;
                const updatedProposal = action.payload.data.proposal;
                const index = state.proposals.findIndex(p => p._id === updatedProposal._id);
                if (index !== -1) {
                    state.proposals[index] = updatedProposal;
                }
                if (state.currentProposal?._id === updatedProposal._id) {
                    state.currentProposal = {
                        ...state.currentProposal,
                        ...updatedProposal
                    };
                }
            })
            .addCase(updateProposal.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to update proposal';
            })
            // Delete proposal
            .addCase(deleteProposal.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteProposal.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.proposals = state.proposals.filter(p => p._id !== action.payload);
            })
            .addCase(deleteProposal.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to delete proposal';
            })
            // Duplicate proposal
            .addCase(duplicateProposal.fulfilled, (state, action: PayloadAction<{ data: ProposalItemPayload }>) => {
                state.proposals.unshift(action.payload.data.proposal);
            })
            // Add section
            .addCase(addSection.fulfilled, (state, action: PayloadAction<{ data: SectionItemPayload }>) => {
                if (state.currentProposal) {
                    const section = action.payload.data.section;
                    state.currentProposal.sections.push({
                        ...section,
                        title: section.sectionTitle,
                        contentType: section.sectionType,
                        order: section.sectionOrder,
                        includeInTOC: section.includeInIndex,
                        localId: section.localId
                    });
                }
            })
            // Update section
            .addCase(updateSection.fulfilled, (state, action: PayloadAction<{ data: SectionItemPayload }>) => {
                if (state.currentProposal) {
                    const updatedSection = action.payload.data.section;
                    const index = state.currentProposal.sections.findIndex(
                        (section) => section._id === updatedSection._id
                    );
                    if (index !== -1) {
                        state.currentProposal.sections[index] = {
                            ...updatedSection,
                            title: updatedSection.sectionTitle,
                            contentType: updatedSection.sectionType,
                            order: updatedSection.sectionOrder,
                            includeInTOC: updatedSection.includeInIndex,
                            localId: updatedSection.localId
                        };
                    }
                }
            })
            // Delete section
            .addCase(deleteSection.fulfilled, (state, action: PayloadAction<{ proposalId: string; sectionId: string }>) => {
                if (state.currentProposal && state.currentProposal._id === action.payload.proposalId) {
                    state.currentProposal.sections = state.currentProposal.sections.filter(
                        s => s._id !== action.payload.sectionId
                    );
                }
            })
            // Reorder sections
            .addCase(reorderSections.fulfilled, (state, action: PayloadAction<unknown, string, { arg: { sectionOrders: { sectionId: string; newOrder: number }[] } }>) => {
                if (state.currentProposal) {
                    const sectionOrders: { sectionId: string; newOrder: number }[] = action.meta?.arg?.sectionOrders || [];
                    sectionOrders.forEach(({ sectionId, newOrder }) => {
                        const section = state.currentProposal?.sections.find((s) => s._id === sectionId);
                        if (section) {
                            section.order = newOrder;
                            section.sectionOrder = newOrder;
                        }
                    });
                    state.currentProposal.sections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                }
            });
    },
});

export default proposalSlice.reducer;

