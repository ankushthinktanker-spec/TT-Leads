import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Clock3, Mail, Phone, Trash2, Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchLead, clearCurrentLead, deleteLead, addLeadNote } from '../../store/slices/leadSlice';
import { fetchProposals } from '../../store/slices/proposalSlice';
import PageLayout from '../../components/ui/PageLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import InlineError from '../../components/ui/InlineError';
import Tabs, { TabItem, TabPanel } from '../../components/ui/Tabs';
import Breadcrumb from '../../components/ui/Breadcrumb';
import LeadActivityTimeline from '../../components/leads/LeadActivityTimeline';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { ROUTES } from '../../routes';
import { showToast } from '../../utils/toast';
import WorkspaceSection from '../../components/ui/WorkspaceSection';

const statusVariant = (status: string): 'neutral' | 'success' | 'warning' | 'danger' => {
    if (status === 'Won' || status === 'Qualified') return 'success';
    if (status === 'Lost') return 'danger';
    if (status === 'Proposal Sent' || status === 'Contacted') return 'warning';
    return 'neutral';
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

export const LeadDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { lead, loading, error } = useAppSelector((state) => state.leads);
    const { proposals } = useAppSelector((state) => state.proposals);

    const [activeTab, setActiveTab] = useState('overview');
    const [noteText, setNoteText] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);

    useEffect(() => {
        if (!id) return;
        dispatch(fetchLead(id));
        dispatch(fetchProposals({ leadId: id, limit: 10, page: 1, sortBy: 'createdAt', sortOrder: 'desc' }));
        return () => {
            dispatch(clearCurrentLead());
        };
    }, [dispatch, id]);

    const proposalCount = useMemo(() => proposals.filter((proposal) => proposal.leadId === id).length, [proposals, id]);

    const tabs: TabItem[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'activity', label: 'Activity / Timeline' },
        { id: 'notes', label: 'Notes' },
        { id: 'proposals', label: 'Proposals', badge: proposalCount }
    ];

    const handleDelete = async () => {
        if (!id) return;
        await dispatch(deleteLead(id));
        showToast('Lead deleted.', 'success');
        navigate(ROUTES.leads);
    };

    const handleAddNote = async () => {
        if (!id || !noteText.trim()) return;
        try {
            await dispatch(addLeadNote({ id, note: noteText.trim() })).unwrap();
            showToast('Note added to timeline.', 'success');
            setNoteText('');
        } catch {
            showToast('Unable to add note. Try again.', 'error');
        }
    };

    if (loading) {
        return (
            <PageLayout className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-80 w-full" />
            </PageLayout>
        );
    }

    if (error || !lead) {
        return (
            <PageLayout>
                <InlineError message={error || 'Lead not found'} onRetry={() => id && dispatch(fetchLead(id))} />
            </PageLayout>
        );
    }

    const ownerName = typeof lead.ownerId === 'object'
        ? `${lead.ownerId.firstName || ''} ${lead.ownerId.lastName || ''}`.trim()
        : 'Unassigned';

    const leadProposals = proposals.filter((proposal) => proposal.leadId === lead._id);
    const nextFollowUpLabel = lead.nextFollowUpDate ? formatDateTime(lead.nextFollowUpDate) : 'No follow-up set';

    return (
        <div className="page-layout workspace-stack">
            <div className="flex flex-col gap-6">
                <Breadcrumb items={[{ label: 'Dashboard', to: ROUTES.dashboard }, { label: 'Leads', to: ROUTES.leads }, { label: `${lead.firstName} ${lead.lastName}` }]} />
                
                <div className="tt-animate-fade-up">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="flex items-center gap-8">
                            <div className="relative group">
                                <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#fffdf9] text-3xl font-black text-slate-900 shadow-[0_12px_28px_rgba(120,74,24,0.08)] ring-1 ring-slate-200 transition-all duration-500">
                                    {lead.firstName?.[0]}{lead.lastName?.[0]}
                                </div>
                                <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-[#fffaf4] bg-emerald-500 shadow-lg">
                                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-brand-700">
                                        Lead record
                                    </span>
                                    <span className="h-px w-8 bg-slate-300" />
                                    <Badge variant={statusVariant(lead.status)} className="shadow-sm py-1 px-3 text-[9px] font-black uppercase tracking-wider">
                                        {lead.status}
                                    </Badge>
                                </div>
                                <h1 className="text-3xl font-black tracking-tight leading-none text-slate-950">
                                    {lead.firstName} <span className="text-brand-600">{lead.lastName}</span>
                                </h1>
                                <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-slate-500">
                                    <span className="flex items-center gap-2">
                                        <Building2 size={16} className="text-brand-600" />
                                        {lead.company || 'No company linked'}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <span className="h-1 w-1 rounded-full bg-slate-400" />
                                        Source: {lead.source || 'Direct'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <button
                                onClick={() => navigate(`${ROUTES.leads}/${lead._id}/edit`)}
                                className="btn btn-secondary"
                            >
                                Edit lead
                            </button>
                            <button
                                onClick={() => navigate(`${ROUTES.proposals}/new?leadId=${lead._id}`)}
                                className="btn btn-primary"
                            >
                                Create proposal
                            </button>
                            <button 
                                onClick={() => setDeleteOpen(true)}
                                className="px-3 py-3 rounded-2xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="workspace-section px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Status</p>
                    <div className="mt-2 flex items-center justify-between">
                        <Badge variant={statusVariant(lead.status)} className="rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                            {lead.status}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-500">{lead.source || 'Direct'}</span>
                    </div>
                </div>
                <div className="workspace-section px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Owner</p>
                    <div className="mt-2 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-[#fffdf9] text-[10px] font-black text-slate-900">
                            {ownerName?.[0] || 'U'}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">{ownerName || 'Unassigned'}</p>
                            <p className="text-[11px] text-slate-500">Lead owner</p>
                        </div>
                    </div>
                </div>
                <div className="workspace-section px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Next follow-up</p>
                    <div className="mt-2">
                        <p className="text-sm font-bold text-slate-900">{nextFollowUpLabel}</p>
                        <p className="text-[11px] text-slate-500">Next planned action</p>
                    </div>
                </div>
            </div>

            <div className="workspace-sheet">
                <div className="overflow-hidden">
                    <div className="border-b border-slate-100 bg-[#fbf2e7]/70 px-8 pt-4">
                        <div className="flex items-center justify-between pb-1">
                            <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
                            <div className="hidden lg:flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Clock3 size={14} className="text-brand-500" />
                                Updated: {formatDateTime(lead.updatedAt)}
                            </div>
                        </div>
                    </div>

                    <div className="p-10">
                        {activeTab === 'overview' && (
                            <TabPanel>
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    <WorkspaceSection
                                        title="Communication"
                                        description="Primary contact channels for direct outreach."
                                        eyebrow="Contact channels"
                                        contentClassName="py-6"
                                    >
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-5">
                                                <div className="h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-sm">
                                                    <Mail size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Email</p>
                                                    <p className="text-sm font-black text-slate-900 tracking-tight group-hover:text-brand-600 transition-colors truncate">
                                                        {lead.email || 'Not added'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-5">
                                                <div className="h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-sm">
                                                    <Phone size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Phone</p>
                                                    <p className="text-sm font-black text-slate-900 tracking-tight group-hover:text-brand-600 transition-colors">
                                                        {lead.phone || 'Not added'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </WorkspaceSection>

                                    <WorkspaceSection
                                        title="Lead details"
                                        description="Source, priority, and next follow-up context."
                                        eyebrow="Qualification"
                                        contentClassName="py-6"
                                    >
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold tracking-tight text-slate-500">Source</span>
                                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{lead.source || 'Direct'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold tracking-tight text-slate-500">Priority</span>
                                                <Badge 
                                                    variant={lead.priority === 'Hot' ? 'danger' : lead.priority === 'Warm' ? 'warning' : 'neutral'} 
                                                    className="shadow-sm py-1 px-3 text-[10px] font-black uppercase"
                                                >
                                                    {lead.priority || 'Cold'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold tracking-tight text-slate-500">Next follow-up</span>
                                                    <span className="text-xs font-black text-brand-700">{formatDateTime(lead.nextFollowUpDate)}</span>
                                            </div>
                                        </div>
                                    </WorkspaceSection>

                                    <WorkspaceSection
                                        title="Ownership"
                                        description="Assigned owner and record timing details."
                                        eyebrow="Accountability"
                                        contentClassName="py-6"
                                    >
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <p className="text-[10px] uppercase font-black tracking-tighter text-slate-400">Owner</p>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-900">
                                                        {ownerName?.[0]}
                                                    </div>
                                                    <p className="text-sm font-black text-slate-900 tracking-tight">{ownerName}</p>
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t border-slate-200 space-y-4">
                                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                                                    <Clock3 size={14} className="text-slate-400" />
                                                    Created: {formatDateTime(lead.createdAt)}
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                                                    <Clock3 size={14} className="text-slate-400" />
                                                    Updated: {formatDateTime(lead.updatedAt)}
                                                </div>
                                            </div>
                                        </div>
                                    </WorkspaceSection>
                                </div>
                            </TabPanel>
                        )}

                        {activeTab === 'activity' && (
                            <TabPanel>
                                <div className="max-w-4xl mx-auto">
                                    <LeadActivityTimeline leadId={lead._id} />
                                </div>
                            </TabPanel>
                        )}

                        {activeTab === 'notes' && (
                            <TabPanel>
                                <div className="max-w-3xl mx-auto space-y-8">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black tracking-tight text-slate-900">Notes</h3>
                                        <p className="text-sm font-medium text-slate-500">Add sales context, conversation summaries, and internal follow-up notes.</p>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-brand-400 rounded-[2rem] blur opacity-10 group-focus-within:opacity-25 transition duration-500" />
                                        <div className="relative p-8 rounded-[2rem] bg-[#fffaf4] border border-slate-100 shadow-[0_24px_48px_rgba(120,74,24,0.10)] space-y-6">
                                            <textarea
                                                className="w-full min-h-[200px] p-6 bg-slate-50/50 border border-slate-100 rounded-3xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-[#fffdf9] focus:border-brand-400 focus:ring-4 focus:ring-brand-500/8 transition-all outline-none resize-none"
                                                value={noteText}
                                                onChange={(e) => setNoteText(e.target.value)}
                                                placeholder="Add a note for this lead..."
                                            />
                                            <div className="flex justify-end">
                                                <button 
                                                    onClick={handleAddNote} 
                                                    disabled={!noteText.trim()}
                                                    className="px-10 py-4 rounded-2xl bg-brand-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-600/20 hover:bg-brand-500 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                                                >
                                                    Add note
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabPanel>
                        )}

                        {activeTab === 'proposals' && (
                            <TabPanel>
                                {leadProposals.length === 0 ? (
                                    <div className="py-20 text-center">
                                        <div className="h-24 w-24 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6 border border-slate-100">
                                            <Plus size={32} className="text-slate-200" />
                                        </div>
                                        <h3 className="mb-2 text-xl font-black text-slate-900">No proposals yet</h3>
                                        <p className="mx-auto mb-8 max-w-xs text-sm font-medium text-slate-400">
                                            Create the first proposal linked to this lead to begin tracking commercial progress.
                                        </p>
                                        <Button 
                                            onClick={() => navigate(`${ROUTES.proposals}/new?leadId=${lead._id}`)}
                                            className="px-8 py-3 rounded-xl font-black tracking-widest bg-brand-600"
                                        >
                                            Create proposal
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-[2rem] border border-slate-100 bg-[#fffaf4]/80 backdrop-blur-sm">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50">
                                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Proposal</th>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stage</th>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Value</th>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Updated</th>
                                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {leadProposals.map((proposal) => (
                                                    <tr key={proposal._id} className="group hover:bg-brand-50/60 transition-all duration-300">
                                                        <td className="px-8 py-5">
                                                            <p className="font-black text-slate-900 group-hover:text-brand-600 transition-colors tracking-tight">{proposal.title}</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{proposal.proposalNumber}</p>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <Badge variant={statusVariant(proposal.status)} className="shadow-sm py-1 px-3 text-[9px] font-black uppercase">
                                                                {proposal.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-5 font-black text-slate-900">
                                                            {formatCurrency(proposal.totalAmount || proposal.totalValue || 0)}
                                                        </td>
                                                        <td className="px-6 py-5 text-xs font-bold text-slate-500">
                                                            {formatDateTime(proposal.updatedAt)}
                                                        </td>
                                                        <td className="px-8 py-5 text-right">
                                                            <button 
                                                                className="px-6 py-2 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:border-brand-300 hover:text-brand-600 hover:bg-[#fffdf9] transition-all shadow-sm"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    navigate(`${ROUTES.proposals}/${proposal._id}`);
                                                                }}
                                                            >
                                                                View proposal
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </TabPanel>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={deleteOpen}
                title="Delete lead"
                message={`Are you sure you want to permanently delete ${lead.firstName}'s record? This action cannot be undone.`}
                confirmLabel="Delete lead"
                onCancel={() => setDeleteOpen(false)}
                onConfirm={handleDelete}
            />
        </div>
    );
};




