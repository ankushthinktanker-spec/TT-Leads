import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchProposals, deleteProposal, duplicateProposal, generateProposalPDF } from '../../store/slices/proposalSlice';
import api from '../../api/axios';
import MainLayout from '../../components/layout/MainLayout';
import { Search, Plus, FileText, Edit, Trash2, Copy, Download, Eye } from 'lucide-react';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import EmptyState from '../../components/ui/EmptyState';
import { Table, TableHead, TableRow, TableHeadCell, TableBody, TableCell } from '../../components/ui/Table';
import { showToast } from '../../utils/toast';

const ProposalsPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { proposals, loading, pagination } = useAppSelector((state) => state.proposals);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        dispatch(fetchProposals({
            page: currentPage,
            limit: 10,
            search,
            status: statusFilter
        }));
    }, [dispatch, currentPage, search, statusFilter]);

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this proposal?')) {
            await dispatch(deleteProposal(id));
            dispatch(fetchProposals({ page: currentPage }));
        }
    };

    const handleDuplicate = async (id: string) => {
        await dispatch(duplicateProposal(id));
        dispatch(fetchProposals({ page: currentPage }));
    };

    const handleDownload = async (id: string, proposalNumber?: string) => {
        try {
            const response = await dispatch(generateProposalPDF(id)).unwrap();
            const rawUrl = response?.data?.pdfUrl
                || response?.data?.proposal?.generatedPdfPath;
            if (!rawUrl) {
                throw new Error('PDF not available');
            }
            const downloadResponse = await api.get(`/proposals/${id}/download`, {
                responseType: 'blob'
            });
            const blob = downloadResponse.data;
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${proposalNumber || 'proposal'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download PDF:', error);
            showToast('Failed to download PDF. Please try again.', 'error');
        }
    };

    const activeFilters = useMemo(() => {
        const filters: string[] = [];
        if (search.trim()) filters.push(`Search: ${search.trim()}`);
        if (statusFilter) filters.push(`Status: ${statusFilter}`);
        return filters;
    }, [search, statusFilter]);

    const hasActiveFilters = activeFilters.length > 0;

    const handleClearFilters = () => {
        setSearch('');
        setStatusFilter('');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Draft': return 'status-neutral';
            case 'Sent': return 'bg-brand-500/15 text-brand-300';
            case 'Under Review': return 'status-warning';
            case 'Accepted': return 'status-success';
            case 'Rejected': return 'status-danger';
            default: return 'status-neutral';
        }
    };

    return (
        <MainLayout>
            <PageLayout>
                <PageHeader
                    title="Proposals"
                    subtitle="Manage your business proposals"
                    actions={(
                        <button
                            onClick={() => navigate('/proposals/new')}
                            className="btn btn-primary"
                        >
                            <Plus size={20} />
                            New Proposal
                        </button>
                    )}
                />

                <FilterBar className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500" size={20} />
                            <input
                                type="text"
                                placeholder="Search proposals..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input pl-10"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input"
                        >
                            <option value="">All Status</option>
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Rejected">Rejected</option>
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
                    ) : proposals.length === 0 ? (
                        <EmptyState
                            icon={<FileText size={48} />}
                            title="No proposals found"
                            description="Create your first proposal to get started."
                            action={(
                                <button
                                    onClick={() => navigate('/proposals/new')}
                                    className="btn btn-outline"
                                >
                                    Create proposal
                                </button>
                            )}
                        />
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableHeadCell>Proposal</TableHeadCell>
                                            <TableHeadCell>Client</TableHeadCell>
                                            <TableHeadCell>Value</TableHeadCell>
                                            <TableHeadCell>Status</TableHeadCell>
                                            <TableHeadCell>Valid Until</TableHeadCell>
                                            <TableHeadCell className="text-right">Actions</TableHeadCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {proposals.map((proposal) => (
                                            <TableRow key={proposal._id} className="group">
                                                <TableCell>
                                                    <div>
                                                        <div className="text-sm font-medium text-secondary-100">{proposal.title}</div>
                                                        <div className="text-xs text-secondary-500">{proposal.proposalNumber}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-secondary-100">
                                                        {proposal.clientDetails?.contactPerson || proposal.clientName || '-'}
                                                    </div>
                                                    <div className="text-xs text-secondary-500">
                                                        {proposal.clientDetails?.companyName || proposal.clientCompany || '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-secondary-100">
                                                        {(proposal.totalAmount ?? proposal.totalValue)
                                                            ? `INR ${(proposal.totalAmount ?? proposal.totalValue)?.toLocaleString()}`
                                                            : '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`status-pill ${getStatusColor(proposal.status)}`}>
                                                        {proposal.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-secondary-400">
                                                    {(proposal.validTill || proposal.validUntil)
                                                        ? new Date(proposal.validTill || proposal.validUntil || '').toLocaleDateString()
                                                        : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => navigate(`/proposals/${proposal._id}`)}
                                                            className="icon-button"
                                                            title="View"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/proposals/${proposal._id}/edit`)}
                                                            className="icon-button"
                                                            title="Edit"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDuplicate(proposal._id)}
                                                            className="icon-button"
                                                            title="Duplicate"
                                                        >
                                                            <Copy size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(proposal._id, proposal.proposalNumber)}
                                                            className="icon-button"
                                                            title="Download PDF"
                                                        >
                                                            <Download size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(proposal._id)}
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
        </MainLayout>
    );
};

export default ProposalsPage;
