import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import { fetchLead, updateLead, clearCurrentLead } from '../../store/slices/leadSlice';
import LeadForm, { type LeadFormPayload } from '../../components/leads/LeadForm';
import MainLayout from '../../components/layout/MainLayout';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import SurfaceCard from '../../components/ui/SurfaceCard';

export const EditLeadPage = () => {
    const { id } = useParams<{ id: string }>();
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { lead, loading, error } = useSelector((state: RootState) => state.leads);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            dispatch(fetchLead(id));
        }
        return () => {
            dispatch(clearCurrentLead());
        };
    }, [dispatch, id]);

    const handleSubmit = async (data: LeadFormPayload) => {
        if (!id) return;
        try {
            setFormError(null);
            await dispatch(updateLead({ id, data })).unwrap();
            navigate('/leads');
        } catch (error) {
            console.error('Failed to update lead:', error);
            setFormError(typeof error === 'string' ? error : 'Failed to update lead.');
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="text-secondary-500">Loading lead details...</div>
                </div>
            </MainLayout>
        );
    }

    if (error) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="text-red-500">Error: {error}</div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <PageLayout>
                <PageHeader title="Edit Lead" subtitle="Update lead information" />
                <SurfaceCard className="mt-6 p-6">
                    {lead && (
                        <LeadForm
                            initialData={lead}
                            onSubmit={handleSubmit}
                            error={formError}
                        />
                    )}
                </SurfaceCard>
            </PageLayout>
        </MainLayout>
    );
};
