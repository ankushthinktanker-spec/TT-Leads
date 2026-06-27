import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2, Calendar, Download, Eye, FileEdit, Inbox,
    Mail, MessageCircle, Phone, Plus, Trash2, Upload, Users2
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchLeads, deleteLead } from '../../store/slices/leadSlice';
import { fetchUsers } from '../../store/slices/userSlice';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useGlobalSearch } from '../../context/GlobalSearchContext';
import { ROUTES } from '../../routes';
import { showToast } from '../../utils/toast';
import {
    ModulePageShell,
    ModulePageHeader,
    ModuleToolbar,
    ModuleFilterDropdown,
    ModuleSummaryCards,
    ModuleDataTable,
    ModuleBadge,
    ModuleRowActions,
    type ModuleColumnDef,
    type ActiveFilter,
    type SummaryCardItem,
} from '../../components/module-system';

/* ─── Helpers ─── */
const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const statusConfig: Record<string, { variant: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple'; label: string }> = {
    New: { variant: 'neutral', label: 'New' },
    Contacted: { variant: 'info', label: 'Contacted' },
    Qualified: { variant: 'success', label: 'Qualified' },
    'Needs Analysis': { variant: 'purple', label: 'Analysis' },
    'Proposal Sent': { variant: 'warning', label: 'Proposal' },
    Negotiation: { variant: 'warning', label: 'Negotiation' },
    Won: { variant: 'success', label: 'Won' },
    Lost: { variant: 'danger', label: 'Lost' },
    Nurture: { variant: 'info', label: 'Nurture' },
};

const avatarColors = ['blue', 'green', 'purple', 'orange'] as const;
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

const getDateRangeParams = (range: string): { startDate?: string; endDate?: string } => {
    if (!range) return {};
    const days = Number(range);
    if (!Number.isFinite(days) || days <= 0) return {};

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
    };
};

