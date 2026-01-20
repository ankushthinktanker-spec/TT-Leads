import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchProposalById, deleteProposal, generateProposalPDF, deleteSection } from '../../store/slices/proposalSlice';
import MainLayout from '../../components/layout/MainLayout';
import { ArrowLeft, Edit, Trash2, Download, FileText, Plus, Eye } from 'lucide-react';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import SurfaceCard from '../../components/ui/SurfaceCard';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../api/axios';
import { showToast } from '../../utils/toast';
import { getErrorMessage } from '../../utils/error';

const ProposalDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { currentProposal, loading } = useAppSelector((state) => state.proposals);

    useEffect(() => {
        if (id) {
            dispatch(fetchProposalById(id));
        }
    }, [dispatch, id]);

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this proposal?')) {
            if (id) {
                await dispatch(deleteProposal(id));
                navigate('/proposals');
            }
        }
    };

    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const handleGeneratePDF = async () => {
        if (id) {
            setIsGeneratingPDF(true);
            try {
                await dispatch(generateProposalPDF(id)).unwrap();
                showToast('PDF generated successfully. Click Download to get your PDF.', 'success');
            } catch (error: unknown) {
                console.error('PDF generation failed:', error);
                showToast(getErrorMessage(error, 'Failed to generate PDF. Please try again.'), 'error');
            } finally {
                setIsGeneratingPDF(false);
            }
        }
    };

    const handleDownloadPDF = async () => {
        if (!id) return;
        try {
            await dispatch(generateProposalPDF(id)).unwrap();
            const downloadResponse = await api.get(`/proposals/${id}/download`, {
                responseType: 'blob'
            });
            const blob = downloadResponse.data;
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${currentProposal?.proposalNumber || 'proposal'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: unknown) {
            console.error('Failed to download PDF:', error);
            showToast(getErrorMessage(error, 'Failed to download PDF. Please try again.'), 'error');
        }
    };

    const handleDeleteSection = async (sectionId: string) => {
        if (window.confirm('Are you sure you want to delete this section?')) {
            if (id) {
                await dispatch(deleteSection({ proposalId: id, sectionId }));
                dispatch(fetchProposalById(id));
            }
        }
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

    const formatBytes = (value?: number) => {
        if (!value || Number.isNaN(value)) return 'N/A';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = value;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex += 1;
        }
        return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    };

    if (loading) {
        return (
            <MainLayout>
                <PageLayout>
                    <div className="flex items-center justify-center min-h-[50vh]">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
                    </div>
                </PageLayout>
            </MainLayout>
        );
    }

    if (!currentProposal) {
        return (
            <MainLayout>
                <PageLayout>
                    <div className="flex flex-col items-center justify-center min-h-[50vh]">
                        <div className="text-red-400 mb-4">Proposal not found</div>
                        <Link to="/proposals" className="btn btn-outline">
                            Back to Proposals
                        </Link>
                    </div>
                </PageLayout>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <PageLayout>
                <div className="mb-4">
                    <Link to="/proposals" className="text-secondary-400 hover:text-secondary-200 flex items-center gap-1">
                        <ArrowLeft size={20} />
                        Back to Proposals
                    </Link>
                </div>

                <PageHeader
                    title={currentProposal.title}
                    subtitle={(
                        <div className="flex flex-wrap items-center gap-3 text-secondary-400">
                            <span className="font-mono">{currentProposal.proposalNumber}</span>
                            <span className={`status-pill ${getStatusColor(currentProposal.status)}`}>
                                {currentProposal.status}
                            </span>
                            {currentProposal.version > 1 && (
                                <span className="text-sm text-secondary-500">Version {currentProposal.version}</span>
                            )}
                        </div>
                    )}
                    actions={(
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => navigate(`/proposals/${id}/edit`)}
                                className="btn btn-outline"
                            >
                                <Edit size={18} />
                                Edit
                            </button>
                            <button
                                onClick={handleGeneratePDF}
                                disabled={isGeneratingPDF}
                                className="btn btn-secondary"
                            >
                                <FileText size={18} />
                                {isGeneratingPDF ? 'Generating...' : 'Generate PDF'}
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                className="btn btn-primary"
                            >
                                <Download size={18} />
                                Download PDF
                            </button>
                            <button
                                onClick={handleDelete}
                                className="btn btn-danger"
                            >
                                <Trash2 size={18} />
                                Delete
                            </button>
                        </div>
                    )}
                />

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={`status-pill ${getStatusColor(currentProposal.status)}`}>
                        {currentProposal.status}
                    </span>
                    {currentProposal.clientDetails?.companyName && (
                        <span className="text-xs text-secondary-400">
                            {currentProposal.clientDetails.companyName}
                        </span>
                    )}
                    {currentProposal.preparedBy?.name && (
                        <span className="text-xs text-secondary-400">
                            Prepared by {currentProposal.preparedBy.name}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    <div className="lg:col-span-2 space-y-6">
                        <SurfaceCard className="p-6">
                            <h2 className="text-xl font-semibold text-secondary-50 mb-4">Client Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Name</p>
                                    <p className="text-secondary-100 mt-1">
                                        {currentProposal.clientDetails?.contactPerson || currentProposal.clientName || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Email</p>
                                    {currentProposal.clientDetails?.email || currentProposal.clientEmail ? (
                                        <a
                                            href={`mailto:${currentProposal.clientDetails?.email || currentProposal.clientEmail}`}
                                            className="text-primary-400 hover:text-primary-300 mt-1 inline-block"
                                        >
                                            {currentProposal.clientDetails?.email || currentProposal.clientEmail}
                                        </a>
                                    ) : (
                                        <p className="text-secondary-100 mt-1">N/A</p>
                                    )}
                                </div>
                                {(currentProposal.clientDetails?.phone || currentProposal.clientPhone) && (
                                    <div>
                                        <p className="text-sm font-medium text-secondary-400">Phone</p>
                                        <a
                                            href={`tel:${currentProposal.clientDetails?.phone || currentProposal.clientPhone}`}
                                            className="text-secondary-100 hover:text-primary-400 mt-1 inline-block"
                                        >
                                            {currentProposal.clientDetails?.phone || currentProposal.clientPhone}
                                        </a>
                                    </div>
                                )}
                                {(currentProposal.clientDetails?.companyName || currentProposal.clientCompany) && (
                                    <div>
                                        <p className="text-sm font-medium text-secondary-400">Company</p>
                                        <p className="text-secondary-100 mt-1">
                                            {currentProposal.clientDetails?.companyName || currentProposal.clientCompany}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </SurfaceCard>

                        <SurfaceCard className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-secondary-50">Proposal Sections</h2>
                                <button
                                    onClick={() => navigate(`/proposals/${id}/sections/new`)}
                                    className="btn btn-secondary"
                                >
                                    <Plus size={18} />
                                    Add Section
                                </button>
                            </div>

                            {currentProposal.sections && currentProposal.sections.length > 0 ? (
                                <div className="space-y-3">
                                    {[...(currentProposal.sections || [])]
                                        .sort((a, b) => (a.order ?? a.sectionOrder ?? 0) - (b.order ?? b.sectionOrder ?? 0))
                                        .map((section, index) => (
                                            <div
                                                key={section._id || index}
                                                className="surface-card-muted p-4 hover:border-white/10 transition-colors"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-xs text-secondary-500">
                                                                #{section.order ?? section.sectionOrder ?? index}
                                                            </span>
                                                            <h3 className="text-lg font-semibold text-secondary-100">
                                                                {section.title || section.sectionTitle}
                                                            </h3>
                                                            {!section.isVisible && (
                                                                <span className="status-pill status-neutral">Hidden</span>
                                                            )}
                                                            {(section.includeInTOC || section.includeInIndex) && (
                                                                <span className="status-pill bg-brand-500/15 text-brand-300">In TOC</span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-secondary-400 mt-1">
                                                            Type: <span className="font-medium">{section.contentType || section.sectionType}</span>
                                                        </p>
                                                        {section.content && (
                                                            <div className="mt-2 text-sm text-secondary-300 line-clamp-2">
                                                                {section.content.substring(0, 150)}...
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 ml-4">
                                                        <button
                                                            onClick={() => navigate(`/proposals/${id}/sections/${section._id}/edit`)}
                                                            className="icon-button"
                                                            title="Edit Section"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => section._id && handleDeleteSection(section._id)}
                                                            className="icon-button text-red-400 hover:text-red-300"
                                                            title="Delete Section"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={<FileText size={48} />}
                                    title="No sections added yet"
                                    description="Add your first section to build the proposal."
                                    action={(
                                        <button
                                            onClick={() => navigate(`/proposals/${id}/sections/new`)}
                                            className="btn btn-outline"
                                        >
                                            Add your first section
                                        </button>
                                    )}
                                />
                            )}
                        </SurfaceCard>
                    </div>

                    <div className="space-y-6">
                        <SurfaceCard className="p-6">
                            <h2 className="text-lg font-semibold text-secondary-50 mb-4">Proposal Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Valid Until</p>
                                    <p className="text-secondary-100 mt-1">
                                        {currentProposal.validTill || currentProposal.validUntil
                                            ? new Date(currentProposal.validTill || currentProposal.validUntil || '').toLocaleDateString()
                                            : 'N/A'}
                                    </p>
                                </div>
                                {(currentProposal.totalAmount ?? currentProposal.totalValue) && (
                                    <div>
                                        <p className="text-sm font-medium text-secondary-400">Total Value</p>
                                        <p className="text-secondary-100 mt-1 text-xl font-bold">
                                            INR {(currentProposal.totalAmount ?? currentProposal.totalValue)?.toLocaleString()}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Prepared By</p>
                                    <p className="text-secondary-100 mt-1">{currentProposal.preparedBy?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Created</p>
                                    <p className="text-secondary-100 mt-1">
                                        {new Date(currentProposal.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Last Updated</p>
                                    <p className="text-secondary-100 mt-1">
                                        {new Date(currentProposal.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">PDF Generated</p>
                                    <p className="text-secondary-100 mt-1">
                                        {currentProposal.lastGeneratedAt
                                            ? new Date(currentProposal.lastGeneratedAt).toLocaleDateString()
                                            : 'Not generated'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">PDF Size</p>
                                    <p className="text-secondary-100 mt-1">
                                        {formatBytes(currentProposal.generatedPdfSize)}
                                    </p>
                                </div>
                            </div>
                        </SurfaceCard>

                        <div className="surface-card-muted p-4">
                            <h3 className="font-semibold text-secondary-100 mb-2">Quick Actions</h3>
                            <div className="grid gap-2">
                                <button
                                    onClick={() => navigate(`/proposals/${id}/preview`)}
                                    className="btn btn-outline w-full justify-center"
                                >
                                    <Eye size={16} />
                                    Preview Proposal
                                </button>
                                <button
                                    onClick={handleGeneratePDF}
                                    className="btn btn-outline w-full justify-center"
                                >
                                    <FileText size={16} />
                                    Regenerate PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </PageLayout>
        </MainLayout>
    );
};

export default ProposalDetailsPage;
