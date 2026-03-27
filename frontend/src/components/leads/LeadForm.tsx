import { useState, useEffect } from 'react';
import { User, Mail, Phone, Building2, MousePointer2, Briefcase, Calendar, Info, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchCompanies } from '../../store/slices/companySlice';
import { fetchContacts } from '../../store/slices/contactSlice';
import { fetchUsers } from '../../store/slices/userSlice';
import QuickAddCompanyModal from '../modals/QuickAddCompanyModal';
import QuickAddContactModal from '../modals/QuickAddContactModal';
import { LEAD_STATUS_OPTIONS } from '../../lib/utils';
import { FormLabel, TextInput, SelectInput, TextareaInput, HelperText, ErrorText } from '../ui/Form';

export interface LeadFormInitialData {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    companyId?: string | { _id?: string };
    contactId?: string | { _id?: string };
    source?: string;
    status?: string;
    dealValue?: string;
    requirementSummary?: string;
    lostReason?: string;
    ownerId?: string | { _id?: string };
    assignedTo?: string | { _id?: string };
    nextFollowUpDate?: string;
    nextFollowUpAt?: string;
    followUpType?: string;
}

interface LeadFormProps {
    initialData?: LeadFormInitialData;
    onSubmit: (data: LeadFormPayload) => void;
    error?: string | null;
}

interface LeadFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    companyId: string;
    contactId: string;
    source: string;
    status: string;
    dealValue: string;
    requirementSummary: string;
    lostReason: string;
    ownerId: string;
    nextFollowUpAt: string;
    followUpType: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | '';
}

export type LeadFormPayload = LeadFormData & {
    contactId?: string;
    companyId?: string;
    followUpType?: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING';
    nextFollowUpAt?: string;
};