/* ─── Page Component ─── */
export const LeadsPage = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const { leads, loading, error, page, totalPages, total } = useAppSelector((s) => s.leads);
    const { users } = useAppSelector((s) => s.users);
    const { value: query, setValue: setQuery } = useGlobalSearch();

    const [status, setStatus] = useState('');
    const [ownerId, setOwnerId] = useState('');
    const [source, setSource] = useState('');
    const [dateRange, setDateRange] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => { dispatch(fetchUsers({ limit: 100 })); }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const dateRangeParams = getDateRangeParams(dateRange);
            dispatch(fetchLeads({
                page: 1, limit: 20, search: query, status, ownerId, source,
                ...dateRangeParams,
                sortBy: 'createdAt', sortOrder,
            }));
        }, 300);
        return () => clearTimeout(timer);
    }, [dispatch, query, status, ownerId, source, dateRange, sortOrder]);

    const uniqueSources = useMemo(() =>
        Array.from(new Set(leads.map((l) => l.source).filter(Boolean))).sort(),
        [leads]
    );

    const sourceOptions = [
        { value: '', label: 'All sources' },
        ...uniqueSources.map((item) => ({ value: item, label: item })),
    ];

    const dateRangeOptions = [
        { value: '', label: 'All time' },
        { value: '7', label: 'Last 7 days' },
        { value: '30', label: 'Last 30 days' },
        { value: '90', label: 'Last 90 days' },
    ];

    const statusOptions = [
        { value: '', label: 'All statuses' },
        { value: 'New', label: 'New' },
        { value: 'Contacted', label: 'Contacted' },
        { value: 'Qualified', label: 'Qualified' },
        { value: 'Proposal Sent', label: 'Proposal Sent' },
        { value: 'Won', label: 'Won' },
        { value: 'Lost', label: 'Lost' },
    ];

    const ownerOptions = [
        { value: '', label: 'All owners' },
        ...users.map((user) => ({ value: user._id, label: `${user.firstName} ${user.lastName}`.trim() })),
    ];

    /* ─── Metrics ─── */
    const activeLeads = leads.filter((l) => !['Won', 'Lost'].includes(l.status)).length;
    const qualifiedLeads = leads.filter((l) => l.status === 'Qualified').length;
    const companiesInView = new Set(leads.map((l) => l.company).filter(Boolean)).size;
    const followUpDue = leads.filter((l) => {
        if (!l.nextFollowUpDate) return false;
        return new Date(l.nextFollowUpDate) <= new Date();
    }).length;

    /* ─── Active Filters ─── */
    const activeFilters: ActiveFilter[] = [
        ...(query.trim() ? [{ key: 'search', label: `Search: "${query.trim()}"`, onRemove: () => setQuery('') }] : []),
        ...(status ? [{ key: 'status', label: `Status: ${status}`, onRemove: () => setStatus('') }] : []),
        ...(ownerId ? [{
            key: 'owner',
            label: `Owner: ${users.find((u) => u._id === ownerId)
                ? `${users.find((u) => u._id === ownerId)?.firstName} ${users.find((u) => u._id === ownerId)?.lastName}`
                : 'Selected'
            }`,
            onRemove: () => setOwnerId(''),
        }] : []),
        ...(source ? [{ key: 'source', label: `Source: ${source}`, onRemove: () => setSource('') }] : []),
        ...(dateRange ? [{ key: 'date', label: `Last ${dateRange} days`, onRemove: () => setDateRange('') }] : []),
    ];

    const clearFilters = () => {
        setQuery(''); setStatus(''); setOwnerId('');
        setSource(''); setDateRange(''); setSortOrder('desc');
    };

    /* ─── Quick Actions ─── */
    const handleQuickCall = (phone?: string) => {
        if (!phone) { showToast('Phone number not available.', 'info'); return; }
        window.location.href = `tel:${phone}`;
    };

    const handleQuickWhatsApp = (phone?: string) => {
        if (!phone) { showToast('Phone number not available.', 'info'); return; }
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank', 'noopener,noreferrer');
    };

    const handleQuickEmail = (email?: string) => {
        if (!email) { showToast('Email not available.', 'info'); return; }
        window.location.href = `mailto:${email}`;
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await dispatch(deleteLead(deleteId)).unwrap();
            setDeleteId(null);
            showToast('Lead deleted successfully.', 'success');
        } catch {
            showToast('Failed to delete lead.', 'error');
        }
    };

    /* ─── Summary Cards ─── */
    const summaryCards: SummaryCardItem[] = [
        { label: 'Total Leads', value: total, icon: <Users2 size={18} />, variant: 'primary' },
        { label: 'Active', value: activeLeads, icon: <Users2 size={18} />, variant: 'info' },
        { label: 'Qualified', value: qualifiedLeads, icon: <Users2 size={18} />, variant: 'success' },
        { label: 'Follow-up Due', value: followUpDue, icon: <Calendar size={18} />, variant: 'warning' },
        { label: 'Companies', value: companiesInView, icon: <Building2 size={18} />, variant: 'purple' },
    ];

    /* ─── Columns ─── */
    const columns: ModuleColumnDef<(typeof leads)[number]>[] = [
        {
            id: 'lead',
            header: 'Lead',
            width: '30%',
            cell: (lead) => {
                const initials = `${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`;
                const color = getAvatarColor(lead.firstName || 'A');
                return (
                    <button
                        type="button"
                        className="mod-table__lead-cell"
                        onClick={() => navigate(`${ROUTES.leads}/${lead._id}`)}
                    >
                        <div className={`mod-table__avatar mod-table__avatar--${color}`}>
                            {initials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div className="mod-table__primary-text">
                                {lead.firstName} {lead.lastName}
                            </div>
                            <div className="mod-table__secondary-text">
                                {lead.company || 'Direct'} - {lead.source || '-'}
                            </div>
                        </div>
                    </button>
                );
            },
        },
        {
            id: 'status',
            header: 'Status',
            width: '12%',
            cell: (lead) => {
                const cfg = statusConfig[lead.status] || { variant: 'neutral' as const, label: lead.status };
                return <ModuleBadge variant={cfg.variant}>{cfg.label}</ModuleBadge>;
            },
        },
        {
            id: 'owner',
            header: 'Owner',
            width: '18%',
            cell: (lead) => {
                const ownerName = typeof lead.ownerId === 'object'
                    ? `${lead.ownerId.firstName || ''} ${lead.ownerId.lastName || ''}`.trim()
                    : '';
                return (
                    <div>
                        <div className="mod-table__primary-text" style={{ fontSize: 13 }}>
                            {ownerName || 'Unassigned'}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'followup',
            header: 'Follow-up',
            width: '15%',
            cell: (lead) => {
                if (!lead.nextFollowUpDate) return <span style={{ color: 'var(--mod-text-subtle)' }}>-</span>;
                const isPast = new Date(lead.nextFollowUpDate) < new Date();
                return (
                    <div>
                        <div className="mod-table__primary-text" style={{
                            fontSize: 12.5,
                            color: isPast ? 'var(--mod-danger)' : 'var(--mod-text-secondary)',
                        }}>
                            {formatDate(lead.nextFollowUpDate)}
                        </div>
                        {isPast && (
                            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--mod-danger)', marginTop: 1 }}>
                                Overdue
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'updated',
            header: 'Updated',
            width: '12%',
            cell: (lead) => (
                <span style={{ fontSize: 12.5, color: 'var(--mod-text-muted)' }}>
                    {formatDate(lead.updatedAt)}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            width: '80px',
            cell: (lead) => (
                <ModuleRowActions
                    primaryAction={{
                        icon: <Phone size={14} />,
                        label: 'Call',
                        onClick: () => handleQuickCall(lead.phone),
                    }}
                    actions={[
                        {
                            label: 'View details',
                            icon: <Eye size={14} />,
                            onClick: () => navigate(`${ROUTES.leads}/${lead._id}`),
                        },
                        {
                            label: 'Edit lead',
                            icon: <FileEdit size={14} />,
                            onClick: () => navigate(`${ROUTES.leads}/${lead._id}/edit`),
                        },
                        {
                            label: 'WhatsApp',
                            icon: <MessageCircle size={14} />,
                            onClick: () => handleQuickWhatsApp(lead.phone),
                        },
                        {
                            label: 'Send email',
                            icon: <Mail size={14} />,
                            onClick: () => handleQuickEmail(lead.email),
                        },
                        {
                            label: 'Delete',
                            icon: <Trash2 size={14} />,
                            onClick: () => setDeleteId(lead._id),
                            danger: true,
                            divider: true,
                        },
                    ]}
                />
            ),
        },
    ];

    return (
        <ModulePageShell>
            {/* ─── Page Header ─── */}
            <ModulePageHeader
                eyebrow="CRM / Leads"
                title="Leads"
                description="Track ownership, qualification progress, and follow-up activity across your pipeline."
                actions={
                    <>
                        <button
                            className="mod-btn mod-btn--secondary"
                            onClick={() => showToast('Import tool available in settings.', 'info')}
                        >
                            <Upload size={14} /> Import
                        </button>
                        <button
                            className="mod-btn mod-btn--secondary"
                            onClick={() => showToast('Export will be available soon.', 'info')}
                        >
                            <Download size={14} /> Export
                        </button>
                        <button
                            className="mod-btn mod-btn--primary"
                            onClick={() => navigate(`${ROUTES.leads}/new`)}
                        >
                            <Plus size={14} /> Add Lead
                        </button>
                    </>
                }
            />

            {/* ─── Summary Cards ─── */}
            <ModuleSummaryCards cards={summaryCards} />

            {/* ─── Toolbar ─── */}
            <ModuleToolbar
                searchValue={query}
                searchPlaceholder="Search leads, company, email..."
                onSearchChange={setQuery}
                activeFilters={activeFilters}
                onClearAllFilters={clearFilters}
                totalCount={total}
                countLabel="leads"
                filterContent={
                    <>
                        <div>
                            <label className="mod-filter-panel__field-label">Lead Source</label>
                            <ModuleFilterDropdown
                                ariaLabel="Filter leads by source"
                                fullWidth
                                value={source}
                                options={sourceOptions}
                                onChange={setSource}
                            />
                        </div>
                        <div>
                            <label className="mod-filter-panel__field-label">Created Within</label>
                            <ModuleFilterDropdown
                                ariaLabel="Filter leads by created date range"
                                fullWidth
                                value={dateRange}
                                options={dateRangeOptions}
                                onChange={setDateRange}
                            />
                        </div>
                        <div>
                            <label className="mod-filter-panel__field-label">Status</label>
                            <ModuleFilterDropdown
                                ariaLabel="Filter leads by status"
                                fullWidth
                                value={status}
                                options={statusOptions}
                                onChange={setStatus}
                            />
                        </div>
                        <div>
                            <label className="mod-filter-panel__field-label">Owner</label>
                            <ModuleFilterDropdown
                                ariaLabel="Filter leads by owner"
                                fullWidth
                                value={ownerId}
                                options={ownerOptions}
                                onChange={setOwnerId}
                            />
                        </div>
                    </>
                }
            >
                {/* Inline quick filters */}
                <ModuleFilterDropdown
                    ariaLabel="Quick status filter"
                    value={status}
                    options={statusOptions}
                    onChange={setStatus}
                />

                <ModuleFilterDropdown
                    ariaLabel="Quick owner filter"
                    value={ownerId}
                    options={ownerOptions}
                    onChange={setOwnerId}
                />
            </ModuleToolbar>

            {/* ─── Data Table ─── */}
            <ModuleDataTable
                rows={leads}
                columns={columns}
                rowKey={(lead) => lead._id}
                loading={loading}
                error={error}
                tableTitle="Lead Pipeline"
                tableBadge={`${leads.length} visible`}
                emptyTitle="No leads yet"
                emptyDescription="Add your first lead to start working the pipeline."
                emptyIcon={<Inbox size={28} />}
                emptyAction={
                    <button
                        className="mod-btn mod-btn--primary"
                        onClick={() => navigate(`${ROUTES.leads}/new`)}
                    >
                        <Plus size={14} /> Add Lead
                    </button>
                }
                page={page}
                totalPages={totalPages}
                totalItems={total}
                onPageChange={(nextPage) => {
                    const dateRangeParams = getDateRangeParams(dateRange);
                    dispatch(fetchLeads({
                        page: nextPage, limit: 20, search: query,
                        status, ownerId, source,
                        ...dateRangeParams,
                        sortBy: 'createdAt', sortOrder,
                    }));
                }}
                onRetry={() => {
                    const dateRangeParams = getDateRangeParams(dateRange);
                    dispatch(fetchLeads({
                        page,
                        limit: 20,
                        search: query,
                        status,
                        ownerId,
                        source,
                        ...dateRangeParams,
                        sortBy: 'createdAt',
                        sortOrder,
                    }));
                }}
                onRowClick={(lead) => navigate(`${ROUTES.leads}/${lead._id}`)}
            />

            {/* ─── Delete Confirmation ─── */}
            <ConfirmDialog
                open={!!deleteId}
                title="Delete lead"
                message="Are you sure you want to delete this lead? This action cannot be undone."
                confirmLabel="Delete lead"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
            />
        </ModulePageShell>
    );
};

export default LeadsPage;
