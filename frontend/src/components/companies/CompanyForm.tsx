import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createCompany, updateCompany, fetchCompany, clearCurrentCompany } from '../../store/slices/companySlice';
import { ArrowLeft } from 'lucide-react';
import PageLayout from '../ui/PageLayout';
import {
    CompanyContactSection,
    CompanyFormFooter,
    CompanyFormHero,
    CompanyIdentifiersSection,
    CompanyProfileSection,
    CompanyTagsSection
} from './CompanyFormSections';

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

export type CompanyFormData = z.infer<typeof companySchema>;

const CompanyForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { currentItem: currentCompany, loading } = useAppSelector((state) => state.companies);
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

                <CompanyFormHero isEditMode={isEditMode} />

                <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-5">
                    <CompanyProfileSection register={register} errors={errors} />
                    <CompanyContactSection register={register} errors={errors} />
                    <CompanyIdentifiersSection register={register} />
                    <CompanyTagsSection register={register} />
                    <CompanyFormFooter
                        loading={loading}
                        isEditMode={isEditMode}
                        onCancel={() => navigate('/companies')}
                    />
                </form>
            </PageLayout>
        </>
    );
};

export default CompanyForm;
