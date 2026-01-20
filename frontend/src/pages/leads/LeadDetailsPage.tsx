import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import { fetchLead, deleteLead, clearCurrentLead, updateLeadStatus } from '../../store/slices/leadSlice';
import MainLayout from '../../components/layout/MainLayout';
import LeadActivityTimeline from '../../components/leads/LeadActivityTimeline';
import { Edit, Trash2, ArrowLeft, Phone, Mail, Building, Calendar } from 'lucide-react';
import LeadStatusBadge from '../../components/leads/LeadStatusBadge';
import LeadHealthBadge from '../../components/leads/LeadHealthBadge';
import { LEAD_STATUS_OPTIONS } from '../../lib/utils';
import LostReasonModal from '../../components/leads/LostReasonModal';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import SurfaceCard from '../../components/ui/SurfaceCard';

export const LeadDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { lead, loading, error } = useSelector((state: RootState) => state.leads);
    const [statusValue, setStatusValue] = useState('New');
    const [lostReason, setLostReason] = useState('');
    const [statusError, setStatusError] = useState<string | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [lostReasonModalOpen, setLostReasonModalOpen] = useState(false);

    useEffect(() => {
        if (id) {
            dispatch(fetchLead(id));
        }
        return () => {
            dispatch(clearCurrentLead());
        };
    }, [dispatch, id]);

    useEffect(() => {
        if (lead) {
            setStatusValue(lead.status || 'New');
            setLostReason(lead.lostReason || '');
        }
    }, [lead]);

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this lead?')) {
            if (id) {
                await dispatch(deleteLead(id));
                navigate('/leads');
            }
        }
    };

    const handleStatusUpdate = async () => {
        if (!id) return;
        if (statusValue === 'Lost' && !lostReason.trim()) {
            setStatusError('Lost reason is required.');
            setLostReasonModalOpen(true);
            return;
        }

        try {
            setIsUpdatingStatus(true);
            setStatusError(null);
            await dispatch(updateLeadStatus({ id, status: statusValue, lostReason })).unwrap();
        } catch (updateError) {
            setStatusError(typeof updateError === 'string' ? updateError : 'Failed to update status.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleConfirmLostReason = async (reason: string) => {
        if (!id) return;
        try {
            setIsUpdatingStatus(true);
            setStatusError(null);
            setLostReason(reason);
            await dispatch(updateLeadStatus({ id, status: statusValue, lostReason: reason })).unwrap();
        } catch (updateError) {
            setStatusError(typeof updateError === 'string' ? updateError : 'Failed to update status.');
        } finally {
            setIsUpdatingStatus(false);
            setLostReasonModalOpen(false);
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <PageLayout>
                    <div className="flex items-center justify-center min-h-[50vh] text-secondary-500">
                        Loading lead details...
                    </div>
                </PageLayout>
            </MainLayout>
        );
    }

    if (error || !lead) {
        return (
            <MainLayout>
                <PageLayout>
                    <div className="flex flex-col items-center justify-center min-h-[50vh]">
                        <div className="text-red-400 mb-4">Error: {error || 'Lead not found'}</div>
                        <Link to="/leads" className="btn btn-outline">Back to Leads</Link>
                    </div>
                </PageLayout>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <PageLayout>
                <div className="mb-4">
                    <Link to="/leads" className="text-secondary-400 hover:text-secondary-200 flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Leads
                    </Link>
                </div>

                <PageHeader
                    title={`${lead.firstName} ${lead.lastName}`}
                    subtitle={(
                        <span className="flex items-center gap-2 text-secondary-300">
                            <Building className="w-4 h-4" />
                            {lead.company}
                        </span>
                    )}
                    actions={(
                        <div className="flex gap-3">
                            <Link to={`/leads/${lead._id}/edit`} className="btn btn-outline flex items-center gap-2">
                                <Edit className="w-4 h-4" />
                                Edit
                            </Link>
                            <button onClick={handleDelete} className="btn btn-danger flex items-center gap-2">
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    )}
                />

                <div className="flex flex-wrap items-center gap-2 mt-4">
                    <LeadStatusBadge status={lead.status} className="text-sm" />
                    <LeadHealthBadge lead={lead} className="text-sm" />
                    <span className={`status-pill ${
                        lead.priority === 'Hot' ? 'status-danger' :
                            lead.priority === 'Warm' ? 'status-warning' :
                                'status-neutral'
                        }`}>
                        {lead.priority}
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <SurfaceCard className="p-6">
                            <h2 className="text-xl font-semibold text-secondary-50 mb-4">Contact Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-secondary-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-secondary-400">Email</p>
                                        <a href={`mailto:${lead.email}`} className="text-primary-400 hover:underline">{lead.email}</a>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Phone className="w-5 h-5 text-secondary-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-secondary-400">Phone</p>
                                        <a href={`tel:${lead.phone}`} className="text-secondary-100 hover:text-primary-400">{lead.phone}</a>
                                    </div>
                                </div>
                            </div>
                        </SurfaceCard>

                        <SurfaceCard className="p-6">
                            <h2 className="text-xl font-semibold text-secondary-50 mb-4">Lead Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Status</p>
                                    <LeadStatusBadge status={lead.status} className="text-sm mt-1" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Lead Health</p>
                                    <LeadHealthBadge lead={lead} className="mt-1" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Priority</p>
                                    <span className={`status-pill mt-1 ${
                                        lead.priority === 'Hot' ? 'status-danger' :
                                            lead.priority === 'Warm' ? 'status-warning' :
                                                'status-neutral'
                                        }`}>
                                        {lead.priority}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Source</p>
                                    <p className="text-secondary-100 mt-1">{lead.source}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Lead Number</p>
                                    <p className="text-secondary-100 mt-1 font-mono">{lead.leadNumber}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Owner</p>
                                    <p className="text-secondary-100 mt-1">
                                        {lead.ownerId && typeof lead.ownerId === 'object'
                                            ? `${lead.ownerId.firstName || ''} ${lead.ownerId.lastName || ''}`.trim()
                                            : lead.assignedTo
                                                ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                                                : 'Unassigned'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Next Follow-up</p>
                                    <p className="text-secondary-100 mt-1">
                                        {lead.nextFollowUpDate
                                            ? new Date(lead.nextFollowUpDate).toLocaleString()
                                            : 'Not scheduled'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Follow-up Type</p>
                                    <p className="text-secondary-100 mt-1">{lead.followUpType || 'Not set'}</p>
                                </div>
                            </div>
                        </SurfaceCard>

                        <SurfaceCard className="p-6">
                            <h2 className="text-xl font-semibold text-secondary-50 mb-4">Update Status</h2>
                            {statusError && (
                                <div className="alert-error mb-4">
                                    {statusError}
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Status</label>
                                    <select
                                        value={statusValue}
                                        onChange={(e) => {
                                            setStatusValue(e.target.value);
                                            if (e.target.value !== 'Lost') {
                                                setLostReason('');
                                            }
                                        }}
                                        className="input"
                                    >
                                        {LEAD_STATUS_OPTIONS.map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleStatusUpdate}
                                    disabled={isUpdatingStatus}
                                    className="btn btn-primary"
                                >
                                    {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                                </button>
                            </div>
                        </SurfaceCard>

                        {/* Lead Activity Timeline */}
                        {id && (
                            <SurfaceCard className="p-6">
                                <div className="mb-4">
                                    <h2 className="text-xl font-semibold text-secondary-50">Activity Timeline</h2>
                                    <p className="text-sm text-secondary-400 mt-1">
                                        Notes, stage changes, and follow-up updates for this lead.
                                    </p>
                                </div>
                                <LeadActivityTimeline leadId={id} />
                            </SurfaceCard>
                        )}
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <SurfaceCard className="p-6">
                            <h2 className="text-lg font-semibold text-secondary-50 mb-4">System Info</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Created At</p>
                                    <p className="text-secondary-100 text-sm flex items-center gap-2 mt-1">
                                        <Calendar className="w-4 h-4 text-secondary-400" />
                                        {new Date(lead.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-400">Last Updated</p>
                                    <p className="text-secondary-100 text-sm flex items-center gap-2 mt-1">
                                        <Calendar className="w-4 h-4 text-secondary-400" />
                                        {new Date(lead.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </SurfaceCard>
                    </div>
                </div>
            </PageLayout>

            <LostReasonModal
                isOpen={lostReasonModalOpen}
                onClose={() => setLostReasonModalOpen(false)}
                onConfirm={handleConfirmLostReason}
                initialReason={lostReason}
            />
        </MainLayout>
    );
};
