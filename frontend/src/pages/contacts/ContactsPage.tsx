import { useEffect, useMemo, useState } from 'react';
import { Building2, Edit, Mail, Phone, Trash2, User, Plus, Inbox } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchContacts, deleteContact } from '../../store/slices/contactSlice';
import { fetchCompanies } from '../../store/slices/companySlice';
import ContactFormModal from '../../components/contacts/ContactFormModal';
import { useGlobalSearch } from '../../context/GlobalSearchContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { showToast } from '../../utils/toast';
import {
    ModulePageShell,
    ModulePageHeader,
    ModuleToolbar,
    ModuleSummaryCards,
    ModuleDataTable,
    ModuleBadge,
    ModuleRowActions,
    type ModuleColumnDef,
    type ActiveFilter,
    type SummaryCardItem,
    type SortOrder
} from '../../components/module-system';

interface ContactRecord {
    _id: string;
    firstName: string;
    lastName: string;
    designation?: string;
    department?: string;
    email: string;
    phone: string;
    companyId?: { _id?: string; name?: string } | string;
    isPrimary?: boolean;
    status: 'Active' | 'Inactive';
}

export const ContactsPage = () => {
    const dispatch = useAppDispatch();
    const { contacts, loading, error, pagination } = useAppSelector((state) => state.contacts);
    const { companies } = useAppSelector((state) => state.companies);
    const safePagination = pagination ?? { page: 1, pages: 1, total: 0, limit: 10 };

    const { value: search, setValue: setSearch } = useGlobalSearch();
    const [companyFilter, setCompanyFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState<ContactRecord | undefined>(undefined);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchCompanies({ limit: 100 }));
    }, [dispatch]);

    useEffect(() => {
        dispatch(fetchContacts({
            page: currentPage,
            limit: 20,
            search,
            companyId: companyFilter,
            status: statusFilter,
            sortBy: 'createdAt',
            sortOrder
        }));
    }, [dispatch, currentPage, search, companyFilter, statusFilter, sortOrder]);

    const activeFilters: ActiveFilter[] = [
        ...(search.trim() ? [{ key: 'search', label: `Search: "${search.trim()}"`, onRemove: () => setSearch('') }] : []),
        ...(companyFilter ? [{ 
            key: 'company', 
            label: `Company: ${companies.find((c) => c._id === companyFilter)?.name || 'Selected'}`, 
            onRemove: () => setCompanyFilter('') 
        }] : []),
        ...(statusFilter ? [{ key: 'status', label: `Status: ${statusFilter}`, onRemove: () => setStatusFilter('') }] : []),
    ];

    const handleClearFilters = () => {
        setSearch('');
        setCompanyFilter('');
        setStatusFilter('');
        setCurrentPage(1);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await dispatch(deleteContact(deleteId));
        setDeleteId(null);
        dispatch(fetchContacts({ page: currentPage, limit: 20, search, companyId: companyFilter, status: statusFilter, sortBy: 'createdAt', sortOrder }));
        showToast('Contact deleted successfully.', 'success');
    };

    const handleEdit = (contact: ContactRecord) => {
        setEditingContact(contact);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingContact(undefined);
        dispatch(fetchContacts({ page: currentPage, limit: 20, search, companyId: companyFilter, status: statusFilter, sortBy: 'createdAt', sortOrder }));
    };

    const activeContacts = contacts.filter((contact) => contact.status === 'Active').length;
    const primaryContacts = contacts.filter((contact) => contact.isPrimary).length;
    const companyCoverage = useMemo(
        () => new Set(
            contacts
                .map((contact) => typeof contact.companyId === 'string' ? contact.companyId : contact.companyId?._id)
                .filter(Boolean)
        ).size,
        [contacts]
    );

    const summaryCards: SummaryCardItem[] = [
        { label: 'Total Contacts', value: safePagination.total, icon: <User size={18} />, variant: 'primary' },
        { label: 'Active', value: activeContacts, icon: <User size={18} />, variant: 'success' },
        { label: 'Primary Contacts', value: primaryContacts, icon: <User size={18} />, variant: 'purple' },
        { label: 'Companies Connected', value: companyCoverage, icon: <Building2 size={18} />, variant: 'info' },
    ];

    const columns: ModuleColumnDef<ContactRecord>[] = [
        {
            id: 'name',
            header: 'Name',
            width: '30%',
            cell: (contact) => (
                <button
                    type="button"
                    className="mod-table__lead-cell"
                    onClick={() => handleEdit(contact)}
                >
                    <div className="mod-table__avatar mod-table__avatar--green">
                        <User size={16} />
                    </div>
                    <div style={{ minWidth: 0, textAlign: 'left' }}>
                        <div className="mod-table__primary-text">
                            {contact.firstName} {contact.lastName}
                            {contact.isPrimary && (
                                <span style={{ marginLeft: 8 }} className="mod-badge mod-badge--neutral mod-badge--dot">
                                    Primary
                                </span>
                            )}
                        </div>
                        <div className="mod-table__secondary-text">
                            {contact.designation || '-'}
                        </div>
                    </div>
                </button>
            )
        },
        {
            id: 'company',
            header: 'Company',
            width: '18%',
            cell: (contact) => (
                <div className="mod-table__primary-text" style={{ fontSize: 13 }}>
                    {typeof contact.companyId === 'string' ? contact.companyId : contact.companyId?.name || '-'}
                </div>
            )
        },
        {
            id: 'contact',
            header: 'Contact',
            width: '26%',
            cell: (contact) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[13px] text-slate-700">
                        <Mail size={12} style={{ color: 'var(--mod-text-muted)' }} />
                        <a href={`mailto:${contact.email}`} className="truncate hover:text-blue-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                            {contact.email}
                        </a>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Phone size={12} style={{ color: 'var(--mod-text-muted)' }} />
                        <a href={`tel:${contact.phone}`} className="truncate hover:text-blue-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                            {contact.phone}
                        </a>
                    </div>
                </div>
            )
        },
        {
            id: 'role',
            header: 'Role',
            width: '14%',
            cell: (contact) => (
                <div className="mod-table__primary-text" style={{ fontSize: 13 }}>
                    {contact.department || '-'}
                </div>
            )
        },
        {
            id: 'status',
            header: 'Status',
            width: '10%',
            cell: (contact) => (
                <ModuleBadge variant={contact.status === 'Active' ? 'success' : 'neutral'}>
                    {contact.status}
                </ModuleBadge>
            )
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            width: '80px',
            cell: (contact) => (
                <ModuleRowActions
                    actions={[
                        {
                            label: 'Edit contact',
                            icon: <Edit size={14} />,
                            onClick: () => handleEdit(contact)
                        },
                        {
                            label: 'Delete',
                            icon: <Trash2 size={14} />,
                            onClick: () => setDeleteId(contact._id),
                            danger: true,
                            divider: true
                        }
                    ]}
                />
            )
        }
    ];

    return (
        <ModulePageShell>
            <ModulePageHeader
                eyebrow="CRM · Contacts"
                title="Contacts"
                description="Keep decision-makers, primary stakeholders, and company-linked communication records in one tighter operator view."
                actions={
                    <button
                        className="mod-btn mod-btn--primary"
                        onClick={() => {
                            setEditingContact(undefined);
                            setShowModal(true);
                        }}
                    >
                        <Plus size={14} /> Add Contact
                    </button>
                }
            />

            <ModuleSummaryCards cards={summaryCards} />

            <ModuleToolbar
                searchValue={search}
                searchPlaceholder="Search contacts, email, company..."
                onSearchChange={setSearch}
                activeFilters={activeFilters}
                onClearAllFilters={handleClearFilters}
                totalCount={safePagination.total}
                countLabel="contacts"
                filterContent={
                    <>
                        <div>
                            <label className="mod-filter-panel__field-label">Company</label>
                            <select
                                className="mod-toolbar__select"
                                style={{ width: '100%' }}
                                value={companyFilter}
                                onChange={(e) => setCompanyFilter(e.target.value)}
                            >
                                <option value="">All companies</option>
                                {companies.map((company) => (
                                    <option key={company._id} value={company._id}>{company.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mod-filter-panel__field-label">Status</label>
                            <select
                                className="mod-toolbar__select"
                                style={{ width: '100%' }}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All statuses</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </>
                }
            >
                <select
                    className="mod-toolbar__select"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                >
                    <option value="">All companies</option>
                    {companies.map((company) => (
                        <option key={company._id} value={company._id}>{company.name}</option>
                    ))}
                </select>

                <select
                    className="mod-toolbar__select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">All statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
            </ModuleToolbar>

            {error && (
                <div style={{
                    padding: '12px 16px',
                    background: 'var(--mod-danger-light)',
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--mod-radius-lg)',
                    color: 'var(--mod-danger-text)',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 16
                }}>
                    {error}
                </div>
            )}

            <ModuleDataTable
                rows={contacts}
                columns={columns}
                rowKey={(contact) => contact._id}
                loading={loading}
                error={null}
                tableTitle="Contact Directory"
                tableBadge={`${contacts.length} visible`}
                emptyTitle="No contacts yet"
                emptyDescription="Add your first contact to start managing decision-makers and communication history."
                emptyIcon={<Inbox size={28} />}
                emptyAction={
                    <button
                        className="mod-btn mod-btn--primary"
                        onClick={() => {
                            setEditingContact(undefined);
                            setShowModal(true);
                        }}
                    >
                        <Plus size={14} /> Add Contact
                    </button>
                }
                page={safePagination.page}
                totalPages={safePagination.pages}
                totalItems={safePagination.total}
                onPageChange={(nextPage) => setCurrentPage(nextPage)}
                onRowClick={(contact) => handleEdit(contact)}
            />

            <ConfirmDialog
                open={!!deleteId}
                title="Delete contact"
                message="Are you sure you want to delete this contact? This action cannot be undone."
                confirmLabel="Delete contact"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
            />

            {showModal && (
                <ContactFormModal
                    contact={editingContact}
                    onClose={handleCloseModal}
                />
            )}
        </ModulePageShell>
    );
};

export default ContactsPage;
