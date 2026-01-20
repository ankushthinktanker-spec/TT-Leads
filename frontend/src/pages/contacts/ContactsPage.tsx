import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchContacts, deleteContact } from '../../store/slices/contactSlice';
import { fetchCompanies } from '../../store/slices/companySlice';
import MainLayout from '../../components/layout/MainLayout';
import { Search, Plus, User, Edit, Trash2, Phone, Mail } from 'lucide-react';
import ContactFormModal from '../../components/contacts/ContactFormModal';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import EmptyState from '../../components/ui/EmptyState';
import { Table, TableHead, TableRow, TableHeadCell, TableBody, TableCell } from '../../components/ui/Table';

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

const ContactsPage = () => {
    const dispatch = useAppDispatch();
    const { contacts, loading, pagination } = useAppSelector((state) => state.contacts);
    const { companies } = useAppSelector((state) => state.companies);

    const [search, setSearch] = useState('');
    const [companyFilter, setCompanyFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState<ContactRecord | null>(null);

    useEffect(() => {
        dispatch(fetchCompanies({ limit: 100 })); // Load companies for filter
    }, [dispatch]);

    useEffect(() => {
        dispatch(fetchContacts({
            page: currentPage,
            limit: 10,
            search,
            companyId: companyFilter,
            status: statusFilter
        }));
    }, [dispatch, currentPage, search, companyFilter, statusFilter]);

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this contact?')) {
            await dispatch(deleteContact(id));
            dispatch(fetchContacts({ page: currentPage }));
        }
    };

    const handleEdit = (contact: ContactRecord) => {
        setEditingContact(contact);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingContact(null);
        dispatch(fetchContacts({ page: currentPage }));
    };

    const activeFilters = useMemo(() => {
        const filters: string[] = [];
        if (search.trim()) filters.push(`Search: ${search.trim()}`);
        if (companyFilter) {
            const company = companies.find((item) => item._id === companyFilter);
            filters.push(`Company: ${company?.name || 'Selected'}`);
        }
        if (statusFilter) filters.push(`Status: ${statusFilter}`);
        return filters;
    }, [search, companyFilter, statusFilter, companies]);

    const hasActiveFilters = activeFilters.length > 0;

    const handleClearFilters = () => {
        setSearch('');
        setCompanyFilter('');
        setStatusFilter('');
    };

    return (
        <MainLayout>
            <PageLayout>
                <PageHeader
                    title="Contacts"
                    subtitle="Manage your contact database"
                    actions={(
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn btn-primary"
                        >
                            <Plus size={20} />
                            Add Contact
                        </button>
                    )}
                />

                <FilterBar className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500" size={20} />
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input pl-10"
                            />
                        </div>

                        <select
                            value={companyFilter}
                            onChange={(e) => setCompanyFilter(e.target.value)}
                            className="input"
                        >
                            <option value="">All Companies</option>
                            {companies.map((company) => (
                                <option key={company._id} value={company._id}>{company.name}</option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input"
                        >
                            <option value="">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </FilterBar>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {activeFilters.map((filter) => (
                        <span key={filter} className="filter-chip">
                            {filter}
                        </span>
                    ))}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="ml-auto text-xs text-primary-400 font-semibold uppercase tracking-widest hover:text-primary-300"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                <SurfaceCard className="mt-6 overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
                        </div>
                    ) : contacts.length === 0 ? (
                        <EmptyState
                            icon={<User size={48} />}
                            title="No contacts found"
                            description="Create your first contact to get started."
                            action={(
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="btn btn-outline"
                                >
                                    Create contact
                                </button>
                            )}
                        />
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableHeadCell>Name</TableHeadCell>
                                            <TableHeadCell>Company</TableHeadCell>
                                            <TableHeadCell>Contact Info</TableHeadCell>
                                            <TableHeadCell>Role</TableHeadCell>
                                            <TableHeadCell>Status</TableHeadCell>
                                            <TableHeadCell className="text-right">Actions</TableHeadCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {contacts.map((contact) => (
                                            <TableRow key={contact._id} className="group">
                                                <TableCell>
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 bg-brand-500/10 rounded-full flex items-center justify-center">
                                                            <User className="text-brand-400" size={20} />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-secondary-100">
                                                                {contact.firstName} {contact.lastName}
                                                                {contact.isPrimary && (
                                                                    <span className="ml-2 px-2 py-0.5 text-[10px] rounded-full bg-brand-500/15 text-brand-300">
                                                                        Primary
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-secondary-500">{contact.designation || '-'}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{contact.companyId?.name || '-'}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 text-sm text-secondary-100">
                                                            <Mail size={14} />
                                                            <a href={`mailto:${contact.email}`} className="text-primary-400 hover:text-primary-300">
                                                                {contact.email}
                                                            </a>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-secondary-500">
                                                            <Phone size={14} />
                                                            <a href={`tel:${contact.phone}`} className="text-secondary-100 hover:text-primary-400">
                                                                {contact.phone}
                                                            </a>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{contact.department || '-'}</TableCell>
                                                <TableCell>
                                                    <span className={`status-pill ${contact.status === 'Active' ? 'status-success' : 'status-neutral'}`}>
                                                        {contact.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(contact)}
                                                            className="icon-button"
                                                            title="Edit"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(contact._id)}
                                                            className="icon-button text-red-400 hover:text-red-300"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {pagination.pages > 1 && (
                                <div className="px-4 py-3 flex items-center justify-between border-t border-white/5">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="btn btn-outline py-1.5 px-3 text-xs"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                                            disabled={currentPage === pagination.pages}
                                            className="btn btn-outline py-1.5 px-3 text-xs"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-secondary-400">
                                                Showing <span className="font-medium text-secondary-100">{(currentPage - 1) * pagination.limit + 1}</span> to{' '}
                                                <span className="font-medium text-secondary-100">{Math.min(currentPage * pagination.limit, pagination.total)}</span> of{' '}
                                                <span className="font-medium text-secondary-100">{pagination.total}</span> results
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="btn btn-outline py-1.5 px-3 text-xs"
                                            >
                                                Previous
                                            </button>
                                            <span className="px-3 py-1.5 text-xs rounded-lg border border-white/5 text-secondary-300">
                                                Page {currentPage} of {pagination.pages}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                                                disabled={currentPage === pagination.pages}
                                                className="btn btn-outline py-1.5 px-3 text-xs"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </SurfaceCard>
            </PageLayout>

            {/* Modal */}
            {showModal && (
                <ContactFormModal
                    contact={editingContact}
                    onClose={handleCloseModal}
                />
            )}
        </MainLayout>
    );
};

export default ContactsPage;
