import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchCompanies } from '../../store/slices/companySlice';
import { fetchContacts } from '../../store/slices/contactSlice';
import { fetchUsers } from '../../store/slices/userSlice';
import QuickAddCompanyModal from '../modals/QuickAddCompanyModal';
import QuickAddContactModal from '../modals/QuickAddContactModal';
import { LEAD_STATUS_OPTIONS } from '../../lib/utils';
import { FormLabel, TextInput, SelectInput, TextareaInput, HelperText, ErrorText } from '../ui/Form';
import Button from '../ui/Button';

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
    followUpType: string;
}

export type LeadFormPayload = LeadFormData & {
    contactId?: string;
    companyId?: string;
    followUpType?: string;
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
        companyId: initialData?.companyId || '',
        contactId: initialData?.contactId || '',
        source: initialData?.source || 'Website',
        status: initialData?.status || 'New',
        dealValue: initialData?.dealValue || '',
        requirementSummary: initialData?.requirementSummary || '',
        lostReason: initialData?.lostReason || '',
        ownerId: initialData?.ownerId?._id || initialData?.ownerId || initialData?.assignedTo?._id || initialData?.assignedTo || currentUserId || '',
        nextFollowUpAt: formatDateTimeLocal(initialData?.nextFollowUpDate || initialData?.nextFollowUpAt),
        followUpType: initialData?.followUpType || ''
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

        // Check if user selected "+ Add New" options
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
        dispatch(fetchCompanies({ limit: 100 })); // Refresh company list
    };

    const handleContactCreated = (contactId: string) => {
        setFormData(prev => ({ ...prev, contactId }));
        dispatch(fetchContacts({ companyId: formData.companyId, limit: 100 })); // Refresh contact list
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
            setClientError('Please fix the highlighted fields.');
            return;
        }

        setClientError(null);
        setFieldErrors({});
        const payload: LeadFormPayload = { ...formData };
        if (!payload.contactId) {
            delete payload.contactId;
        }
        if (!payload.companyId) {
            delete payload.companyId;
        }
        if (!payload.followUpType) {
            delete payload.followUpType;
        }
        if (!payload.nextFollowUpAt) {
            delete payload.nextFollowUpAt;
        }
        onSubmit(payload);
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">
                {(error || clientError) && (
                    <div className="alert-error">
                        {error || clientError}
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Basic Information */}
                    <div>
                        <FormLabel>
                            First Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <TextInput
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            placeholder="John"
                        />
                        {fieldErrors.firstName && (
                            <ErrorText>{fieldErrors.firstName}</ErrorText>
                        )}
                    </div>

                    <div>
                        <FormLabel>
                            Last Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <TextInput
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                            placeholder="Doe"
                        />
                        {fieldErrors.lastName && (
                            <ErrorText>{fieldErrors.lastName}</ErrorText>
                        )}
                    </div>

                    <div>
                        <FormLabel>
                            Email <span className="text-red-500">*</span>
                        </FormLabel>
                        <TextInput
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="john@example.com"
                        />
                        {fieldErrors.email && (
                            <ErrorText>{fieldErrors.email}</ErrorText>
                        )}
                    </div>

                    <div>
                        <FormLabel>
                            Phone <span className="text-red-500">*</span>
                        </FormLabel>
                        <TextInput
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            placeholder="+91 1234567890"
                        />
                        {fieldErrors.phone && (
                            <ErrorText>{fieldErrors.phone}</ErrorText>
                        )}
                    </div>

                    <div>
                        <FormLabel>
                            Company Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <TextInput
                            type="text"
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            required
                            placeholder="Acme Corp"
                        />
                        {fieldErrors.company && (
                            <ErrorText>{fieldErrors.company}</ErrorText>
                        )}
                    </div>

                    {/* Company Selection from Database */}
                    <div>
                        <FormLabel>
                            Link to Company (Database)
                        </FormLabel>
                        <SelectInput
                            name="companyId"
                            value={formData.companyId}
                            onChange={handleChange}
                        >
                            <option value="">Select Company</option>
                            <option value="__add_new__" className="text-brand-400 font-medium">+ Add New Company</option>
                            {companies.map((company) => (
                                <option key={company._id} value={company._id}>
                                    {company.name}
                                </option>
                            ))}
                        </SelectInput>
                        <HelperText>Select existing or add new company</HelperText>
                    </div>

                    {/* Contact Selection (filtered by company) */}
                    <div>
                        <FormLabel>
                            Primary Contact
                        </FormLabel>
                        <SelectInput
                            name="contactId"
                            value={formData.contactId}
                            onChange={handleChange}
                            disabled={!formData.companyId}
                            className="disabled:opacity-60 disabled:bg-secondary-900/60"
                        >
                            <option value="">Select Contact</option>
                            {formData.companyId && <option value="__add_new__" className="text-brand-400 font-medium">+ Add New Contact</option>}
                            {contacts.map((contact) => (
                                <option key={contact._id} value={contact._id}>
                                    {contact.firstName} {contact.lastName} - {contact.designation || 'N/A'}
                                </option>
                            ))}
                        </SelectInput>
                        <HelperText>Select company first to load contacts</HelperText>
                    </div>

                    <div>
                        <FormLabel>
                            Owner <span className="text-red-500">*</span>
                        </FormLabel>
                        <SelectInput
                            name="ownerId"
                            value={formData.ownerId}
                            onChange={handleChange}
                        >
                            <option value="">Select Owner</option>
                            {ownerOptions.map((owner) => (
                                <option key={owner._id} value={owner._id}>
                                    {owner.firstName} {owner.lastName}
                                </option>
                            ))}
                        </SelectInput>
                        {fieldErrors.ownerId && (
                            <ErrorText>{fieldErrors.ownerId}</ErrorText>
                        )}
                    </div>

                    <div>
                        <FormLabel>
                            Next Follow-up <span className="text-red-500">*</span>
                        </FormLabel>
                        <TextInput
                            type="datetime-local"
                            name="nextFollowUpAt"
                            value={formData.nextFollowUpAt}
                            onChange={handleChange}
                        />
                        {fieldErrors.nextFollowUpAt && (
                            <ErrorText>{fieldErrors.nextFollowUpAt}</ErrorText>
                        )}
                        {initialData && !formData.nextFollowUpAt && (
                            <HelperText>Legacy lead: schedule a follow-up to improve lead health.</HelperText>
                        )}
                    </div>

                    <div>
                        <FormLabel>Follow-up Type</FormLabel>
                        <SelectInput
                            name="followUpType"
                            value={formData.followUpType}
                            onChange={handleChange}
                        >
                            <option value="">Select Type</option>
                            <option value="CALL">Call</option>
                            <option value="WHATSAPP">WhatsApp</option>
                            <option value="EMAIL">Email</option>
                            <option value="MEETING">Meeting</option>
                        </SelectInput>
                    </div>

                    <div>
                        <FormLabel>Source</FormLabel>
                        <SelectInput
                            name="source"
                            value={formData.source}
                            onChange={handleChange}
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
                        {fieldErrors.source && (
                            <ErrorText>{fieldErrors.source}</ErrorText>
                        )}
                    </div>

                    <div>
                        <FormLabel>Status</FormLabel>
                        <SelectInput
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                        >
                            {LEAD_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </SelectInput>
                        {fieldErrors.status && (
                            <ErrorText>{fieldErrors.status}</ErrorText>
                        )}
                    </div>

                    <div>
                        <FormLabel>Deal Value</FormLabel>
                        <TextInput
                            type="number"
                            name="dealValue"
                            value={formData.dealValue}
                            onChange={handleChange}
                            placeholder="50000"
                        />
                    </div>

                    {formData.status === 'Lost' && (
                        <div className="md:col-span-2">
                            <FormLabel>
                                Lost Reason <span className="text-red-500">*</span>
                            </FormLabel>
                            <TextareaInput
                                name="lostReason"
                                value={formData.lostReason}
                                onChange={handleChange}
                                rows={3}
                                placeholder="Why was the lead lost?"
                            />
                            {fieldErrors.lostReason && (
                                <ErrorText>{fieldErrors.lostReason}</ErrorText>
                            )}
                        </div>
                    )}

                    {/* Requirement Summary - Full Width */}
                    <div className="md:col-span-2">
                        <FormLabel>
                            Requirement Summary
                        </FormLabel>
                        <TextareaInput
                            name="requirementSummary"
                            value={formData.requirementSummary}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Describe the client's requirements, pain points, and expectations..."
                        />
                        <HelperText>Detailed description of what the client needs</HelperText>
                    </div>

                </div>

                {/* Form Actions */}
                <div className="form-actions">
                    <Button
                        type="button"
                        onClick={() => window.history.back()}
                        variant="outline"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        variant="primary"
                    >
                        {loading ? 'Saving...' : initialData ? 'Update Lead' : 'Create Lead'}
                    </Button>
                </div>
            </form>

            {/* Quick Add Modals */}
            {
                showCompanyModal && (
                    <QuickAddCompanyModal
                        onClose={() => setShowCompanyModal(false)}
                        onSuccess={handleCompanyCreated}
                    />
                )
            }

            {
                showContactModal && (
                    <QuickAddContactModal
                        onClose={() => setShowContactModal(false)}
                        onSuccess={handleContactCreated}
                        preSelectedCompanyId={formData.companyId}
                    />
                )
            }
        </>
    );
};

export default LeadForm;
