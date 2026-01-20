import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchLeads, deleteLead, updateLeadStatus } from '../../store/slices/leadSlice';
import { fetchUsers } from '../../store/slices/userSlice';
import MainLayout from '../../components/layout/MainLayout';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LEAD_STATUS_OPTIONS } from '../../lib/utils';
import LeadStatusBadge from '../../components/leads/LeadStatusBadge';
import LeadHealthBadge from '../../components/leads/LeadHealthBadge';
import { showToast } from '../../utils/toast';
import LostReasonModal from '../../components/leads/LostReasonModal';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import EmptyState from '../../components/ui/EmptyState';
import { Table, TableHead, TableRow, TableHeadCell, TableBody, TableCell } from '../../components/ui/Table';

export const LeadsPage = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { leads, loading, total, page, pages } = useSelector((state: RootState) => state.leads);
    const { users } = useSelector((state: RootState) => state.users);
    const { user } = useSelector((state: RootState) => state.auth);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({});
    const [dueFilter, setDueFilter] = useState('');
    const [ownerFilter, setOwnerFilter] = useState('');
    const [lostReasonModal, setLostReasonModal] = useState<{ isOpen: boolean; leadId: string | null; status: string | null }>({
        isOpen: false,
        leadId: null,
        status: null,
    });

    useEffect(() => {
        dispatch(fetchLeads({ page: 1, search: searchTerm, status: statusFilter, due: dueFilter, ownerId: ownerFilter }));
    }, [dispatch, searchTerm, statusFilter, dueFilter, ownerFilter]);

    useEffect(() => {
        if (user?.role === 'Admin') {
            dispatch(fetchUsers({ limit: 100 }));
        }
    }, [dispatch, user?.role]);

    const activeFilters = useMemo(() => {
        const filters: string[] = [];
        if (searchTerm.trim()) filters.push(`Search: ${searchTerm.trim()}`);
        if (statusFilter) filters.push(`Status: ${statusFilter}`);
        if (dueFilter) {
            const label =
                dueFilter === 'unhealthy'
                    ? 'Unhealthy'
                    : dueFilter === 'today'
                        ? 'Due Today'
                        : dueFilter === 'overdue'
                            ? 'Overdue'
                            : 'Upcoming';
            filters.push(`Follow-up: ${label}`);
        }
        if (ownerFilter && user?.role === 'Admin') {
            const owner = users.find((item) => item._id === ownerFilter);
            filters.push(`Owner: ${owner ? `${owner.firstName} ${owner.lastName}` : 'Selected'}`);
        }
        return filters;
    }, [searchTerm, statusFilter, dueFilter, ownerFilter, users, user?.role]);

    const hasActiveFilters = activeFilters.length > 0;

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        setDueFilter('');
        setOwnerFilter('');
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value);
    };

    const handleDueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setDueFilter(e.target.value);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this lead?')) {
            await dispatch(deleteLead(id));
        }
    };

    const handleStatusUpdate = async (leadId: string, newStatus: string, currentStatus: string) => {
        if (newStatus === currentStatus) return;

        if (newStatus === 'Lost') {
            setLostReasonModal({ isOpen: true, leadId, status: newStatus });
            return;
        }

        try {
            setStatusUpdating((prev) => ({ ...prev, [leadId]: true }));
            await dispatch(updateLeadStatus({ id: leadId, status: newStatus })).unwrap();
        } catch (error) {
            console.error('Failed to update lead status:', error);
            showToast('Failed to update lead status.', 'error');
        } finally {
            setStatusUpdating((prev) => ({ ...prev, [leadId]: false }));
        }
    };

    const handleConfirmLostReason = async (reason: string) => {
        const { leadId, status } = lostReasonModal;
        if (!leadId || !status) return;

        try {
            setStatusUpdating((prev) => ({ ...prev, [leadId]: true }));
            await dispatch(updateLeadStatus({ id: leadId, status, lostReason: reason })).unwrap();
        } catch (error) {
            console.error('Failed to update lead status:', error);
            showToast('Failed to update lead status.', 'error');
        } finally {
            setStatusUpdating((prev) => ({ ...prev, [leadId]: false }));
            setLostReasonModal({ isOpen: false, leadId: null, status: null });
        }
    };

    const modalLead = lostReasonModal.leadId
        ? leads.find((lead) => lead._id === lostReasonModal.leadId)
        : null;

    return (
        <MainLayout>
            <PageLayout>
                <PageHeader
                    title="Leads"
                    subtitle="Manage and track your potential customers"
                    actions={(
                        <Link to="/leads/new" className="btn btn-primary flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            Add Lead
                        </Link>
                    )}
                />

                <FilterBar className="mt-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search leads..."
                                className="input pl-10"
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <select
                                className="input"
                                value={statusFilter}
                                onChange={handleStatusChange}
                            >
                                <option value="">All Statuses</option>
                                {LEAD_STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="w-full sm:w-48">
                            <select
                                className="input"
                                value={dueFilter}
                                onChange={handleDueChange}
                            >
                                <option value="">All Follow-ups</option>
                                <option value="unhealthy">Unhealthy (No follow-up)</option>
                                <option value="today">Due Today</option>
                                <option value="overdue">Overdue</option>
                                <option value="upcoming">Upcoming (7 days)</option>
                            </select>
                        </div>
                        {user?.role === 'Admin' && (
                            <div className="w-full sm:w-56">
                                <select
                                    className="input"
                                    value={ownerFilter}
                                    onChange={(e) => setOwnerFilter(e.target.value)}
                                >
                                    <option value="">All Owners</option>
                                    {users.map((owner) => (
                                        <option key={owner._id} value={owner._id}>
                                            {owner.firstName} {owner.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
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
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeadCell>Name</TableHeadCell>
                                    <TableHeadCell>Company</TableHeadCell>
                                    <TableHeadCell>Email</TableHeadCell>
                                    <TableHeadCell>Status</TableHeadCell>
                                    <TableHeadCell>Health</TableHeadCell>
                                    <TableHeadCell>Created</TableHeadCell>
                                    <TableHeadCell className="text-right">Actions</TableHeadCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-secondary-500">
                                            Loading leads...
                                        </TableCell>
                                    </TableRow>
                                ) : leads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7}>
                                            <EmptyState
                                                title="No leads found"
                                                description="Try adjusting your filters or create a new lead."
                                            />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    leads.map((lead) => (
                                        <TableRow key={lead._id} className="group">
                                            <TableCell className="font-medium text-secondary-50">
                                                {lead.firstName} {lead.lastName}
                                            </TableCell>
                                            <TableCell>{lead.company}</TableCell>
                                            <TableCell>{lead.email}</TableCell>
                                            <TableCell>
                                                <LeadStatusBadge status={lead.status} className="px-2 py-1" />
                                                <select
                                                    className="mt-2 w-full max-w-[160px] input py-1 text-xs"
                                                    value={lead.status}
                                                    disabled={statusUpdating[lead._id]}
                                                    onChange={(e) => handleStatusUpdate(lead._id, e.target.value, lead.status)}
                                                >
                                                    {LEAD_STATUS_OPTIONS.map((status) => (
                                                        <option key={status} value={status}>
                                                            {status}
                                                        </option>
                                                    ))}
                                                </select>
                                            </TableCell>
                                            <TableCell>
                                                <LeadHealthBadge lead={lead} />
                                            </TableCell>
                                            <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        to={`/leads/${lead._id}`}
                                                        className="icon-button"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <Link
                                                        to={`/leads/${lead._id}/edit`}
                                                        className="icon-button"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        className="icon-button text-red-400 hover:text-red-300"
                                                        title="Delete"
                                                        onClick={() => handleDelete(lead._id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination (Simple implementation) */}
                    <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
                        <div className="text-sm text-secondary-400">
                            Showing <span className="font-medium text-secondary-100">{leads.length}</span> of{' '}
                            <span className="font-medium text-secondary-100">{total}</span> results
                        </div>
                        <div className="flex gap-2">
                            <button
                                className="btn btn-outline py-1.5 px-3 text-xs"
                                disabled={page <= 1}
                                onClick={() => dispatch(fetchLeads({ page: page - 1, search: searchTerm, status: statusFilter, due: dueFilter, ownerId: ownerFilter }))}
                            >
                                Previous
                            </button>
                            <button
                                className="btn btn-outline py-1.5 px-3 text-xs"
                                disabled={page >= pages}
                                onClick={() => dispatch(fetchLeads({ page: page + 1, search: searchTerm, status: statusFilter, due: dueFilter, ownerId: ownerFilter }))}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </SurfaceCard>
            </PageLayout>

            <LostReasonModal
                isOpen={lostReasonModal.isOpen}
                onClose={() => setLostReasonModal({ isOpen: false, leadId: null, status: null })}
                onConfirm={handleConfirmLostReason}
                initialReason={modalLead?.lostReason || ''}
            />
        </MainLayout>
    );
};
