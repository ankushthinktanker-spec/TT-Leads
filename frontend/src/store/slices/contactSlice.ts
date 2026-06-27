import { createCrudSlice, CrudState } from '../createCrudSlice';

export interface Contact {
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

export type ContactState = CrudState<Contact>;

const { reducer, actions } = createCrudSlice<Contact>({
    name: 'contacts',
    endpoint: '/contacts',
    entityKey: 'contact',
});

// Re-export with original names for backward compatibility
export const fetchContacts = actions.fetchList;
export const fetchContact = actions.fetchById;
export const createContact = actions.create;
export const updateContact = actions.update;
export const deleteContact = actions.remove;
export const clearCurrentContact = actions.clearCurrentItem;
export const clearError = actions.clearError;

export default reducer;
