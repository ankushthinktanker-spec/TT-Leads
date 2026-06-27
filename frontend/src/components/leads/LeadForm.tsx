import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchCompanies } from '../../store/slices/companySlice';
import { fetchContacts } from '../../store/slices/contactSlice';
import { fetchUsers } from '../../store/slices/userSlice';
import QuickAddCompanyModal from '../modals/QuickAddCompanyModal';
import QuickAddContactModal from '../modals/QuickAddContactModal';
import { LEAD_STATUS_OPTIONS } from '../../lib/utils';
import { LeadDetailSection, CompanyContextSection, PipelineSettingsSection, NotesSummarySection, LeadFormFooter } from './LeadFormSections';

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
    onCancel?: () => void;
}

export interface LeadFormData {
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

export type LeadFormPayload = Omit<LeadFormData, 'contactId' | 'companyId' | 'followUpType' | 'nextFollowUpAt'> & {
    contactId?: string;
    companyId?: string;
    followUpType?: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING';
    nextFollowUpAt?: string;
};

const normalizeFollowUpType = (value?: string): LeadFormData['followUpType'] => {
    if (value === 'CALL' || value === 'WHATSAPP' || value === 'EMAIL' || value === 'MEETING') {
        return value;
    }
    return '';
};

const getEntityId = (value?: string | { _id?: string }): string =>
    typeof value === 'string' ? value : value?._id || '';

const getInitialOwnerId = (initialData?: LeadFormInitialData, fallback = ''): string =>
    getEntityId(initialData?.ownerId) || getEntityId(initialData?.assignedTo) || fallback;

const selectTriggerClassName = '!h-12 !rounded-xl !border-slate-200 !bg-[#fffdf9] !px-4 !text-sm !font-medium !normal-case !tracking-normal !text-slate-700 shadow-[0_4px_12px_rgba(120,74,24,0.04)]';

const LeadForm = ({ initialData, onSubmit, error, onCancel }: LeadFormProps) => {
    const dispatch = useAppDispatch();
    const { loading } = useAppSelector((state) => state.leads);
    const { items: companies } = useAppSelector((state) => state.companies);
    const { items: contacts } = useAppSelector((state) => state.contacts);
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
        companyId: getEntityId(initialData?.companyId),
        contactId: getEntityId(initialData?.contactId),
        source: initialData?.source || 'Website',
        status: initialData?.status || 'New',
        dealValue: initialData?.dealValue || '',
        requirementSummary: initialData?.requirementSummary || '',
        lostReason: initialData?.lostReason || '',
        ownerId: getInitialOwnerId(initialData, currentUserId),
        nextFollowUpAt: formatDateTimeLocal(initialData?.nextFollowUpDate || initialData?.nextFollowUpAt),
        followUpType: normalizeFollowUpType(initialData?.followUpType)
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

    const companyDropdownOptions = [
        { value: '', label: 'Select company' },
        { value: '__add_new__', label: '+ Add new company' },
        ...companies.map((company) => ({ value: company._id, label: company.name })),
    ];

    const contactDropdownOptions = [
        { value: '', label: 'Select contact' },
        ...(formData.companyId ? [{ value: '__add_new__', label: '+ Add new contact' }] : []),
        ...contacts.map((contact) => ({
            value: contact._id,
            label: `${contact.firstName} ${contact.lastName}`.trim(),
        })),
    ];

    const selectedCompany = companies.find((company) => company._id === formData.companyId);
    const selectedContact = contacts.find((contact) => contact._id === formData.contactId);

    const sourceOptions = [
        { value: 'Website', label: 'Website' },
        { value: 'Referral', label: 'Referral' },
        { value: 'Cold Call', label: 'Cold Call' },
        { value: 'LinkedIn', label: 'LinkedIn' },
        { value: 'Email Campaign', label: 'Email Campaign' },
        { value: 'Trade Show', label: 'Trade Show' },
        { value: 'Partner', label: 'Partner' },
        { value: 'JustDial', label: 'JustDial' },
        { value: 'Other', label: 'Other' },
    ];

    const statusOptions = LEAD_STATUS_OPTIONS.map((status) => ({ value: status, label: status }));

    const ownerDropdownOptions = [
        { value: '', label: 'Select owner' },
        ...ownerOptions.map((owner) => ({
            value: owner._id,
            label: `${owner.firstName} ${owner.lastName}`.trim(),
        })),
    ];

    const followUpTypeOptions = [
        { value: '', label: 'Select type' },
        { value: 'CALL', label: 'Call' },
        { value: 'WHATSAPP', label: 'WhatsApp' },
        { value: 'EMAIL', label: 'Email' },
        { value: 'MEETING', label: 'Meeting' },
    ];

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

        if (selectedCompany && formData.company !== selectedCompany.name) {
            setFormData((prev) => ({ ...prev, company: selectedCompany.name }));
        }
    }, [formData.companyId, formData.company, selectedCompany]);

    useEffect(() => {
        if (!formData.contactId || contacts.length === 0) {
            return;
        }

        const hasSelectedContact = contacts.some((contact) => contact._id === formData.contactId);
        if (!hasSelectedContact) {
            setFormData((prev) => ({ ...prev, contactId: '' }));
        }
    }, [contacts, formData.contactId]);

    const clearFieldError = (name: string) => {
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleSelectChange = (name: keyof LeadFormData, value: string) => {
        if (name === 'companyId' && value === '__add_new__') {
            setShowCompanyModal(true);
            return;
        }

        if (name === 'contactId' && value === '__add_new__') {
            setShowContactModal(true);
            return;
        }

        if (name === 'companyId') {
            const nextCompany = companies.find((company) => company._id === value);
            setFormData((prev) => ({
                ...prev,
                companyId: value,
                company: value
                    ? nextCompany?.name || prev.company
                    : selectedCompany && prev.company === selectedCompany.name
                        ? ''
                        : prev.company,
                contactId: '',
            }));
            clearFieldError('companyId');
            clearFieldError('contactId');
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
        clearFieldError(name);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            if (name === 'company') {
                const isLinkedCompanyName = selectedCompany && prev.companyId && value !== selectedCompany.name;
                return {
                    ...prev,
                    company: value,
                    ...(isLinkedCompanyName ? { companyId: '', contactId: '' } : {}),
                };
            }

            return { ...prev, [name]: value };
        });
        clearFieldError(name);
        if (name === 'company' && selectedCompany && value !== selectedCompany.name) {
            clearFieldError('companyId');
            clearFieldError('contactId');
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
        const { contactId, companyId, followUpType, nextFollowUpAt, ...rest } = formData;
        const payload: LeadFormPayload = {
            ...rest,
            ...(contactId ? { contactId } : {}),
            ...(companyId ? { companyId } : {}),
            ...(followUpType ? { followUpType } : {}),
            ...(nextFollowUpAt ? { nextFollowUpAt } : {})
        };
        
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

                <LeadDetailSection
                    formData={formData}
                    fieldErrors={fieldErrors}
                    onChange={handleChange}
                />

                <CompanyContextSection
                    formData={formData}
                    selectedCompany={selectedCompany}
                    selectedContact={selectedContact}
                    fieldErrors={fieldErrors}
                    companyDropdownOptions={companyDropdownOptions}
                    contactDropdownOptions={contactDropdownOptions}
                    selectTriggerClassName={selectTriggerClassName}
                    onChange={handleChange}
                    onSelectChange={handleSelectChange}
                    onClearLinks={() => setFormData((prev) => ({ ...prev, companyId: '', contactId: '' }))}
                />

                <PipelineSettingsSection
                    formData={formData}
                    fieldErrors={fieldErrors}
                    sourceOptions={sourceOptions}
                    statusOptions={statusOptions}
                    ownerDropdownOptions={ownerDropdownOptions}
                    followUpTypeOptions={followUpTypeOptions}
                    selectTriggerClassName={selectTriggerClassName}
                    onChange={handleChange}
                    onSelectChange={handleSelectChange}
                />

                <NotesSummarySection
                    formData={formData}
                    fieldErrors={fieldErrors}
                    onChange={handleChange}
                />

                <LeadFormFooter
                    loading={loading}
                    hasInitialData={Boolean(initialData)}
                    onCancel={onCancel}
                />
            </form>

            {showCompanyModal && <QuickAddCompanyModal onClose={() => setShowCompanyModal(false)} onSuccess={handleCompanyCreated} />}
            {showContactModal && <QuickAddContactModal onClose={() => setShowContactModal(false)} onSuccess={handleContactCreated} preSelectedCompanyId={formData.companyId} />}
        </>
    );
};

export default LeadForm;


