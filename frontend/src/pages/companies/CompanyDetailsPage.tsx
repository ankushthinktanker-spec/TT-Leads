import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchCompany, clearCurrentCompany } from '../../store/slices/companySlice';
import { ArrowLeft, Building2, Edit, Globe, Mail, Phone } from 'lucide-react';
import WorkspaceSection from '../../components/ui/WorkspaceSection';

const CompanyDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { currentItem: currentCompany, loading } = useAppSelector((state) => state.companies);

    useEffect(() => {
        if (id) {
            dispatch(fetchCompany(id));
        }
        return () => {
            dispatch(clearCurrentCompany());
        };
    }, [dispatch, id]);

    if (loading) {
        return (
            <div className="page-layout flex justify-center items-center h-[60vh]">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-brand-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
                    </div>
                </div>
            </div>
        );
    }

    if (!currentCompany) {
        return (
            <div className="page-layout space-y-8">
                <button
                    onClick={() => navigate('/companies')}
                    className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 transition-all hover:text-brand-700"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Companies
                </button>
                <div className="rounded-[28px] border border-slate-200/80 bg-[#fffaf4] p-12 text-center shadow-[0_18px_48px_rgba(120,74,24,0.08)]">
                    <p className="mb-2 text-xl font-black tracking-tight text-slate-900">Company not found</p>
                    <p className="text-sm font-medium text-slate-500">The requested company record could not be loaded.</p>
                </div>
            </div>
        );
    }

    const address = currentCompany.address || {};
    const tagsCount = currentCompany.tags?.length || 0;

    return (
        <div className="page-layout space-y-5 pb-16">
            <div className="tt-animate-fade-up">
                <button
                    onClick={() => navigate('/companies')}
                    className="group mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 transition-all hover:text-brand-700"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Companies
                </button>

                <div className="workspace-hero flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                                Company record
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                {currentCompany.industry || 'General'}
                            </span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-950">{currentCompany.name}</h1>
                        <p className="text-sm font-medium text-slate-500">
                            Review company profile, communication details, identifiers, and tags in one connected workspace.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="rounded-full border border-slate-200 bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold text-slate-600">
                                {currentCompany.status}
                            </span>
                            {currentCompany.industry && (
                                <span className="rounded-full border border-slate-200 bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold text-slate-600">
                                    {currentCompany.industry}
                                </span>
                            )}
                            <span className="rounded-full border border-slate-200 bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold text-slate-600">
                                {tagsCount} tags
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate(`/companies/${currentCompany._id}/edit`)}
                        className="btn btn-secondary"
                    >
                        <Edit size={16} />
                        Edit Company
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 tt-animate-fade-up" style={{ animationDelay: '100ms' }}>
                <div className="workspace-section px-5 py-4">
                    <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                    <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${currentCompany.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-xl font-black uppercase tracking-tight text-slate-900">{currentCompany.status}</span>
                    </div>
                </div>
                <div className="workspace-section px-5 py-4">
                    <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Company size</p>
                    <div className="text-xl font-black tracking-tight text-slate-900">
                        {currentCompany.companySize || 'Not set'}
                    </div>
                </div>
                <div className="workspace-section px-5 py-4">
                    <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Website</p>
                    {currentCompany.website ? (
                        <a href={currentCompany.website} target="_blank" rel="noreferrer" className="line-clamp-1 text-xl font-black text-brand-700 transition-colors hover:text-brand-600">
                            {currentCompany.website.replace(/^https?:\/\//, '')}
                        </a>
                    ) : <span className="text-xl font-black tracking-tight text-slate-300">Not added</span>}
                </div>
                <div className="workspace-section px-5 py-5 md:col-span-3 lg:hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Tags</p>
                            <p className="text-xl font-black uppercase tracking-tight text-slate-900">{tagsCount}</p>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            {currentCompany.industry || 'General'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 tt-animate-fade-up" style={{ animationDelay: '200ms' }}>
                <div className="space-y-6">
                    <WorkspaceSection
                        title="Communication"
                        description="Primary contact channels attached to this company record."
                        eyebrow="Contact channels"
                        aside={<><Building2 size={16} className="text-brand-500" /> Communication</>}
                    >
                        <div className="space-y-6">
                            <div className="flex items-center gap-6">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-200/60 bg-brand-50 text-brand-600">
                                    <Mail size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Email</p>
                                    {currentCompany.email ? (
                                        <a href={`mailto:${currentCompany.email}`} className="text-base font-bold text-slate-900 hover:text-brand-600 transition-colors block truncate">
                                            {currentCompany.email}
                                        </a>
                                    ) : <p className="text-base font-bold text-slate-300">Not added</p>}
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-100/50 bg-cyan-50 text-cyan-500">
                                    <Phone size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Phone</p>
                                    {currentCompany.phone ? (
                                        <a href={`tel:${currentCompany.phone}`} className="text-base font-bold text-slate-900 hover:text-cyan-600 transition-colors block">
                                            {currentCompany.phone}
                                        </a>
                                    ) : <p className="text-base font-bold text-slate-300">Not added</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100/50 bg-emerald-50 text-emerald-600">
                                    <Globe size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Website</p>
                                    {currentCompany.website ? (
                                        <a href={currentCompany.website} target="_blank" rel="noreferrer" className="block truncate text-base font-bold text-slate-900 transition-colors hover:text-emerald-600">
                                            {currentCompany.website.replace(/^https?:\/\//, '')}
                                        </a>
                                    ) : <p className="text-base font-bold text-slate-300">Not added</p>}
                                </div>
                            </div>
                        </div>
                    </WorkspaceSection>

                    <WorkspaceSection
                        title="Address"
                        description="Recorded mailing and operational address for documents and account records."
                        eyebrow="Location"
                    >
                        <div className="space-y-1">
                            <p className="text-lg font-black text-slate-900">{address.street || 'No street address recorded'}</p>
                            <p className="text-base font-bold text-slate-500">
                                {[address.city, address.state].filter(Boolean).join(', ') || 'No city or state recorded'}
                            </p>
                            <p className="text-base font-bold text-slate-500">
                                {[address.country, address.pinCode].filter(Boolean).join(' ') || 'No country or postal code recorded'}
                            </p>
                        </div>
                    </WorkspaceSection>
                </div>

                <div className="space-y-6">
                    <WorkspaceSection
                        title="Company identifiers"
                        description="Business and compliance identifiers used for proposals, contracts, and invoicing."
                        eyebrow="Identifiers"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">GST</p>
                                <p className="text-base font-black text-slate-900">{currentCompany.gst || 'Not registered'}</p>
                            </div>
                            <div>
                                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">PAN</p>
                                <p className="text-base font-black text-slate-900">{currentCompany.pan || 'Not registered'}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Registration number</p>
                                <p className="text-base font-black text-slate-900">{currentCompany.registrationNumber || 'Not documented'}</p>
                            </div>
                        </div>
                    </WorkspaceSection>

                    <WorkspaceSection
                        title="Tags"
                        description="Lightweight classification labels for segmentation and reporting."
                        eyebrow="Segmentation"
                    >
                        <div className="flex flex-wrap gap-2">
                            {currentCompany.tags?.length ? (
                                currentCompany.tags.map((tag, idx) => (
                                    <span key={idx} className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand-700">
                                        {tag}
                                    </span>
                                ))
                            ) : (
                                <span className="text-[10px] font-black uppercase tracking-widest italic text-slate-300">No tags added</span>
                            )}
                        </div>
                    </WorkspaceSection>
                </div>
            </div>
        </div>
    );
};

export default CompanyDetailsPage;


