import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import { updateLeadFollowUp, addLeadNote, updateLeadStatus } from '../../store/slices/leadSlice';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import InlineAlert from '../ui/InlineAlert';
import { DashboardData, LeadFollowup, LeadFollowupBuckets } from '../../types/dashboard';
import { showToast } from '../../utils/toast';
import { getErrorMessage } from '../../utils/error';
import { Calendar, Clock, User, ChevronRight, CheckCircle2, RefreshCcw, Search, Building2, Phone, Mail } from 'lucide-react';
import PanelHeader from '../ui/PanelHeader';

interface DashboardFollowupsProps {
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    onRefresh: () => void;
}

const DashboardFollowups = ({ data, loading, error, onRetry, onRefresh }: DashboardFollowupsProps) => {
    const dispatch = useAppDispatch();
    const [activeFollowupTab, setActiveFollowupTab] = useState<'today' | 'overdue' | 'upcoming'>('today');
    const leadFollowups: LeadFollowupBuckets = data?.followups?.leads || { overdue: [], today: [], upcoming: [] };

    // Modal State
    const [actionModal, setActionModal] = useState<{
        type: 'done' | 'reschedule' | 'note' | 'stage' | null;
        lead: LeadFollowup | null;
    }>({ type: null, lead: null });

    // Form State
    const [actionForm, setActionForm] = useState({
        nextFollowUpAt: '',
        followUpType: '',
        note: '',
        stage: ''
    });
    const [actionSaving, setActionSaving] = useState(false);

    const openActionModal = (type: 'done' | 'reschedule' | 'note' | 'stage', lead: LeadFollowup) => {
        setActionModal({ type, lead });
        setActionForm({
            nextFollowUpAt: lead?.nextFollowUpDate
                ? new Date(lead.nextFollowUpDate).toISOString().slice(0, 16)
                : '',
            followUpType: lead?.followUpType || '',
            note: '',
            stage: lead?.status || ''
        });
    };

    const closeActionModal = () => {
        setActionModal({ type: null, lead: null });
        setActionForm({ nextFollowUpAt: '', followUpType: '', note: '', stage: '' });
    };

    const handleActionSubmit = async () => {
        if (!actionModal.lead) return;
        setActionSaving(true);
        try {
            if (actionModal.type === 'done') {
                await dispatch(updateLeadFollowUp({
                    id: actionModal.lead._id,
                    nextFollowUpAt: actionForm.nextFollowUpAt || undefined,
                    followUpType: actionForm.followUpType || undefined,
                    note: actionForm.note || undefined,
                    action: 'done'
                })).unwrap();
            } else if (actionModal.type === 'reschedule') {
                await dispatch(updateLeadFollowUp({
                    id: actionModal.lead._id,
                    nextFollowUpAt: actionForm.nextFollowUpAt || undefined,
                    followUpType: actionForm.followUpType || undefined,
                    note: actionForm.note || undefined,
                    action: 'reschedule'
                })).unwrap();
            } else if (actionModal.type === 'note') {
                await dispatch(addLeadNote({
                    id: actionModal.lead._id,
                    note: actionForm.note || ''
                })).unwrap();
            } else if (actionModal.type === 'stage') {
                if (actionForm.stage === 'Lost' && !actionForm.note.trim()) {
                    throw new Error('Lost reason is required');
                }
                await dispatch(updateLeadStatus({
                    id: actionModal.lead._id,
                    status: actionForm.stage,
                    lostReason: actionForm.stage === 'Lost' ? actionForm.note : undefined
                })).unwrap();
                await dispatch(addLeadNote({
                    id: actionModal.lead._id,
                    note: actionForm.note
                        ? `Stage changed to ${actionForm.stage}. Note: ${actionForm.note}`
                        : `Stage changed to ${actionForm.stage}`
                })).unwrap();
            }

            showToast('Follow-up updated successfully.', 'success');
            closeActionModal();
            onRefresh();
        } catch (err: unknown) {
            showToast(getErrorMessage(err, 'Update failed.'), 'error');
        } finally {
            setActionSaving(false);
        }
    };

    const getFollowUpIcon = (type?: string) => {
        switch (type?.toLowerCase()) {
            case 'call': return <Phone size={14} />;
            case 'email': return <Mail size={14} />;
            case 'meeting': return <Calendar size={14} />;
            default: return <Clock size={14} />;
        }
    };

    return (
        <Card variant="panel" className="relative h-full overflow-hidden p-0">
            <div className="border-b border-slate-200/70 px-6 py-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <PanelHeader
                        icon={Clock}
                        eyebrow="Execution queue"
                        title="Task Center"
                        description="Manage lead follow-ups with clear urgency buckets and fast inline actions."
                    />
                    <Link
                        to="/tasks?view=followups"
                        className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                    >
                        View All Tasks
                        <ChevronRight size={14} />
                    </Link>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => setActiveFollowupTab('overdue')}
                        className={`group relative p-4 rounded-xl border transition-all text-left ${activeFollowupTab === 'overdue' ? 'bg-red-50 text-red-900 border-red-200 shadow-sm' : 'bg-white border-slate-200 hover:border-red-200 hover:bg-red-50/50'}`}
                    >
                        <p className={`text-xs font-semibold mb-1 ${activeFollowupTab === 'overdue' ? 'text-red-600' : 'text-slate-500'}`}>Overdue</p>
                        <p className="text-2xl font-bold">{leadFollowups.overdue.length}</p>
                    </button>
                    <button
                        onClick={() => setActiveFollowupTab('today')}
                        className={`group relative p-4 rounded-xl border transition-all text-left ${activeFollowupTab === 'today' ? 'bg-brand-50 text-brand-900 border-brand-200 shadow-sm' : 'bg-white border-slate-200 hover:border-brand-200 hover:bg-brand-50/50'}`}
                    >
                        <p className={`text-xs font-semibold mb-1 ${activeFollowupTab === 'today' ? 'text-brand-600' : 'text-slate-500'}`}>Due Today</p>
                        <p className="text-2xl font-bold">{leadFollowups.today.length}</p>
                    </button>
                    <button
                        onClick={() => setActiveFollowupTab('upcoming')}
                        className={`group relative p-4 rounded-xl border transition-all text-left ${activeFollowupTab === 'upcoming' ? 'bg-slate-100 text-slate-900 border-slate-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                        <p className={`text-xs font-semibold mb-1 ${activeFollowupTab === 'upcoming' ? 'text-slate-600' : 'text-slate-500'}`}>Upcoming</p>
                        <p className="text-2xl font-bold">{leadFollowups.upcoming.length}</p>
                    </button>
                </div>
            </div>

            <div className="p-6 bg-slate-50/30">
                {loading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <Skeleton key={`followup-skeleton-${idx}`} className="h-28 w-full rounded-xl" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="py-8">
                        <InlineAlert
                            message="Failed to load follow-ups."
                            onRetry={onRetry}
                        />
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                        {leadFollowups[activeFollowupTab].slice(0, 10).map((lead) => (
                            <div
                                key={lead._id}
                                className="group/item relative rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 flex shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover/item:bg-brand-50 group-hover/item:text-brand-600 transition-colors">
                                                <User size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold text-slate-900 truncate">
                                                    {lead.name}
                                                </h4>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Building2 size={12} className="text-slate-400" />
                                                    <span className="text-xs font-medium text-slate-500 truncate">
                                                        {lead.company || 'Not specified'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 ml-[52px]">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600">
                                                {getFollowUpIcon(lead.followUpType)}
                                                {lead.followUpType || 'General'}
                                            </span>
                                            <span className="text-xs font-semibold text-brand-600">
                                                {lead.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="flex items-center justify-end gap-1.5 text-slate-900">
                                            <Clock size={12} className={activeFollowupTab === 'overdue' ? 'text-red-500' : 'text-slate-400'} />
                                            <span className={`text-sm font-bold ${activeFollowupTab === 'overdue' ? 'text-red-600' : 'text-slate-900'}`}>
                                                {lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                                            {lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString() : 'No Date'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <button
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-xs transition-colors hover:bg-emerald-100"
                                        onClick={() => openActionModal('done', lead)}
                                    >
                                        <CheckCircle2 size={14} />
                                        Complete
                                    </button>
                                    <button
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-semibold text-xs transition-colors hover:bg-slate-100"
                                        onClick={() => openActionModal('reschedule', lead)}
                                    >
                                        <RefreshCcw size={14} />
                                        Reschedule
                                    </button>
                                    <button
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 font-semibold text-xs transition-colors hover:bg-brand-100"
                                        onClick={() => openActionModal('stage', lead)}
                                    >
                                        <Search size={14} />
                                        Update Level
                                    </button>
                                </div>
                            </div>
                        ))}
                        {leadFollowups[activeFollowupTab].length === 0 && (
                            <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
                                <Clock size={28} className="mx-auto mb-3 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-600">No {activeFollowupTab} tasks</p>
                                <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Action Modal */}
            {actionModal.type && actionModal.lead && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {actionModal.type === 'done' ? 'Complete Follow-up' :
                                        actionModal.type === 'reschedule' ? 'Reschedule' :
                                            actionModal.type === 'note' ? 'Add Note' : 'Update Stage'}
                                </h3>
                                <p className="text-sm text-slate-500 mt-0.5">For lead: <span className="font-semibold text-slate-700">{actionModal.lead.name}</span></p>
                            </div>
                        </div>

                        <div className="p-6 space-y-5 bg-slate-50/50">
                            {(actionModal.type === 'done' || actionModal.type === 'reschedule') && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Next Follow-up Step</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                                            value={actionForm.nextFollowUpAt}
                                            onChange={(e) => setActionForm({ ...actionForm, nextFollowUpAt: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Method</label>
                                        <select
                                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                                            value={actionForm.followUpType}
                                            onChange={(e) => setActionForm({ ...actionForm, followUpType: e.target.value })}
                                        >
                                            <option value="">Select Method</option>
                                            <option value="Call">Call</option>
                                            <option value="WhatsApp">WhatsApp</option>
                                            <option value="Email">Email</option>
                                            <option value="Meeting">Meeting</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {actionModal.type === 'stage' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">New Stage</label>
                                    <select
                                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                                        value={actionForm.stage}
                                        onChange={(e) => setActionForm({ ...actionForm, stage: e.target.value })}
                                    >
                                        <option value="">Select Stage...</option>
                                        {['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Notes & Comments</label>
                                <textarea
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none h-28 resize-none"
                                    value={actionForm.note}
                                    onChange={(e) => setActionForm({ ...actionForm, note: e.target.value })}
                                    placeholder="Add any relevant updates..."
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
                            <button
                                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                onClick={closeActionModal}
                                disabled={actionSaving}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                onClick={handleActionSubmit}
                                disabled={actionSaving}
                            >
                                {actionSaving ? 'Saving...' : 'Save Updates'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default DashboardFollowups;
