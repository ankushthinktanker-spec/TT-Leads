import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchProposalById, deleteProposal, generateProposalPDF } from '../../store/slices/proposalSlice';
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
            showToast('Protocol PDF generated and downloaded.', 'success');
        } catch (error: unknown) {
            console.error('Failed to process PDF:', error);
            showToast(getErrorMessage(error, 'Failed to process PDF transmission.'), 'error');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const confirmDelete = async () => {
        if (!id) return;
        await dispatch(deleteProposal(id));
        showToast('Proposal protocol archived.', 'success');
        navigate(ROUTES.proposals);
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
                                <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-white text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
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
                                    {isGeneratingPDF ? 'Syncing...' : 'Transmit PDF'}
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
                        <div className="rounded-[1.25rem] border border-slate-200/85 bg-white/85 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Total value</p>
                            <p className="mt-1 text-lg font-black tracking-tight text-slate-950">
                                INR {(currentProposal.totalAmount || currentProposal.totalValue || 0).toLocaleString()}
                            </p>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200/85 bg-white/85 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Prepared by</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                                {currentProposal.preparedBy?.name || 'System Admin'}
                            </p>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200/85 bg-white/85 px-4 py-3">
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
                                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Strategic Client</p>
                                        <p className="text-lg font-black text-slate-900 tracking-tight">{currentProposal.clientName || currentProposal.clientDetails?.companyName || 'Private Associate'}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                        <Mail size={16} className="text-brand-500" />
                                        {currentProposal.clientEmail || currentProposal.clientDetails?.email || 'unreachable@encryption.io'}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                        <Phone size={16} className="text-brand-500" />
                                        {currentProposal.clientPhone || currentProposal.clientDetails?.phone || '+XX XXX-XXX-XXXX'}
                                    </div>
                                </div>
                            </WorkspaceSection>

                            <WorkspaceSection
                                title="Pipeline valuation"
                                description="Commercial summary and gross value snapshot."
                                eyebrow="Revenue summary"
                                contentClassName="py-6"
                            >
                                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-brand-700">Pipeline Valuation</p>
                                <div className="space-y-1">
                                    <p className="text-4xl font-black tracking-tighter text-slate-950">
                                        INR {(currentProposal.totalAmount || currentProposal.totalValue || 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Gross Contractual Value</p>
                                </div>
                                <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-tighter text-slate-500">Operational Term</p>
                                        <p className="text-xs font-black uppercase text-brand-700">Perpetual License</p>
                                    </div>
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-slate-200">
                                        <ShieldCheck size={20} />
                                    </div>
                                </div>
                            </WorkspaceSection>
                    </div>

                    {/* Protocol Architecture (Sections) */}
                    <WorkspaceSection
                        title="Protocol architecture"
                        description="Structured proposal sections in delivery order."
                        eyebrow="Section structure"
                        aside={<button onClick={() => navigate(`${ROUTES.proposals}/${id}/edit`)} className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:underline">Modify Structure</button>}
                    >
                        <div className="flex items-center justify-between px-0">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Protocol Architecture</h3>
                        </div>
                        
                        <div className="space-y-6">
                            {(currentProposal.sections || []).length === 0 ? (
                                <div className="p-12 text-center rounded-[2rem] bg-slate-50 border border-slate-200 border-dashed">
                                    <p className="text-sm font-bold text-slate-400 mb-4">No protocol layers initialized.</p>
                                    <button onClick={() => navigate(`${ROUTES.proposals}/${id}/edit`)} className="px-6 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest">Initial Boot</button>
                                </div>
                            ) : (
                                [...(currentProposal.sections || [])]
                                    .sort((a, b) => (a.order ?? a.sectionOrder ?? 0) - (b.order ?? b.sectionOrder ?? 0))
                                    .map((section, idx) => (
                                        <div key={section._id || idx} className="group relative flex gap-6">
                                            {idx < currentProposal.sections!.length - 1 && (
                                                <div className="absolute top-12 bottom-0 left-[22px] w-px bg-slate-100 transition-colors group-hover:bg-brand-200" />
                                            )}
                                            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[10px] font-black text-slate-400 transition-all duration-500 group-hover:border-brand-500 group-hover:text-brand-600 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.18)]">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 pb-10">
                                                <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm transition-all duration-500 group-hover:border-brand-100 group-hover:shadow-md">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase">{section.title || section.sectionTitle}</h4>
                                                        <Badge variant="neutral" className="text-[9px] font-black uppercase">{section.contentType || section.sectionType || 'Static Layer'}</Badge>
                                                    </div>
                                                    <div className="text-sm text-slate-500 leading-relaxed font-medium line-clamp-3">
                                                        {section.content || 'NO METADATA REGISTERED FOR THIS PROTOCOL LAYER.'}
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
                        title="Governance metadata"
                        description="Ownership, validity, and system timestamps for this proposal."
                        eyebrow="Operations"
                        contentClassName="py-6"
                    >
                        <div className="space-y-8">
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temporal Validity</span>
                                    <span className="text-xs font-black text-emerald-600">{formatDateTime(currentProposal.validTill || currentProposal.validUntil)}</span>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Authorizing Personnel</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">
                                            {currentProposal.preparedBy?.name?.[0] || 'S'}
                                        </div>
                                        <p className="text-sm font-black text-slate-900 tracking-tight uppercase">{currentProposal.preparedBy?.name || 'SYSTEM ADMIN'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-100 space-y-4">
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                                    <Clock3 size={14} className="text-brand-500" />
                                    Protocol Initialized: {formatDateTime(currentProposal.createdAt)}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                                    <Clock3 size={14} className="text-brand-500" />
                                    Last Matrix Sync: {formatDateTime(currentProposal.updatedAt)}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                                    <FileText size={14} className="text-slate-400" />
                                    Legacy Footprint: {(currentProposal.generatedPdfSize || 0) / 1024 > 1024 ? `${((currentProposal.generatedPdfSize || 0) / (1024 * 1024)).toFixed(2)} MB` : `${((currentProposal.generatedPdfSize || 0) / 1024).toFixed(2)} KB`}
                                </div>
                            </div>
                        </div>
                    </WorkspaceSection>

                    <WorkspaceSection
                        title="Operational commands"
                        description="Preview, export, or continue editing this proposal."
                        eyebrow="Actions"
                        contentClassName="py-5"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => navigate(`${ROUTES.proposals}/${id}/preview`)}
                                className="flex flex-col items-center gap-3 rounded-3xl border border-slate-100 bg-white p-6 text-slate-600 transition-all hover:border-brand-300 hover:text-brand-600 hover:shadow-lg"
                            >
                                <Eye size={20} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Preview</span>
                            </button>
                            <button 
                                onClick={handleDownloadPDF}
                                className="flex flex-col items-center gap-3 rounded-3xl border border-slate-100 bg-white p-6 text-slate-600 transition-all hover:border-brand-300 hover:text-brand-600 hover:shadow-lg"
                            >
                                <FileText size={20} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Sync PDF</span>
                            </button>
                        </div>
                    </WorkspaceSection>
                </div>
            </div>

            <ConfirmDialog
                open={deleteOpen}
                title="Archive Revenue Asset"
                message={`Are you sure you want to permanently terminate Proposal ${currentProposal.proposalNumber}? This will remove all transactional mapping and archival records from the live pipeline.`}
                confirmLabel="Execute Asset Termination"
                onCancel={() => setDeleteOpen(false)}
                onConfirm={confirmDelete}
            />
        </div>
    );
};

export default ProposalDetailsPage;
