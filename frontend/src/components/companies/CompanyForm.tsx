import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createCompany, updateCompany, fetchCompany, clearCurrentCompany } from '../../store/slices/companySlice';
import MainLayout from '../../components/layout/MainLayout';
import { ArrowLeft, Building2 } from 'lucide-react';
import PageLayout from '../ui/PageLayout';
import PageHeader from '../ui/PageHeader';
import SurfaceCard from '../ui/SurfaceCard';
import Button from '../ui/Button';
import { FormLabel, TextInput, SelectInput, ErrorText, HelperText } from '../ui/Form';

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
        <MainLayout>
            <PageLayout>
                <div className="mb-4">
                    <button
                        onClick={() => navigate('/companies')}
                        className="flex items-center text-secondary-400 hover:text-secondary-200"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back to Companies
                    </button>
                </div>

                <PageHeader
                    title={isEditMode ? 'Edit Company' : 'Add New Company'}
                    subtitle={isEditMode ? 'Update company information' : 'Create a new company record'}
                    actions={(
                        <div className="p-3 bg-brand-500/10 rounded-lg hidden lg:flex">
                            <Building2 className="text-brand-400" size={24} />
                        </div>
                    )}
                />

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
                    <SurfaceCard className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-secondary-50">Basic Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </SurfaceCard>

                    <SurfaceCard className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-secondary-50">Contact Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </SurfaceCard>

                    <SurfaceCard className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-secondary-50">Business Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    </SurfaceCard>

                    <SurfaceCard className="p-6 space-y-2">
                        <FormLabel>Tags</FormLabel>
                        <TextInput
                            {...register('tags')}
                            placeholder="Enter tags separated by commas"
                        />
                        <HelperText>Separate tags with commas</HelperText>
                    </SurfaceCard>

                    <SurfaceCard className="p-6">
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
                    </SurfaceCard>
                </form>
            </PageLayout>
        </MainLayout>
    );
};

export default CompanyForm;
