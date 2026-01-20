import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchCompany, clearCurrentCompany } from '../../store/slices/companySlice';
import MainLayout from '../../components/layout/MainLayout';
import { ArrowLeft, Building2, Edit } from 'lucide-react';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import SurfaceCard from '../../components/ui/SurfaceCard';
import EmptyState from '../../components/ui/EmptyState';

const CompanyDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { currentCompany, loading } = useAppSelector((state) => state.companies);

    useEffect(() => {
        if (id) {
            dispatch(fetchCompany(id));
        }
        return () => {
            dispatch(clearCurrentCompany());
        };
    }, [dispatch, id]);

    if (loading) {
        return (
            <MainLayout>
                <PageLayout>
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
                    </div>
                </PageLayout>
            </MainLayout>
        );
    }

    if (!currentCompany) {
        return (
            <MainLayout>
                <PageLayout>
                    <button
                        onClick={() => navigate('/companies')}
                        className="flex items-center text-secondary-400 hover:text-secondary-200 mb-4"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back to Companies
                    </button>
                    <SurfaceCard className="p-6">
                        <EmptyState title="Company not found." />
                    </SurfaceCard>
                </PageLayout>
            </MainLayout>
        );
    }

    const address = currentCompany.address || {};

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
                    title={currentCompany.name}
                    subtitle={(
                        <span className="text-secondary-300">
                            {currentCompany.industry || 'No industry set'}
                        </span>
                    )}
                    actions={(
                        <button
                            onClick={() => navigate(`/companies/${currentCompany._id}/edit`)}
                            className="btn btn-primary"
                        >
                            <Edit size={18} />
                            Edit Company
                        </button>
                    )}
                />

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={`status-pill ${currentCompany.status === 'Active' ? 'status-success' : 'status-neutral'}`}>
                        {currentCompany.status}
                    </span>
                    {currentCompany.website && (
                        <a
                            href={currentCompany.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary-400 hover:text-primary-300"
                        >
                            {currentCompany.website}
                        </a>
                    )}
                </div>

                <SurfaceCard className="p-6 mt-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-brand-500/10 rounded-lg">
                            <Building2 className="text-brand-400" size={24} />
                        </div>
                        <div>
                            <p className="text-secondary-400 text-sm">Industry</p>
                            <p className="text-secondary-100">{currentCompany.industry || 'No industry set'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h2 className="text-sm font-semibold text-secondary-400 uppercase tracking-wider">Contact</h2>
                            <div className="mt-2 text-secondary-100 space-y-1">
                                {currentCompany.email ? (
                                    <a className="text-primary-400 hover:text-primary-300" href={`mailto:${currentCompany.email}`}>
                                        {currentCompany.email}
                                    </a>
                                ) : (
                                    <p>No email</p>
                                )}
                                {currentCompany.phone ? (
                                    <a className="text-secondary-100 hover:text-primary-400" href={`tel:${currentCompany.phone}`}>
                                        {currentCompany.phone}
                                    </a>
                                ) : (
                                    <p>No phone</p>
                                )}
                                {currentCompany.website ? (
                                    <a className="text-primary-400 hover:text-primary-300" href={currentCompany.website} target="_blank" rel="noreferrer">
                                        {currentCompany.website}
                                    </a>
                                ) : (
                                    <p>No website</p>
                                )}
                            </div>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-secondary-400 uppercase tracking-wider">Status</h2>
                            <div className="mt-2">
                                <span className={`status-pill ${currentCompany.status === 'Active' ? 'status-success' : 'status-neutral'}`}>
                                    {currentCompany.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold text-secondary-400 uppercase tracking-wider">Address</h2>
                        <div className="mt-2 text-secondary-100 space-y-1">
                            <p>{address.street || 'No street address'}</p>
                            <p>
                                {[address.city, address.state].filter(Boolean).join(', ') || 'No city/state'}
                            </p>
                            <p>
                                {[address.country, address.pinCode].filter(Boolean).join(' ') || 'No country/pin'}
                            </p>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold text-secondary-400 uppercase tracking-wider">Business Details</h2>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-secondary-100">
                            <div>
                                <p className="text-xs text-secondary-500">Company Size</p>
                                <p>{currentCompany.companySize || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-500">GST</p>
                                <p>{currentCompany.gst || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-500">PAN</p>
                                <p>{currentCompany.pan || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-500">Registration Number</p>
                                <p>{currentCompany.registrationNumber || '-'}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold text-secondary-400 uppercase tracking-wider">Tags</h2>
                        <div className="mt-2 text-secondary-100">
                            {currentCompany.tags?.length
                                ? currentCompany.tags.join(', ')
                                : 'No tags'}
                        </div>
                    </div>
                </SurfaceCard>
            </PageLayout>
        </MainLayout>
    );
};

export default CompanyDetailsPage;
