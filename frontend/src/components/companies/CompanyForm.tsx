import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createCompany, updateCompany, fetchCompany, clearCurrentCompany } from '../../store/slices/companySlice';
import { ArrowLeft, Building2, Sparkles } from 'lucide-react';
import PageLayout from '../ui/PageLayout';
import Button from '../ui/Button';
import { FormLabel, TextInput, SelectInput, ErrorText, HelperText } from '../ui/Form';
import WorkspaceSection from '../ui/WorkspaceSection';

const companySchema = z.object({
    name: z.string().min(1, 'Company name is required'),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
    industry: z.string().optional(),
    companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
    address: z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().min(1, 'Country is required'),
        pinCode: z.string().optional()
    }),
    phone: z.string().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    gst: z.string().optional(),
    pan: z.string().optional(),
    registrationNumber: z.string().optional(),
    tags: z.string().optional(),
    status: z.enum(['Active', 'Inactive'])
});

type CompanyFormData = z.infer<typeof companySchema>;

const CompanyForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { currentCompany, loading } = useAppSelector((state) => state.companies);
    const isEditMode = Boolean(id);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<CompanyFormData>({
        resolver: zodResolver(companySchema),
        defaultValues: {
            address: { country: 'India' },
            status: 'Active'
        }
    });

    useEffect(() => {
        if (isEditMode && id) {
            dispatch(fetchCompany(id));
        }
        return () => {
            dispatch(clearCurrentCompany());
        };
    }, [dispatch, id, isEditMode]);

    useEffect(() => {
        if (currentCompany && isEditMode) {
            reset({
                name: currentCompany.name,
                website: currentCompany.website || '',
                industry: currentCompany.industry || '',
                companySize: currentCompany.companySize as CompanyFormData['companySize'],
                address: currentCompany.address,
                phone: currentCompany.phone || '',
                email: currentCompany.email || '',
                gst: currentCompany.gst || '',
                pan: currentCompany.pan || '',
                registrationNumber: currentCompany.registrationNumber || '',
                tags: currentCompany.tags.join(', '),
                status: currentCompany.status
            });
        }
    }, [currentCompany, isEditMode, reset]);

    const onSubmit = async (data: CompanyFormData) => {
        const formattedData = {
            ...data,
            tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : []
        };

        if (isEditMode && id) {
            await dispatch(updateCompany({ id, data: formattedData }));
        } else {
            await dispatch(createCompany(formattedData));
        }
        navigate('/companies');
    };

    return (
        <>
            <PageLayout>
                <div className="mb-4">
                    <button
                        onClick={() => navigate('/companies')}
                        className="flex items-center text-slate-600 hover:text-slate-900"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back to Companies
                    </button>
                </div>

                <div className="workspace-hero relative overflow-hidden p-7">
                    <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_66%)]" />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-3 flex items-center gap-3">
                                <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700 shadow-sm">
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
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                                    Company profile
                                </span>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                                    Contact channels
                                </span>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                                    Compliance data
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/70 bg-white/85 px-5 py-4 shadow-sm">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
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

                <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-5">
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
                                <TextInput
                                    {...register('name')}
                                    placeholder="Enter company name"
                                />
                                {errors.name && <ErrorText>{errors.name.message}</ErrorText>}
                            </div>

                            <div>
                                <FormLabel>Website</FormLabel>
                                <TextInput
                                    {...register('website')}
                                    type="url"
                                    placeholder="https://example.com"
                                />
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

                    <WorkspaceSection
                        title="Contact information"
                        description="Keep the primary contact channels and mailing address clean so downstream workflows stay accurate."
                        eyebrow="Reachability"
                    >
                        <div className="workspace-form-grid workspace-form-grid--compact">
                            <div>
                                <FormLabel>Email</FormLabel>
                                <TextInput
                                    {...register('email')}
                                    type="email"
                                    placeholder="contact@company.com"
                                />
                                {errors.email && <ErrorText>{errors.email.message}</ErrorText>}
                            </div>

                            <div>
                                <FormLabel>Phone</FormLabel>
                                <TextInput
                                    {...register('phone')}
                                    placeholder="+91 1234567890"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <FormLabel>Street Address</FormLabel>
                                <TextInput
                                    {...register('address.street')}
                                    placeholder="Street address"
                                />
                            </div>

                            <div>
                                <FormLabel>City</FormLabel>
                                <TextInput
                                    {...register('address.city')}
                                    placeholder="City"
                                />
                            </div>

                            <div>
                                <FormLabel>State</FormLabel>
                                <TextInput
                                    {...register('address.state')}
                                    placeholder="State"
                                />
                            </div>

                            <div>
                                <FormLabel>Country</FormLabel>
                                <TextInput
                                    {...register('address.country')}
                                    placeholder="Country"
                                />
                            </div>

                            <div>
                                <FormLabel>PIN Code</FormLabel>
                                <TextInput
                                    {...register('address.pinCode')}
                                    placeholder="PIN Code"
                                />
                            </div>
                        </div>
                    </WorkspaceSection>

                    <WorkspaceSection
                        title="Business identifiers"
                        description="Capture tax and registration identifiers for proposals, invoicing, and downstream operations."
                        eyebrow="Compliance data"
                    >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <FormLabel>GST Number</FormLabel>
                                <TextInput
                                    {...register('gst')}
                                    placeholder="GST Number"
                                />
                            </div>

                            <div>
                                <FormLabel>PAN Number</FormLabel>
                                <TextInput
                                    {...register('pan')}
                                    placeholder="PAN Number"
                                />
                            </div>

                            <div>
                                <FormLabel>Registration Number</FormLabel>
                                <TextInput
                                    {...register('registrationNumber')}
                                    placeholder="Registration Number"
                                />
                            </div>
                        </div>
                    </WorkspaceSection>

                    <WorkspaceSection
                        title="Classification tags"
                        description="Use lightweight tags to organize segments, ownership groups, or strategic account clusters."
                        eyebrow="Segmentation"
                    >
                        <FormLabel>Tags</FormLabel>
                        <TextInput
                            {...register('tags')}
                            placeholder="Enter tags separated by commas"
                        />
                        <HelperText>Separate tags with commas</HelperText>
                    </WorkspaceSection>

                    <div className="workspace-section px-6 py-6 lg:px-8">
                        <div className="form-actions">
                            <Button
                                type="button"
                                onClick={() => navigate('/companies')}
                                variant="outline"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                variant="primary"
                            >
                                {loading ? 'Saving...' : isEditMode ? 'Update Company' : 'Create Company'}
                            </Button>
                        </div>
                    </div>
                </form>
            </PageLayout>
        </>
    );
};

export default CompanyForm;