const LeadForm = ({ initialData, onSubmit, error }: LeadFormProps) => {
    const dispatch = useAppDispatch();
    const { loading } = useAppSelector((state) => state.leads);
    const { companies } = useAppSelector((state) => state.companies);
    const { contacts } = useAppSelector((state) => state.contacts);
    const { users } = useAppSelector((state) => state.users);
    const { user } = useAppSelector((state) => state.auth);
    const userValue = user as { _id?: string; id?: string; role?: string; firstName?: string; lastName?: string } | null;
    const currentUserId = userValue?._id || userValue?.id || '';

    const formatDateTimeLocal = (value?: string) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const [formData, setFormData] = useState<LeadFormData>({
        firstName: initialData?.firstName || '',
        lastName: initialData?.lastName || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        company: initialData?.company || '',
        companyId: (typeof initialData?.companyId === 'string' ? initialData?.companyId : initialData?.companyId?._id) || '',
        contactId: (typeof initialData?.contactId === 'string' ? initialData?.contactId : initialData?.contactId?._id) || '',
        source: initialData?.source || 'Website',
        status: initialData?.status || 'New',
        dealValue: initialData?.dealValue || '',
        requirementSummary: initialData?.requirementSummary || '',
        lostReason: initialData?.lostReason || '',
        ownerId: (initialData as any)?.ownerId?._id || (initialData as any)?.ownerId || (initialData as any)?.assignedTo?._id || (initialData as any)?.assignedTo || currentUserId || '',
        nextFollowUpAt: formatDateTimeLocal(initialData?.nextFollowUpDate || initialData?.nextFollowUpAt),
        followUpType: (initialData?.followUpType as any) || ''
    });

    const [clientError, setClientError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    
    const ownerOptions = userValue?.role === 'Admin'
        ? users
        : currentUserId
            ? [{ _id: currentUserId, firstName: userValue?.firstName || 'You', lastName: userValue?.lastName || '' }]
            : [];

    useEffect(() => {
        dispatch(fetchCompanies({ limit: 100 }));
    }, [dispatch]);

    useEffect(() => {
        if (userValue?.role === 'Admin') {
            dispatch(fetchUsers({ limit: 100 }));
        }
    }, [dispatch, userValue?.role]);

    useEffect(() => {
        if (formData.companyId) {
            dispatch(fetchContacts({ companyId: formData.companyId, limit: 100 }));
        }
    }, [dispatch, formData.companyId]);

    useEffect(() => {
        if (!formData.companyId) {
            return;
        }

        const selectedCompany = companies.find((company) => company._id === formData.companyId);
        if (selectedCompany && formData.company !== selectedCompany.name) {
            setFormData((prev) => ({ ...prev, company: selectedCompany.name }));
        }
    }, [companies, formData.companyId, formData.company]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'companyId' && value === '__add_new__') {
            setShowCompanyModal(true);
            return;
        }
        if (name === 'contactId' && value === '__add_new__') {
            setShowContactModal(true);
            return;
        }

        if (name === 'companyId') {
            const selectedCompany = companies.find((company) => company._id === value);
            setFormData(prev => ({
                ...prev,
                companyId: value,
                company: selectedCompany?.name || prev.company,
                contactId: ''
            }));
            if (fieldErrors.companyId) {
                setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.companyId;
                    return next;
                });
            }
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleCompanyCreated = (companyId: string, companyName: string) => {
        setFormData(prev => ({
            ...prev,
            companyId,
            company: companyName,
            contactId: ''
        }));
        dispatch(fetchCompanies({ limit: 100 }));
    };

    const handleContactCreated = (contactId: string) => {
        setFormData(prev => ({ ...prev, contactId }));
        dispatch(fetchContacts({ companyId: formData.companyId, limit: 100 }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const nextErrors: Record<string, string> = {};

        if (!formData.firstName.trim()) nextErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) nextErrors.lastName = 'Last name is required';
        if (!formData.email.trim()) {
            nextErrors.email = 'Email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
            nextErrors.email = 'Please provide a valid email';
        }
        if (!formData.phone.trim()) nextErrors.phone = 'Phone is required';
        if (!formData.company.trim()) nextErrors.company = 'Company name is required';
        if (!formData.source) nextErrors.source = 'Source is required';
        if (!formData.status) nextErrors.status = 'Status is required';
        if (formData.status === 'Lost' && !formData.lostReason.trim()) {
            nextErrors.lostReason = 'Lost reason is required';
        }
        if (!initialData && !formData.nextFollowUpAt) {
            nextErrors.nextFollowUpAt = 'Next follow-up is required';
        }
        if (!formData.ownerId && currentUserId) {
            nextErrors.ownerId = 'Owner is required';
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            setClientError('Please complete the required fields before saving this lead.');
            return;
        }

        setClientError(null);
        setFieldErrors({});
        const payload: any = { ...formData };
        if (!payload.contactId) delete payload.contactId;
        if (!payload.companyId) delete payload.companyId;
        if (!payload.followUpType) delete payload.followUpType;
        if (!payload.nextFollowUpAt) delete payload.nextFollowUpAt;
        
        onSubmit(payload);
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-10">
                {(error || clientError) && (
                    <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 tt-animate-shake">
                        <AlertCircle size={18} />
                        {error || clientError}
                    </div>
                )}

                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-600">
                            <User size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-extrabold uppercase tracking-[0.22em] text-slate-900">Lead details</h3>
                            <p className="text-xs text-slate-500">Core contact information for the lead record.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-6 md:grid-cols-2 md:p-8">
                        <div>
                            <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">First Name <span className="text-sky-600">*</span></FormLabel>
                            <TextInput
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                placeholder="Enter first name"
                                className="h-12 rounded-xl border-slate-200 bg-white focus:border-sky-500"
                            />
                            {fieldErrors.firstName && <ErrorText className="mt-1 text-xs">{fieldErrors.firstName}</ErrorText>}
                        </div>

                        <div>
                            <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Last Name <span className="text-sky-600">*</span></FormLabel>
                            <TextInput
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                placeholder="Enter last name"
                                className="h-12 rounded-xl border-slate-200 bg-white focus:border-sky-500"
                            />
                            {fieldErrors.lastName && <ErrorText className="mt-1 text-xs">{fieldErrors.lastName}</ErrorText>}
                        </div>

                        <div>
                            <FormLabel className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                <Mail size={12} className="text-sky-500" />
                                Email <span className="text-sky-600">*</span>
                            </FormLabel>
                            <TextInput
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="john@nexus.com"
                                className="h-12 rounded-xl border-slate-200 bg-white focus:border-sky-500"
                            />
                            {fieldErrors.email && <ErrorText className="mt-1 text-xs">{fieldErrors.email}</ErrorText>}
                        </div>

                        <div>
                            <FormLabel className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                <Phone size={12} className="text-sky-500" />
                                Phone <span className="text-sky-600">*</span>
                            </FormLabel>
                            <TextInput
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+91 00000 00000"
                                className="h-12 rounded-xl border-slate-200 bg-white focus:border-sky-500"
                            />
                            {fieldErrors.phone && <ErrorText className="mt-1 text-xs">{fieldErrors.phone}</ErrorText>}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                            <Building2 size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-extrabold uppercase tracking-[0.22em] text-slate-900">Company context</h3>
                            <p className="text-xs text-slate-500">Link the lead to the right organization and contact.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-6 md:grid-cols-2 md:p-8">
                        <div className="md:col-span-2">
                            <FormLabel className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                <Briefcase size={12} className="text-indigo-500" />
                                Company name <span className="text-sky-600">*</span>
                            </FormLabel>
                            <TextInput
                                type="text"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                placeholder="Corporate Entity Name"
                                className="h-12 rounded-xl border-slate-200 bg-white focus:border-indigo-500"
                            />
                            {fieldErrors.company && <ErrorText className="mt-1 text-xs">{fieldErrors.company}</ErrorText>}
                        </div>

                        <div>
                            <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Existing company</FormLabel>
                            <SelectInput
                                name="companyId"
                                value={formData.companyId}
                                onChange={handleChange}
                                className="h-12 rounded-xl border-slate-200 bg-white font-medium text-slate-700 focus:border-indigo-500"
                            >
                                <option value="">Select company</option>
                                <option value="__add_new__" className="text-indigo-600 font-semibold">+ Add new company</option>
                                {companies.map((company) => (
                                    <option key={company._id} value={company._id}>{company.name}</option>
                                ))}
                            </SelectInput>
                            <HelperText className="mt-1 text-xs text-slate-500">Link the lead to an existing company record.</HelperText>
                        </div>

                        <div>
                            <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Primary contact</FormLabel>
                            <SelectInput
                                name="contactId"
                                value={formData.contactId}
                                onChange={handleChange}
                                disabled={!formData.companyId}
                                className="h-12 rounded-xl border-slate-200 bg-white font-medium text-slate-700 focus:border-indigo-500 disabled:opacity-50"
                            >
                                <option value="">Select Contact</option>
                                {formData.companyId && <option value="__add_new__" className="text-indigo-600 font-semibold">+ Add new contact</option>}
                                {contacts.map((contact) => (
                                    <option key={contact._id} value={contact._id}>{contact.firstName} {contact.lastName}</option>
                                ))}
                            </SelectInput>
                            <HelperText className="mt-1 text-xs text-slate-500">Optional, but useful for communication history and outreach.</HelperText>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-cyan-600">
                            <MousePointer2 size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-extrabold uppercase tracking-[0.22em] text-slate-900">Pipeline settings</h3>
                            <p className="text-xs text-slate-500">Define source, stage, owner, and the next follow-up.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-6 md:grid-cols-2 lg:grid-cols-3 md:p-8">
                        <div>
                            <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lead source <span className="text-sky-600">*</span></FormLabel>
                            <SelectInput
                                name="source"
                                value={formData.source}
                                onChange={handleChange}
                                className="h-12 rounded-xl border-slate-200 bg-white font-medium focus:border-cyan-500"
                            >
                                <option value="Website">Website</option>
                                <option value="Referral">Referral</option>
                                <option value="Cold Call">Cold Call</option>
                                <option value="LinkedIn">LinkedIn</option>
                                <option value="Email Campaign">Email Campaign</option>
                                <option value="Trade Show">Trade Show</option>
                                <option value="Partner">Partner</option>
                                <option value="JustDial">JustDial</option>
                                <option value="Other">Other</option>
                            </SelectInput>
                        </div>

                        <div>
                            <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lead status <span className="text-sky-600">*</span></FormLabel>
                            <SelectInput
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="h-12 rounded-xl border-slate-200 bg-white font-medium focus:border-cyan-500"
                            >
                                {LEAD_STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </SelectInput>
                        </div>

                        <div>
                            <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated deal value</FormLabel>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <TextInput
                                    type="number"
                                    name="dealValue"
                                    value={formData.dealValue}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className="h-12 rounded-xl border-slate-200 bg-white pl-10 focus:border-cyan-500"
                                />
                            </div>
                        </div>

                        <div>
                            <FormLabel className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                <ShieldCheck size={12} className="text-cyan-500" />
                                Lead owner <span className="text-sky-600">*</span>
                            </FormLabel>
                            <SelectInput
                                name="ownerId"
                                value={formData.ownerId}
                                onChange={handleChange}
                                className="h-12 rounded-xl border-slate-200 bg-white font-medium focus:border-cyan-500"
                            >
                                <option value="">Select owner</option>
                                {ownerOptions.map((owner) => (
                                    <option key={owner._id} value={owner._id}>{owner.firstName} {owner.lastName}</option>
                                ))}
                            </SelectInput>
                            {fieldErrors.ownerId && <ErrorText className="mt-1 text-xs">{fieldErrors.ownerId}</ErrorText>}
                        </div>

                        <div>
                            <FormLabel className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                <Calendar size={12} className="text-cyan-500" />
                                Next follow-up <span className="text-sky-600">*</span>
                            </FormLabel>
                            <TextInput
                                type="datetime-local"
                                name="nextFollowUpAt"
                                value={formData.nextFollowUpAt}
                                onChange={handleChange}
                                className="h-12 rounded-xl border-slate-200 bg-white font-medium text-slate-900 focus:border-cyan-500"
                            />
                            {fieldErrors.nextFollowUpAt && <ErrorText className="mt-1 text-xs">{fieldErrors.nextFollowUpAt}</ErrorText>}
                        </div>

                        <div>
                            <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Follow-up type</FormLabel>
                            <SelectInput
                                name="followUpType"
                                value={formData.followUpType}
                                onChange={handleChange}
                                className="h-12 rounded-xl border-slate-200 bg-white font-medium focus:border-cyan-500"
                            >
                                <option value="">Select type</option>
                                <option value="CALL">Call</option>
                                <option value="WHATSAPP">WhatsApp</option>
                                <option value="EMAIL">Email</option>
                                <option value="MEETING">Meeting</option>
                            </SelectInput>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-600">
                            <Info size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-extrabold uppercase tracking-[0.22em] text-slate-900">Notes and summary</h3>
                            <p className="text-xs text-slate-500">Capture context that helps the next conversation.</p>
                        </div>
                    </div>

                    <div className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-6 md:p-8">
                        {formData.status === 'Lost' && (
                            <div className="tt-animate-fade-up">
                                <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600">Lost reason <span className="text-rose-600">*</span></FormLabel>
                                <TextareaInput
                                    name="lostReason"
                                    value={formData.lostReason}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Capture why this lead was marked lost."
                                    className="rounded-2xl border-rose-200 bg-white p-4 font-medium focus:border-rose-500"
                                />
                                {fieldErrors.lostReason && <ErrorText className="mt-1 text-xs">{fieldErrors.lostReason}</ErrorText>}
                            </div>
                        )}

                        <div>
                            <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Requirement summary</FormLabel>
                            <TextareaInput
                                name="requirementSummary"
                                value={formData.requirementSummary}
                                onChange={handleChange}
                                rows={6}
                                placeholder="Summarize the lead requirements, scope, or conversation highlights."
                                className="rounded-2xl border-slate-200 bg-white p-5 font-medium leading-relaxed shadow-sm focus:border-sky-500"
                            />
                            <HelperText className="mt-2 text-xs text-slate-500">Use this for qualification notes, objections, and handoff context.</HelperText>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 z-10 -mx-8 -mb-8 flex items-center justify-between gap-6 border-t border-slate-200 bg-white/90 p-6 backdrop-blur md:-mx-10 md:-mb-10 md:p-8">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="rounded-2xl px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                        Cancel
                    </button>
                    <div className="flex items-center gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative rounded-2xl bg-slate-900 px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-900/10 transition hover:bg-sky-600 active:scale-95 disabled:opacity-50"
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                {loading ? 'Saving...' : initialData ? 'Update lead' : 'Create lead'}
                                {!loading && <ShieldCheck size={18} className="text-sky-300 transition-colors group-hover:text-white" />}
                            </span>
                        </button>
                    </div>
                </div>
            </form>

            {showCompanyModal && <QuickAddCompanyModal onClose={() => setShowCompanyModal(false)} onSuccess={handleCompanyCreated} />}
            {showContactModal && <QuickAddContactModal onClose={() => setShowContactModal(false)} onSuccess={handleContactCreated} preSelectedCompanyId={formData.companyId} />}
        </>
    );
};

export default LeadForm;

