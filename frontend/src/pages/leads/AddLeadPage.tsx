import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch } from '../../store';
import { createLead } from '../../store/slices/leadSlice';
import LeadForm, { type LeadFormPayload } from '../../components/leads/LeadForm';
import { useState } from 'react';
import { UserPlus, ArrowLeft, Sparkles } from 'lucide-react';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { ROUTES } from '../../routes';

export const AddLeadPage = () => {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = async (data: LeadFormPayload) => {
        setFormError(null);
        try {
            await dispatch(createLead(data)).unwrap();
            navigate('/leads');
        } catch (error) {
            console.error('Failed to create lead:', error);
            setFormError(typeof error === 'string' ? error : 'Failed to create lead.');
        }
    };

    return (
        <div className="page-layout workspace-stack">
            <div className="flex flex-col gap-6">
                <Breadcrumb items={[{ label: 'Dashboard', to: ROUTES.dashboard }, { label: 'Leads', to: ROUTES.leads }, { label: 'New Lead Initialization' }]} />
                
                <div className="workspace-hero tt-animate-fade-up">
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-3xl">
                            <button
                                onClick={() => navigate(ROUTES.leads)}
                                className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 transition hover:text-slate-900"
                            >
                                <ArrowLeft size={16} />
                                Back to leads
                            </button>
                            <div className="mb-3 flex items-center gap-3">
                                <span className="rounded-full bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700 shadow-sm">
                                    New lead
                                </span>
                                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                                    Capture and assign opportunity data
                                </span>
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
                                Add a lead record that is ready for follow-up.
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                                Keep lead capture clean, assign ownership early, and set the next follow-up before the record enters the pipeline.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 self-start rounded-[1.75rem] border border-[var(--mod-border)] bg-[#fffaf4] px-5 py-4 shadow-[0_10px_30px_rgba(120,74,24,0.08)]">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                                <UserPlus size={28} strokeWidth={1.8} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">
                                    <Sparkles size={12} />
                                    Sales ready
                                </div>
                                <p className="mt-1 text-sm font-semibold text-slate-900">Lead creation workspace</p>
                                <p className="text-xs text-slate-500">Structured for daily CRM intake</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative tt-animate-fade-up" style={{ animationDelay: '100ms' }}>
                <div className="relative workspace-sheet p-8 md:p-10">
                    <LeadForm onSubmit={handleSubmit} error={formError} onCancel={() => navigate(ROUTES.leads)} />
                </div>
            </div>
        </div>
    );
};

