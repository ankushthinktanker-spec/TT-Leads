import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Eye, Inbox, FileCheck2, FileWarning, TimerReset } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { deleteProposal, fetchProposals } from '../../store/slices/proposalSlice';
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

const statusVariant = (status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
        case 'Draft': return 'neutral';
        case 'Sent': return 'warning';
        case 'Under Review': return 'info';
        case 'Accepted': return 'success';
        case 'Rejected': return 'danger';
        default: return 'neutral';
    }
};

const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
};

export const ProposalsPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { proposals, loading, error, pagination } = useAppSelector((state) => state.proposals);
    const { total, totalPages: pages } = pagination;
    const { value: query, setValue: setQuery } = useGlobalSearch();

    const [status, setStatus] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(fetchProposals({
                page,
                limit: 20,
                search: query,
                status,
                sortBy: 'createdAt',
                sortOrder
            }));
        }, 300);
        return () => clearTimeout(timer);
    }, [dispatch, page, query, status, sortOrder]);

    const activeFilters: ActiveFilter[] = [
        ...(query.trim() ? [{ key: 'search', label: `Search: "${query.trim()}"`, onRemove: () => setQuery('') }] : []),
        ...(status ? [{ key: 'status', label: `Status: ${status}`, onRemove: () => setStatus('') }] : []),
        ...(sortOrder !== 'desc' ? [{ key: 'sort', label: `Sort: Oldest first`, onRemove: () => setSortOrder('desc') }] : []),
    ];

    const statusOptions = [
        { value: '', label: 'All statuses' },
        { value: 'Draft', label: 'Draft' },
        { value: 'Sent', label: 'Sent' },
        { value: 'Under Review', label: 'Under Review' },
        { value: 'Accepted', label: 'Accepted' },
        { value: 'Rejected', label: 'Rejected' },
    ];

    const sortOptions = [
        { value: 'desc', label: 'Newest first' },
        { value: 'asc', label: 'Oldest first' },
    ];

    const draftCount = proposals.filter((proposal) => proposal.status === 'Draft').length;
    const sentCount = proposals.filter((proposal) => proposal.status === 'Sent').length;
    const acceptedCount = proposals.filter((proposal) => proposal.status === 'Accepted').length;
    const totalValue = proposals.reduce((sum, proposal) => sum + (proposal.totalAmount || 0), 0);

    const clearFilters = () => {
        setQuery('');
        setStatus('');
        setSortOrder('desc');
        setPage(1);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await dispatch(deleteProposal(deleteId)).unwrap();
            setDeleteId(null);
            dispatch(fetchProposals({ page, limit: 20, search: query, status, sortBy: 'createdAt', sortOrder }));
            showToast('Proposal deleted successfully.', 'success');
        } catch {
            showToast('Failed to delete proposal.', 'error');
        }
    };

    const summaryCards: SummaryCardItem[] = [
        { label: 'Draft Proposals', value: draftCount, icon: <TimerReset size={18} />, variant: 'neutral' },
        { label: 'Sent', value: sentCount, icon: <FileWarning size={18} />, variant: 'warning' },
        { label: 'Accepted', value: acceptedCount, icon: <FileCheck2 size={18} />, variant: 'success' },
        { label: 'Pipeline Value', value: `INR ${totalValue.toLocaleString()}`, icon: <FileText size={18} />, variant: 'purple' },
    ];

    const columns: ModuleColumnDef<(typeof proposals)[number]>[] = [
        {
            id: 'proposal',
            header: 'Proposal',
            width: '32%',
            cell: (proposal) => (
                <button
                    type="button"
                    className="mod-table__lead-cell"
                    onClick={() => navigate(`${ROUTES.proposals}/${proposal._id}`)}
                >
                    <div className="mod-table__avatar mod-table__avatar--purple">
                        <FileText size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div className="mod-table__primary-text">
                            {proposal.title}
                        </div>
                        <div className="mod-table__secondary-text">
                            {proposal.proposalNumber}
                        </div>
                    </div>
                </button>
            )
        },
        {
            id: 'lead',
            header: 'Lead',
            width: '20%',
            cell: (proposal) => (
                <div className="mod-table__primary-text" style={{ fontSize: 13 }}>
                    {typeof proposal.leadId === 'object'
                        ? `${proposal.leadId.firstName || ''} ${proposal.leadId.lastName || ''}`.trim() || 'Direct lead'
                        : 'Direct lead'}
                </div>
            )
        },
        {
            id: 'status',
            header: 'Stage',
            width: '12%',
            cell: (proposal) => (
                <ModuleBadge variant={statusVariant(proposal.status)}>
                    {proposal.status}
                </ModuleBadge>
            )
        },
        {
            id: 'value',
            header: 'Value',
            width: '14%',
            cell: (proposal) => (
                <div>
                    <div className="mod-table__primary-text" style={{ fontSize: 13 }}>
                        INR {(proposal.totalAmount || 0).toLocaleString()}
                    </div>
                    <div className="mod-table__secondary-text">Total value</div>
                </div>
            )
        },
        {
            id: 'created',
            header: 'Created',
            width: '12%',
            cell: (proposal) => (
                <div className="mod-table__primary-text" style={{ fontSize: 13, color: 'var(--mod-text-muted)' }}>
                    {formatDate(proposal.createdAt)}
                </div>
            )
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            width: '80px',
            cell: (proposal) => (
                <ModuleRowActions
                    primaryAction={{
                        icon: <Eye size={14} />,
                        label: 'Open',
                        onClick: () => navigate(`${ROUTES.proposals}/${proposal._id}`)
                    }}
                    actions={[
                        {
                            label: 'View details',
                            icon: <Eye size={14} />,
                            onClick: () => navigate(`${ROUTES.proposals}/${proposal._id}`)
                        },
                        {
                            label: 'Delete',
                            icon: <Trash2 size={14} />,
                            onClick: () => setDeleteId(proposal._id),
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
                eyebrow="CRM / Proposals"
                title="Proposals"
                description="Track commercial documents, review value concentration, and move proposals through a consistent CRM workflow."
                actions={
                    <button
                        className="mod-btn mod-btn--primary"
                        onClick={() => navigate(`${ROUTES.proposals}/new`)}
                    >
                        <Plus size={14} /> Create Proposal
                    </button>
                }
            />

            <ModuleSummaryCards cards={summaryCards} />

            <ModuleToolbar
                searchValue={query}
                searchPlaceholder="Search proposals..."
                onSearchChange={setQuery}
                activeFilters={activeFilters}
                onClearAllFilters={clearFilters}
                totalCount={total}
                countLabel="proposals"
            >
                <ModuleFilterDropdown
                    ariaLabel="Filter proposals by status"
                    value={status}
                    options={statusOptions}
                    onChange={setStatus}
                />

                <ModuleFilterDropdown
                    ariaLabel="Sort proposals"
                    value={sortOrder}
                    options={sortOptions}
                    onChange={(nextValue) => setSortOrder(nextValue as 'asc' | 'desc')}
                />
            </ModuleToolbar>

            <ModuleDataTable
                rows={proposals}
                columns={columns}
                rowKey={(proposal) => proposal._id}
                loading={loading}
                error={error}
                tableTitle="Commercial Pipeline"
                tableBadge={`${proposals.length} visible`}
                emptyTitle="No proposals yet"
                emptyDescription="Create your first proposal to start managing commercial pipeline."
                emptyIcon={<Inbox size={28} />}
                emptyAction={
                    <button
                        className="mod-btn mod-btn--primary"
                        onClick={() => navigate(`${ROUTES.proposals}/new`)}
                    >
                        <Plus size={14} /> Create Proposal
                    </button>
                }
                page={page}
                totalPages={pages}
                totalItems={total}
                onPageChange={setPage}
                onRetry={() => dispatch(fetchProposals({
                    page,
                    limit: 20,
                    search: query,
                    status,
                    sortBy: 'createdAt',
                    sortOrder
                }))}
                onRowClick={(proposal) => navigate(`${ROUTES.proposals}/${proposal._id}`)}
            />

            <ConfirmDialog
                open={!!deleteId}
                title="Delete proposal"
                message="Are you sure you want to delete this proposal? This action cannot be undone."
                confirmLabel="Delete proposal"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
            />
        </ModulePageShell>
    );
};

export default ProposalsPage;
