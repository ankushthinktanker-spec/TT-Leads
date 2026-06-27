import { User, Mail, Phone, Building2, MousePointer2, Briefcase, Calendar, Info, ShieldCheck } from 'lucide-react';
import { FormLabel, TextInput, TextareaInput, HelperText, ErrorText } from '../ui/Form';
import ModuleFilterDropdown from '../module-system/ModuleFilterDropdown';
import type { LeadFormData } from './LeadForm';

interface SelectOption {
    value: string;
    label: string;
}

interface LeadDetailSectionProps {
    formData: LeadFormData;
    fieldErrors: Record<string, string>;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export const LeadDetailSection = ({ formData, fieldErrors, onChange }: LeadDetailSectionProps) => (
    <div className="space-y-6">
        <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 text-brand-600">
                <User size={16} />
            </div>
            <div>
                <h3 className="text-sm font-extrabold uppercase tracking-[0.22em] text-slate-900">Lead details</h3>
                <p className="text-xs text-slate-500">Core contact information for the lead record.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-6 md:grid-cols-2 md:p-8">
            <div>
                <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">First Name <span className="text-brand-600">*</span></FormLabel>
                <TextInput
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={onChange}
                    placeholder="Enter first name"
                    className="h-12 rounded-xl border-slate-200 bg-[#fffdf9] focus:border-brand-500"
                />
                {fieldErrors.firstName && <ErrorText className="mt-1 text-xs">{fieldErrors.firstName}</ErrorText>}
            </div>

            <div>
                <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Last Name <span className="text-brand-600">*</span></FormLabel>
                <TextInput
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={onChange}
                    placeholder="Enter last name"
                    className="h-12 rounded-xl border-slate-200 bg-[#fffdf9] focus:border-brand-500"
                />
                {fieldErrors.lastName && <ErrorText className="mt-1 text-xs">{fieldErrors.lastName}</ErrorText>}
            </div>

            <div>
                <FormLabel className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <Mail size={12} className="text-brand-500" />
                    Email <span className="text-brand-600">*</span>
                </FormLabel>
                <TextInput
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={onChange}
                    placeholder="john@nexus.com"
                    className="h-12 rounded-xl border-slate-200 bg-[#fffdf9] focus:border-brand-500"
                />
                {fieldErrors.email && <ErrorText className="mt-1 text-xs">{fieldErrors.email}</ErrorText>}
            </div>

            <div>
                <FormLabel className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <Phone size={12} className="text-brand-500" />
                    Phone <span className="text-brand-600">*</span>
                </FormLabel>
                <TextInput
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={onChange}
                    placeholder="+91 00000 00000"
                    className="h-12 rounded-xl border-slate-200 bg-[#fffdf9] focus:border-brand-500"
                />
                {fieldErrors.phone && <ErrorText className="mt-1 text-xs">{fieldErrors.phone}</ErrorText>}
            </div>
        </div>
    </div>
);

interface CompanyContextSectionProps {
    formData: LeadFormData;
    selectedCompany?: { _id: string; name: string };
    selectedContact?: { _id: string; firstName: string; lastName: string };
    fieldErrors: Record<string, string>;
    companyDropdownOptions: SelectOption[];
    contactDropdownOptions: SelectOption[];
    selectTriggerClassName: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    onSelectChange: (name: keyof LeadFormData, value: string) => void;
    onClearLinks: () => void;
}

export const CompanyContextSection = ({
    formData,
    selectedCompany,
    selectedContact,
    fieldErrors,
    companyDropdownOptions,
    contactDropdownOptions,
    selectTriggerClassName,
    onChange,
    onSelectChange,
    onClearLinks,
}: CompanyContextSectionProps) => (
    <div className="space-y-6">
        <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 text-brand-600">
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
                    <Briefcase size={12} className="text-brand-500" />
                    Company name <span className="text-brand-600">*</span>
                </FormLabel>
                <TextInput
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={onChange}
                    placeholder="Corporate Entity Name"
                    className="h-12 rounded-xl border-slate-200 bg-[#fffdf9] focus:border-brand-500"
                />
                <HelperText className="mt-1 text-xs text-slate-500">
                    Enter a standalone company name, or use the existing company selector below to create a linked CRM relationship.
                </HelperText>
                {fieldErrors.company && <ErrorText className="mt-1 text-xs">{fieldErrors.company}</ErrorText>}
            </div>

            <div>
                <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Existing company</FormLabel>
                <ModuleFilterDropdown
                    ariaLabel="Select existing company"
                    fullWidth
                    value={formData.companyId}
                    options={companyDropdownOptions}
                    onChange={(value) => onSelectChange('companyId', value)}
                    triggerClassName={`${selectTriggerClassName} focus:border-brand-500`}
                />
                <HelperText className="mt-1 text-xs text-slate-500">Choose an existing company to keep account history, contacts, and future updates connected.</HelperText>
            </div>

            <div>
                <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Primary contact</FormLabel>
                <ModuleFilterDropdown
                    ariaLabel="Select primary contact"
                    fullWidth
                    value={formData.contactId}
                    options={contactDropdownOptions}
                    onChange={(value) => onSelectChange('contactId', value)}
                    disabled={!formData.companyId}
                    triggerClassName={`${selectTriggerClassName} focus:border-brand-500`}
                />
                <HelperText className="mt-1 text-xs text-slate-500">
                    {formData.companyId
                        ? 'Optional, but useful for communication history and outreach.'
                        : 'Select a company first to link one of its contacts or create a new contact.'}
                </HelperText>
            </div>

            {(formData.companyId || formData.contactId) && (
                <div className="md:col-span-2 rounded-2xl border border-brand-200 bg-brand-50/70 px-4 py-4 text-sm text-slate-700">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                            {formData.companyId && selectedCompany && (
                                <p>
                                    <span className="font-semibold text-slate-900">Linked company:</span> {selectedCompany.name}
                                </p>
                            )}
                            {formData.contactId && selectedContact && (
                                <p>
                                    <span className="font-semibold text-slate-900">Linked contact:</span> {`${selectedContact.firstName} ${selectedContact.lastName}`.trim()}
                                </p>
                            )}
                            <p className="text-xs text-slate-500">
                                Editing the company name field switches this lead back to manual company text and removes linked company/contact records.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClearLinks}
                            className="rounded-xl border border-brand-200 bg-[#fffdf9] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
                        >
                            Clear links
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
);

interface PipelineSettingsSectionProps {
    formData: LeadFormData;
    fieldErrors: Record<string, string>;
    sourceOptions: SelectOption[];
    statusOptions: SelectOption[];
    ownerDropdownOptions: SelectOption[];
    followUpTypeOptions: SelectOption[];
    selectTriggerClassName: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    onSelectChange: (name: keyof LeadFormData, value: string) => void;
}

export const PipelineSettingsSection = ({
    formData,
    fieldErrors,
    sourceOptions,
    statusOptions,
    ownerDropdownOptions,
    followUpTypeOptions,
    selectTriggerClassName,
    onChange,
    onSelectChange,
}: PipelineSettingsSectionProps) => (
    <div className="space-y-6">
        <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 text-brand-600">
                <MousePointer2 size={16} />
            </div>
            <div>
                <h3 className="text-sm font-extrabold uppercase tracking-[0.22em] text-slate-900">Pipeline settings</h3>
                <p className="text-xs text-slate-500">Define source, stage, owner, and the next follow-up.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-6 md:grid-cols-2 md:p-8 lg:grid-cols-3">
            <div>
                <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lead source <span className="text-brand-600">*</span></FormLabel>
                <ModuleFilterDropdown
                    ariaLabel="Select lead source"
                    fullWidth
                    value={formData.source}
                    options={sourceOptions}
                    onChange={(value) => onSelectChange('source', value)}
                    triggerClassName={`${selectTriggerClassName} focus:border-brand-500`}
                />
            </div>

            <div>
                <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lead status <span className="text-brand-600">*</span></FormLabel>
                <ModuleFilterDropdown
                    ariaLabel="Select lead status"
                    fullWidth
                    value={formData.status}
                    options={statusOptions}
                    onChange={(value) => onSelectChange('status', value)}
                    triggerClassName={`${selectTriggerClassName} focus:border-brand-500`}
                />
            </div>

            <div>
                <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated deal value</FormLabel>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <TextInput
                        type="number"
                        name="dealValue"
                        value={formData.dealValue}
                        onChange={onChange}
                        placeholder="0.00"
                        className="h-12 rounded-xl border-slate-200 bg-white pl-10 focus:border-brand-500"
                    />
                </div>
            </div>

            <div>
                <FormLabel className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <ShieldCheck size={12} className="text-brand-500" />
                    Lead owner <span className="text-brand-600">*</span>
                </FormLabel>
                <ModuleFilterDropdown
                    ariaLabel="Select lead owner"
                    fullWidth
                    value={formData.ownerId}
                    options={ownerDropdownOptions}
                    onChange={(value) => onSelectChange('ownerId', value)}
                    triggerClassName={`${selectTriggerClassName} focus:border-brand-500`}
                />
                {fieldErrors.ownerId && <ErrorText className="mt-1 text-xs">{fieldErrors.ownerId}</ErrorText>}
            </div>

            <div>
                <FormLabel className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <Calendar size={12} className="text-brand-500" />
                    Next follow-up <span className="text-brand-600">*</span>
                </FormLabel>
                <TextInput
                    type="datetime-local"
                    name="nextFollowUpAt"
                    value={formData.nextFollowUpAt}
                    onChange={onChange}
                    className="h-12 rounded-xl border-slate-200 bg-white font-medium text-slate-900 focus:border-brand-500"
                />
                {fieldErrors.nextFollowUpAt && <ErrorText className="mt-1 text-xs">{fieldErrors.nextFollowUpAt}</ErrorText>}
            </div>

            <div>
                <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Follow-up type</FormLabel>
                <ModuleFilterDropdown
                    ariaLabel="Select follow-up type"
                    fullWidth
                    value={formData.followUpType}
                    options={followUpTypeOptions}
                    onChange={(value) => onSelectChange('followUpType', value)}
                    triggerClassName={`${selectTriggerClassName} focus:border-brand-500`}
                />
            </div>
        </div>
    </div>
);

interface NotesSummarySectionProps {
    formData: LeadFormData;
    fieldErrors: Record<string, string>;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export const NotesSummarySection = ({ formData, fieldErrors, onChange }: NotesSummarySectionProps) => (
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
                        onChange={onChange}
                        rows={3}
                        placeholder="Capture why this lead was marked lost."
                        className="rounded-2xl border-rose-200 bg-[#fffdf9] p-4 font-medium focus:border-rose-500"
                    />
                    {fieldErrors.lostReason && <ErrorText className="mt-1 text-xs">{fieldErrors.lostReason}</ErrorText>}
                </div>
            )}

            <div>
                <FormLabel className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Requirement summary</FormLabel>
                <TextareaInput
                    name="requirementSummary"
                    value={formData.requirementSummary}
                    onChange={onChange}
                    rows={6}
                    placeholder="Summarize the lead requirements, scope, or conversation highlights."
                    className="rounded-2xl border-slate-200 bg-[#fffdf9] p-5 font-medium leading-relaxed shadow-sm focus:border-brand-500"
                />
                <HelperText className="mt-2 text-xs text-slate-500">Use this for qualification notes, objections, and handoff context.</HelperText>
            </div>
        </div>
    </div>
);

interface LeadFormFooterProps {
    loading: boolean;
    hasInitialData: boolean;
    onCancel?: () => void;
}

export const LeadFormFooter = ({ loading, hasInitialData, onCancel }: LeadFormFooterProps) => (
    <div className="sticky bottom-0 z-10 -mx-8 -mb-8 flex items-center justify-between gap-6 border-t border-[var(--mod-border)] bg-[#fffaf4]/95 p-6 backdrop-blur md:-mx-10 md:-mb-10 md:p-8">
        <button
            type="button"
            onClick={() => onCancel?.()}
            className="rounded-2xl px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:bg-[#fbf2e7] hover:text-slate-900"
        >
            Cancel
        </button>
        <div className="flex items-center gap-4">
            <button
                type="submit"
                disabled={loading}
                className="group relative rounded-2xl bg-slate-900 px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-900/10 transition hover:bg-brand-600 active:scale-95 disabled:opacity-50"
            >
                <span className="relative z-10 flex items-center gap-3">
                    {loading ? 'Saving...' : hasInitialData ? 'Update lead' : 'Create lead'}
                    {!loading && <ShieldCheck size={18} className="text-brand-200 transition-colors group-hover:text-white" />}
                </span>
            </button>
        </div>
    </div>
);

