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
import { ROUTES } from '../../routes';
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
} from '../../components/module-system';

/* ─── Helpers ─── */
const formatDate = (value?: string) => {
    if (!value) return '—';
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

/* ─── Page Component ─── */
export const LeadsPage = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const { leads, loading, error, page, pages, total } = useAppSelector((s) => s.leads);
    const { users } = useAppSelector((s) => s.users);

    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('');
    const [ownerId, setOwnerId] = useState('');
    const [source, setSource] = useState('');
    const [dateRange, setDateRange] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => { dispatch(fetchUsers({ limit: 100 })); }, [dispatch]);

    useEffect(() => {
        dispatch(fetchLeads({
            page: 1, limit: 20, search: query, status, ownerId, source,
            sortBy: 'createdAt', sortOrder,
        }));
    }, [dispatch, query, status, ownerId, source, dateRange, sortOrder]);

    const uniqueSources = useMemo(() =>
        Array.from(new Set(leads.map((l) => l.source).filter(Boolean))).sort(),
        [leads]
    );

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
        await dispatch(deleteLead(deleteId));
        setDeleteId(null);
        showToast('Lead deleted successfully.', 'success');
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
                                {lead.company || 'Direct'} · {lead.source || '—'}
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
                if (!lead.nextFollowUpDate) return <span style={{ color: 'var(--mod-text-subtle)' }}>—</span>;
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
                eyebrow="CRM · Leads"
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
                            <select
                                className="mod-toolbar__select"
                                style={{ width: '100%' }}
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                            >
                                <option value="">All sources</option>
                                {uniqueSources.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mod-filter-panel__field-label">Created Within</label>
                            <select
                                className="mod-toolbar__select"
                                style={{ width: '100%' }}
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                            >
                                <option value="">All time</option>
                                <option value="7">Last 7 days</option>
                                <option value="30">Last 30 days</option>
                                <option value="90">Last 90 days</option>
                            </select>
                        </div>
                        <div>
                            <label className="mod-filter-panel__field-label">Status</label>
                            <select
                                className="mod-toolbar__select"
                                style={{ width: '100%' }}
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="">All statuses</option>
                                <option value="New">New</option>
                                <option value="Contacted">Contacted</option>
                                <option value="Qualified">Qualified</option>
                                <option value="Proposal Sent">Proposal Sent</option>
                                <option value="Won">Closed-Won</option>
                                <option value="Lost">Lost</option>
                            </select>
                        </div>
                        <div>
                            <label className="mod-filter-panel__field-label">Owner</label>
                            <select
                                className="mod-toolbar__select"
                                style={{ width: '100%' }}
                                value={ownerId}
                                onChange={(e) => setOwnerId(e.target.value)}
                            >
                                <option value="">All assignees</option>
                                {users.map((u) => (
                                    <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                                ))}
                            </select>
                        </div>
                    </>
                }
            >
                {/* Inline quick filters */}
                <select
                    className="mod-toolbar__select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    <option value="">All statuses</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                </select>

                <select
                    className="mod-toolbar__select"
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                >
                    <option value="">All owners</option>
                    {users.map((u) => (
                        <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                    ))}
                </select>
            </ModuleToolbar>

            {/* ─── Data Table ─── */}
            {error && (
                <div style={{
                    padding: '12px 16px',
                    background: 'var(--mod-danger-light)',
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--mod-radius-lg)',
                    color: 'var(--mod-danger-text)',
                    fontSize: 13,
                    fontWeight: 600,
                }}>
                    {error}
                </div>
            )}

            <ModuleDataTable
                rows={leads}
                columns={columns}
                rowKey={(lead) => lead._id}
                loading={loading}
                error={null}
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
                totalPages={pages}
                totalItems={total}
                onPageChange={(nextPage) => dispatch(fetchLeads({
                    page: nextPage, limit: 20, search: query,
                    status, ownerId, source,
                    sortBy: 'createdAt', sortOrder,
                }))}
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
