import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchProposalById, deleteProposal, generateProposalPDF, clearCurrentProposal } from '../../store/slices/proposalSlice';
import { Trash2, Download, FileText, Clock3, Eye, ShieldCheck, Mail, Phone, Building2 } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { ROUTES } from '../../routes';
import { showToast } from '../../utils/toast';
import { getErrorMessage } from '../../utils/error';
import api from '../../api/axios';
import WorkspaceSection from '../../components/ui/WorkspaceSection';

const statusVariant = (status: string): 'neutral' | 'success' | 'warning' | 'danger' => {
    switch (status) {
        case 'Draft': return 'neutral';
        case 'Sent': return 'warning';
        case 'Under Review': return 'warning';
        case 'Accepted': return 'success';
        case 'Rejected': return 'danger';
        default: return 'neutral';
    }
};

const formatDateTime = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatCurrency = (value?: number) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value || 0);

const ProposalDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { currentProposal, loading } = useAppSelector((state) => state.proposals);

    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    useEffect(() => {
        if (id) {
            dispatch(fetchProposalById(id));
        }
        return () => {
            dispatch(clearCurrentProposal());
        };
    }, [dispatch, id]);

    const handleDownloadPDF = async () => {
        if (!id) return;
        setIsGeneratingPDF(true);
        try {
            await dispatch(generateProposalPDF(id)).unwrap();
            const downloadResponse = await api.get(`/proposals/${id}/download`, {
                responseType: 'blob'
            });
            const blob = downloadResponse.data;
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${currentProposal?.proposalNumber || 'protocol'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            showToast('Proposal PDF downloaded.', 'success');
        } catch (error: unknown) {
            console.error('Failed to process PDF:', error);
            showToast(getErrorMessage(error, 'Failed to download proposal PDF.'), 'error');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const confirmDelete = async () => {
        if (!id) return;
        try {
            await dispatch(deleteProposal(id)).unwrap();
            showToast('Proposal deleted.', 'success');
            navigate(ROUTES.proposals);
        } catch (error: unknown) {
            showToast(getErrorMessage(error, 'Failed to delete proposal.'), 'error');
        }
    };

    if (loading) {
        return (
            <div className="page-layout space-y-6">
                <Skeleton className="h-24 w-1/3 rounded-xl" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Skeleton className="h-24 rounded-[1.75rem]" />
                    <Skeleton className="h-24 rounded-[1.75rem]" />
                    <Skeleton className="h-24 rounded-[1.75rem]" />
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Skeleton className="h-96 lg:col-span-2 rounded-[2rem]" />
                    <Skeleton className="h-96 rounded-[2rem]" />
                </div>
            </div>
        );
    }

    if (!currentProposal) {
        return (
            <div className="page-layout py-10">
                <WorkspaceSection
                    title="Proposal not available"
                    description="The requested proposal could not be found or is no longer available in the live workspace."
                    eyebrow="Record state"
                    contentClassName="py-12"
                >
                    <div className="text-center">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-rose-200 bg-rose-50">
                            <ShieldCheck size={28} className="text-rose-500" />
                        </div>
                        <button onClick={() => navigate(ROUTES.proposals)} className="btn btn-secondary">
                            Return to Proposals
                        </button>
                    </div>
                </WorkspaceSection>
            </div>
        );
    }

    return (
        <div className="page-layout workspace-stack">
            <div className="flex flex-col gap-5">
                <Breadcrumb items={[{ label: 'Dashboard', to: ROUTES.dashboard }, { label: 'Proposals', to: ROUTES.proposals }, { label: currentProposal.title }]} />
                
                <div className="workspace-hero tt-animate-fade-up">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-8">
                            <div className="relative group">
                                <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#fffdf9] text-slate-900 shadow-[0_12px_28px_rgba(120,74,24,0.08)] ring-1 ring-slate-200">
                                    <FileText size={34} className="text-emerald-600" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                                        Proposal record
                                    </span>
                                    <span className="h-px w-8 bg-slate-300" />
                                    <Badge variant={statusVariant(currentProposal.status)} className="shadow-sm py-1 px-3 text-[9px] font-black uppercase tracking-wider">
                                        {currentProposal.status}
                                    </Badge>
                                </div>
                                <h1 className="text-3xl font-black tracking-tight leading-none text-slate-950">
                                    {currentProposal.title}
                                </h1>
                                <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-slate-500">
                                    <p className="flex items-center gap-2">
                                        <span className="text-emerald-600">#</span> {currentProposal.proposalNumber}
                                    </p>
                                    <span className="h-1 w-1 rounded-full bg-slate-400" />
                                    <p>Version {currentProposal.version || '1.0'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <button
                                onClick={() => navigate(`${ROUTES.proposals}/${id}/edit`)}
                                className="btn btn-secondary"
                            >
                                Edit proposal
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPDF}
                                className="btn btn-primary disabled:opacity-50"
                            >
                                <span className="flex items-center gap-3">
                                    {isGeneratingPDF ? 'Preparing...' : 'Download PDF'}
                                    {!isGeneratingPDF && <Download size={14} />}
                                </span>
                            </button>
                            <button 
                                onClick={() => setDeleteOpen(true)}
                                className="px-3 py-3 rounded-2xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                        <div className="rounded-[1.25rem] border border-slate-200/85 bg-[#fffdf9]/92 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Total value</p>
                            <p className="mt-1 text-lg font-black tracking-tight text-slate-950">
                                {formatCurrency(currentProposal.totalAmount || currentProposal.totalValue || 0)}
                            </p>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200/85 bg-[#fffdf9]/92 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Prepared by</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                                {currentProposal.preparedBy?.name || 'System Admin'}
                            </p>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200/85 bg-[#fffdf9]/92 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Valid until</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                                {formatDateTime(currentProposal.validTill || currentProposal.validUntil)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {/* Entity Alignment */}
                    <div className="grid gap-6 md:grid-cols-2">
                            <WorkspaceSection
                                title="Client alignment"
                                description="Primary client and communication context attached to this proposal."
                                eyebrow="Target entity"
                                contentClassName="py-6"
                            >
                                <div className="flex items-center gap-5 mb-6">
                                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Client</p>
                                        <p className="text-lg font-black text-slate-900 tracking-tight">{currentProposal.clientName || currentProposal.clientDetails?.companyName || 'Not specified'}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                        <Mail size={16} className="text-brand-500" />
                                        {currentProposal.clientEmail || currentProposal.clientDetails?.email || 'Not added'}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                        <Phone size={16} className="text-brand-500" />
                                        {currentProposal.clientPhone || currentProposal.clientDetails?.phone || 'Not added'}
                                    </div>
                                </div>
                            </WorkspaceSection>

                            <WorkspaceSection
                                title="Commercial summary"
                                description="Proposal value and current commercial state."
                                eyebrow="Revenue summary"
                                contentClassName="py-6"
                            >
                                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-brand-700">Proposal Value</p>
                                <div className="space-y-1">
                                    <p className="text-4xl font-black tracking-tighter text-slate-950">
                                        {formatCurrency(currentProposal.totalAmount || currentProposal.totalValue || 0)}
                                    </p>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Total proposal value</p>
                                </div>
                                <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-tighter text-slate-500">Proposal Status</p>
                                        <p className="text-xs font-black uppercase text-brand-700">{currentProposal.status || 'Draft'}</p>
                                    </div>
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fffdf9] text-brand-600 ring-1 ring-slate-200">
                                        <ShieldCheck size={20} />
                                    </div>
                                </div>
                            </WorkspaceSection>
                    </div>

                    {/* Proposal Sections */}
                    <WorkspaceSection
                        title="Proposal sections"
                        description="Structured proposal content in delivery order."
                        eyebrow="Section structure"
                        aside={<button onClick={() => navigate(`${ROUTES.proposals}/${id}/edit`)} className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:underline">Edit Sections</button>}
                    >
                        <div className="flex items-center justify-between px-0">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Proposal Structure</h3>
                        </div>
                        
                        <div className="space-y-6">
                            {(currentProposal.sections || []).length === 0 ? (
                                <div className="p-12 text-center rounded-[2rem] bg-[#fbf2e7] border border-slate-200 border-dashed">
                                    <p className="text-sm font-bold text-slate-400 mb-4">No sections have been added yet.</p>
                                    <button onClick={() => navigate(`${ROUTES.proposals}/${id}/edit`)} className="px-6 py-2 rounded-xl bg-[#fffdf9] border border-slate-200 text-[10px] font-black uppercase tracking-widest">Add Sections</button>
                                </div>
                            ) : (
                                [...(currentProposal.sections || [])]
                                    .sort((a, b) => (a.order ?? a.sectionOrder ?? 0) - (b.order ?? b.sectionOrder ?? 0))
                                    .map((section, idx) => (
                                        <div key={section._id || idx} className="group relative flex gap-6">
                                            {idx < currentProposal.sections!.length - 1 && (
                                                <div className="absolute top-12 bottom-0 left-[22px] w-px bg-slate-100 transition-colors group-hover:bg-brand-200" />
                                            )}
                                            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-[#fffdf9] text-[10px] font-black text-slate-400 transition-all duration-500 group-hover:border-brand-500 group-hover:text-brand-600 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.18)]">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 pb-10">
                                                <div className="rounded-[2rem] border border-slate-100 bg-[#fffaf4] p-8 shadow-[0_10px_26px_rgba(120,74,24,0.06)] transition-all duration-500 group-hover:border-brand-100 group-hover:shadow-md">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase">{section.title || section.sectionTitle}</h4>
                                                        <Badge variant="neutral" className="text-[9px] font-black uppercase">{section.contentType || section.sectionType || 'Content Block'}</Badge>
                                                    </div>
                                                    <div className="text-sm text-slate-500 leading-relaxed font-medium line-clamp-3">
                                                        {section.content || 'No content has been added for this section yet.'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </WorkspaceSection>
                </div>

                <div className="space-y-6">
                    <WorkspaceSection
                        title="Proposal metadata"
                        description="Ownership, validity, and system timestamps for this proposal."
                        eyebrow="Operations"
                        contentClassName="py-6"
                    >
                        <div className="space-y-8">
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-[#fbf2e7]/70 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valid Until</span>
                                    <span className="text-xs font-black text-emerald-600">{formatDateTime(currentProposal.validTill || currentProposal.validUntil)}</span>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Prepared By</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">
                                            {currentProposal.preparedBy?.name?.[0] || 'S'}
                                        </div>
                                        <p className="text-sm font-black text-slate-900 tracking-tight">{currentProposal.preparedBy?.name || 'System Admin'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-100 space-y-4">
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                                    <Clock3 size={14} className="text-brand-500" />
                                    Created: {formatDateTime(currentProposal.createdAt)}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                                    <Clock3 size={14} className="text-brand-500" />
                                    Last Updated: {formatDateTime(currentProposal.updatedAt)}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                                    <FileText size={14} className="text-slate-400" />
                                    PDF Size: {(currentProposal.generatedPdfSize || 0) / 1024 > 1024 ? `${((currentProposal.generatedPdfSize || 0) / (1024 * 1024)).toFixed(2)} MB` : `${((currentProposal.generatedPdfSize || 0) / 1024).toFixed(2)} KB`}
                                </div>
                            </div>
                        </div>
                    </WorkspaceSection>

                    <WorkspaceSection
                        title="Actions"
                        description="Preview, export, or continue editing this proposal."
                        eyebrow="Actions"
                        contentClassName="py-5"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => navigate(`${ROUTES.proposals}/${id}/preview`)}
                                className="flex flex-col items-center gap-3 rounded-3xl border border-slate-100 bg-[#fffaf4] p-6 text-slate-600 transition-all hover:border-brand-300 hover:text-brand-600 hover:shadow-lg"
                            >
                                <Eye size={20} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Preview</span>
                            </button>
                            <button 
                                onClick={handleDownloadPDF}
                                className="flex flex-col items-center gap-3 rounded-3xl border border-slate-100 bg-[#fffaf4] p-6 text-slate-600 transition-all hover:border-brand-300 hover:text-brand-600 hover:shadow-lg"
                            >
                                <FileText size={20} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Download PDF</span>
                            </button>
                        </div>
                    </WorkspaceSection>
                </div>
            </div>

            <ConfirmDialog
                open={deleteOpen}
                title="Delete Proposal"
                message={`Are you sure you want to delete proposal ${currentProposal.proposalNumber}? This action cannot be undone.`}
                confirmLabel="Delete Proposal"
                onCancel={() => setDeleteOpen(false)}
                onConfirm={confirmDelete}
            />
        </div>
    );
};

export default ProposalDetailsPage;

