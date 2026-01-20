import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch } from '../../store';
import { createLead } from '../../store/slices/leadSlice';
import LeadForm, { type LeadFormPayload } from '../../components/leads/LeadForm';
import MainLayout from '../../components/layout/MainLayout';
import { useState } from 'react';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import SurfaceCard from '../../components/ui/SurfaceCard';

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
            // Ideally show a toast notification here
        } finally {
            // no-op
        }
    };

    return (
        <MainLayout>
            <PageLayout>
                <PageHeader
                    title="Add New Lead"
                    subtitle="Enter the details of the new potential customer"
                />
                <SurfaceCard className="mt-6 p-6">
                    <LeadForm onSubmit={handleSubmit} error={formError} />
                </SurfaceCard>
            </PageLayout>
        </MainLayout>
    );
};
