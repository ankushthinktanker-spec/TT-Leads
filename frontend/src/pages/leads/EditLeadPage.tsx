import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import { fetchLead, updateLead, clearCurrentLead } from '../../store/slices/leadSlice';
import LeadForm, { type LeadFormPayload } from '../../components/leads/LeadForm';
import { Settings, ArrowLeft, Sparkles } from 'lucide-react';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Skeleton from '../../components/ui/Skeleton';
import InlineError from '../../components/ui/InlineError';
import { ROUTES } from '../../routes';
import WorkspaceSection from '../../components/ui/WorkspaceSection';

export const EditLeadPage = () => {
    const { id } = useParams<{ id: string }>();
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { lead, loading, error } = useSelector((state: RootState) => state.leads);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            dispatch(fetchLead(id));
        }
        return () => {
            dispatch(clearCurrentLead());
        };
    }, [dispatch, id]);

    const handleSubmit = async (data: LeadFormPayload) => {
        if (!id) return;
        try {
            setFormError(null);
            await dispatch(updateLead({ id, data })).unwrap();
            navigate('/leads');
        } catch (error) {
            console.error('Failed to update lead:', error);
            setFormError(typeof error === 'string' ? error : 'Failed to update lead.');
        }
    };

    if (loading) {
        return (
            <div className="page-layout space-y-8">
                <Skeleton className="h-12 w-1/3 rounded-xl" />
                <Skeleton className="h-64 w-full rounded-[2.5rem]" />
                <Skeleton className="h-[600px] w-full rounded-[2.5rem]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-layout py-20 text-center">
                <InlineError message={error} onRetry={() => id && dispatch(fetchLead(id))} />
            </div>
        );
    }

    return (
        <div className="page-layout space-y-6 pb-20">
            <div className="flex flex-col gap-6">
                <Breadcrumb 
                    items={[
                        { label: 'Dashboard', to: ROUTES.dashboard }, 
                        { label: 'Leads', to: ROUTES.leads }, 
                        { label: lead ? `${lead.firstName} ${lead.lastName}` : 'Refining Asset', to: lead ? `${ROUTES.leads}/${lead._id}` : undefined },
                        { label: 'Asset Calibration' }
                    ]} 
                />
                
                <div className="tt-animate-fade-up">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <button
                                onClick={() => navigate(lead ? `${ROUTES.leads}/${lead._id}` : ROUTES.leads)}
                                className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 transition hover:text-slate-900"
                            >
                                <ArrowLeft size={16} />
                                Back to lead
                            </button>
                            <div className="mb-3 flex items-center gap-3">
                                <span className="rounded-full bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700 shadow-sm">
                                    Edit lead
                                </span>
                                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                                    Update assignment, status, and follow-up readiness
                                </span>
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
                                Refine the lead record and keep pipeline details current.
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                                Editing <span className="font-semibold text-slate-900">{lead?.firstName} {lead?.lastName}</span>. Keep ownership, source, and next action aligned so the team can move quickly.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 self-start rounded-[1.25rem] border border-[var(--mod-border)] bg-[#fffaf4] px-4 py-3 shadow-[0_10px_30px_rgba(120,74,24,0.08)]">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                                <Settings size={28} strokeWidth={1.8} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">
                                    <Sparkles size={12} />
                                    CRM update
                                </div>
                                <p className="mt-1 text-sm font-semibold text-slate-900">Lead details workspace</p>
                                <p className="text-xs text-slate-500">Operational edits with clean field hierarchy</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="tt-animate-fade-up" style={{ animationDelay: '100ms' }}>
                <WorkspaceSection
                    title="Lead details"
                    description="Update qualification data, ownership, source, and next-step information without changing the lead workflow."
                    eyebrow="Edit workspace"
                    aside={<><Sparkles size={14} className="text-emerald-600" /> Live CRM update</>}
                    contentClassName="py-8 md:py-9"
                >
                    {lead && (
                        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-[#fffaf4] px-4 py-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Current status</p>
                                <p className="mt-1 text-sm font-bold text-slate-900">{lead.status}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-[#fffaf4] px-4 py-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Source</p>
                                <p className="mt-1 text-sm font-bold text-slate-900">{lead.source || 'Direct'}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-[#fffaf4] px-4 py-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Priority</p>
                                <p className="mt-1 text-sm font-bold text-slate-900">{lead.priority || 'Cold'}</p>
                            </div>
                        </div>
                    )}
                    {lead && (
                        <LeadForm
                            initialData={lead}
                            onSubmit={handleSubmit}
                            error={formError}
                            onCancel={() => navigate(lead ? `${ROUTES.leads}/${lead._id}` : ROUTES.leads)}
                        />
                    )}
                </WorkspaceSection>
            </div>
        </div>
    );
};

