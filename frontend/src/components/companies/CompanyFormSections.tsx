import { Building2, Sparkles } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import Button from '../ui/Button';
import { ErrorText, FormLabel, HelperText, SelectInput, TextInput } from '../ui/Form';
import WorkspaceSection from '../ui/WorkspaceSection';
import type { CompanyFormData } from './CompanyForm';

export const CompanyFormHero = ({ isEditMode }: { isEditMode: boolean }) => (
    <div className="workspace-hero relative overflow-hidden p-7">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,188,0,0.16),transparent_66%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
                <div className="mb-3 flex items-center gap-3">
                    <span className="rounded-full bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700 shadow-sm">
                        {isEditMode ? 'Edit company' : 'New company'}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Account record management
                    </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
                    {isEditMode ? 'Keep account data current and clean.' : 'Create a company record your team can trust.'}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-[15px]">
                    {isEditMode
                        ? 'Update ownership context, contact channels, and business profile data without disrupting the current CRM workflow.'
                        : 'Capture the core company profile, contact details, and business identifiers before linking leads and contacts.'}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--mod-border)] bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold text-slate-600">
                        Company profile
                    </span>
                    <span className="rounded-full border border-[var(--mod-border)] bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold text-slate-600">
                        Contact channels
                    </span>
                    <span className="rounded-full border border-[var(--mod-border)] bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold text-slate-600">
                        Compliance data
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-3 rounded-[1.5rem] border border-[var(--mod-border)] bg-[#fffaf4] px-5 py-4 shadow-[0_10px_30px_rgba(120,74,24,0.08)]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <Building2 size={28} />
                </div>
                <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                        <Sparkles size={12} />
                        CRM account
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{isEditMode ? 'Company update workspace' : 'Company creation workspace'}</p>
                </div>
            </div>
        </div>
    </div>
);

export const CompanyProfileSection = ({
    register,
    errors,
}: {
    register: UseFormRegister<CompanyFormData>;
    errors: FieldErrors<CompanyFormData>;
}) => (
    <WorkspaceSection
        title="Basic information"
        description="Define the account identity, market context, and lifecycle status your team will use across the CRM."
        eyebrow="Account profile"
        aside={<><Building2 size={16} className="text-brand-500" /> Company record</>}
    >
        <div className="workspace-form-grid workspace-form-grid--compact">
            <div className="md:col-span-2">
                <FormLabel>
                    Company Name <span className="text-red-500">*</span>
                </FormLabel>
                <TextInput {...register('name')} placeholder="Enter company name" />
                {errors.name && <ErrorText>{errors.name.message}</ErrorText>}
            </div>

            <div>
                <FormLabel>Website</FormLabel>
                <TextInput {...register('website')} type="url" placeholder="https://example.com" />
                {errors.website && <ErrorText>{errors.website.message}</ErrorText>}
            </div>

            <div>
                <FormLabel>Industry</FormLabel>
                <SelectInput {...register('industry')}>
                    <option value="">Select Industry</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Retail">Retail</option>
                    <option value="Other">Other</option>
                </SelectInput>
            </div>

            <div>
                <FormLabel>Company Size</FormLabel>
                <SelectInput {...register('companySize')}>
                    <option value="">Select Size</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201-500">201-500</option>
                    <option value="500+">500+</option>
                </SelectInput>
            </div>

            <div>
                <FormLabel>Status</FormLabel>
                <SelectInput {...register('status')}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </SelectInput>
            </div>
        </div>
    </WorkspaceSection>
);

export const CompanyContactSection = ({
    register,
    errors,
}: {
    register: UseFormRegister<CompanyFormData>;
    errors: FieldErrors<CompanyFormData>;
}) => (
    <WorkspaceSection
        title="Contact information"
        description="Keep the primary contact channels and mailing address clean so downstream workflows stay accurate."
        eyebrow="Reachability"
    >
        <div className="workspace-form-grid workspace-form-grid--compact">
            <div>
                <FormLabel>Email</FormLabel>
                <TextInput {...register('email')} type="email" placeholder="contact@company.com" />
                {errors.email && <ErrorText>{errors.email.message}</ErrorText>}
            </div>

            <div>
                <FormLabel>Phone</FormLabel>
                <TextInput {...register('phone')} placeholder="+91 1234567890" />
            </div>

            <div className="md:col-span-2">
                <FormLabel>Street Address</FormLabel>
                <TextInput {...register('address.street')} placeholder="Street address" />
            </div>

            <div>
                <FormLabel>City</FormLabel>
                <TextInput {...register('address.city')} placeholder="City" />
            </div>

            <div>
                <FormLabel>State</FormLabel>
                <TextInput {...register('address.state')} placeholder="State" />
            </div>

            <div>
                <FormLabel>Country</FormLabel>
                <TextInput {...register('address.country')} placeholder="Country" />
                {errors.address?.country && <ErrorText>{errors.address.country.message}</ErrorText>}
            </div>

            <div>
                <FormLabel>PIN Code</FormLabel>
                <TextInput {...register('address.pinCode')} placeholder="PIN Code" />
            </div>
        </div>
    </WorkspaceSection>
);

export const CompanyIdentifiersSection = ({
    register,
}: {
    register: UseFormRegister<CompanyFormData>;
}) => (
    <WorkspaceSection
        title="Business identifiers"
        description="Capture tax and registration identifiers for proposals, invoicing, and downstream operations."
        eyebrow="Compliance data"
    >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
                <FormLabel>GST Number</FormLabel>
                <TextInput {...register('gst')} placeholder="GST Number" />
            </div>

            <div>
                <FormLabel>PAN Number</FormLabel>
                <TextInput {...register('pan')} placeholder="PAN Number" />
            </div>

            <div>
                <FormLabel>Registration Number</FormLabel>
                <TextInput {...register('registrationNumber')} placeholder="Registration Number" />
            </div>
        </div>
    </WorkspaceSection>
);

export const CompanyTagsSection = ({
    register,
}: {
    register: UseFormRegister<CompanyFormData>;
}) => (
    <WorkspaceSection
        title="Classification tags"
        description="Use lightweight tags to organize segments, ownership groups, or strategic account clusters."
        eyebrow="Segmentation"
    >
        <FormLabel>Tags</FormLabel>
        <TextInput {...register('tags')} placeholder="Enter tags separated by commas" />
        <HelperText>Separate tags with commas</HelperText>
    </WorkspaceSection>
);

export const CompanyFormFooter = ({
    loading,
    isEditMode,
    onCancel,
}: {
    loading: boolean;
    isEditMode: boolean;
    onCancel: () => void;
}) => (
    <div className="workspace-section px-6 py-6 lg:px-8">
        <div className="form-actions">
            <Button type="button" onClick={onCancel} variant="outline">
                Cancel
            </Button>
            <Button type="submit" disabled={loading} variant="primary">
                {loading ? 'Saving...' : isEditMode ? 'Update Company' : 'Create Company'}
            </Button>
        </div>
    </div>
);
