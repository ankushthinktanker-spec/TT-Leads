import { createCrudSlice, CrudState } from '../createCrudSlice';

export interface Company {
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

export type CompanyState = CrudState<Company>;

const { reducer, actions } = createCrudSlice<Company>({
    name: 'companies',
    endpoint: '/companies',
    entityKey: 'company',
});

// Re-export with original names for backward compatibility
export const fetchCompanies = actions.fetchList;
export const fetchCompany = actions.fetchById;
export const createCompany = actions.create;
export const updateCompany = actions.update;
export const deleteCompany = actions.remove;
export const clearCurrentCompany = actions.clearCurrentItem;
export const clearError = actions.clearError;

export default reducer;
