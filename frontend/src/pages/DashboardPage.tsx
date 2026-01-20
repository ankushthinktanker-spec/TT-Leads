import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchDashboardAnalytics } from '../store/slices/analyticsSlice';
import MainLayout from '../components/layout/MainLayout';
import { Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { TextInput, SelectInput, TextareaInput, FormLabel } from '../components/ui/Form';
import { updateLeadFollowUp, addLeadNote, updateLeadStatus } from '../store/slices/leadSlice';
import { fetchUsers } from '../store/slices/userSlice';
import { showToast } from '../utils/toast';
import api from '../api/axios';
import { getErrorMessage } from '../utils/error';

type LeadOwner = {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
};

type LeadFollowup = {
    _id: string;
    name: string;
    company?: string;
    status: string;
    nextFollowUpDate?: string;
    followUpType?: string;
    owner?: LeadOwner | null;
};

type LeadFollowupBuckets = {
    overdue: LeadFollowup[];
    today: LeadFollowup[];
    upcoming: LeadFollowup[];
};

type PipelineRow = {
    stage: string;
    count: number;
};

type StuckLead = {
    leadId: string;
    name: string;
    company?: string;
    stage: string;
    owner?: LeadOwner | null;
    daysStuck: number;
};

type DashboardKpis = {
    wonCount?: number;
    lostCount?: number;
    avgFirstResponseMins?: number;
    totalLeads?: number;
    newLeads?: number;
    openLeads?: number;
    qualifiedLeads?: number;
    followUpsDueToday?: number;
};

type DashboardSourceRow = {
    source: string;
    won: number;
    leads: number;
    conversionRate: number;
};

type DashboardAlerts = {
    noFirstResponse?: unknown[];
    stuckLeads?: unknown[];
    highValueNoNext?: unknown[];
    hotNoMeeting?: unknown[];
    duplicateLeads?: unknown[];
};

type DashboardActivity = {
    _id: string;
    subject: string;
    activityDate?: string;
};

type DashboardData = {
    kpis?: DashboardKpis;
    followups?: { leads?: LeadFollowupBuckets };
    pipeline?: { byStageCount?: PipelineRow[]; stuckLeads?: unknown[] };
    sources?: DashboardSourceRow[];
    recentActivity?: DashboardActivity[];
    alerts?: DashboardAlerts;
};

export const DashboardPage = () => {
    const dispatch = useAppDispatch();
    const { data: dashboardDataRaw, loading: dashboardLoading } = useAppSelector((state) => state.analytics);
    const dashboardData = dashboardDataRaw as DashboardData | null;
    const { user } = useAppSelector((state) => state.auth);
    const { users: teamUsers } = useAppSelector((state) => state.users);
    const canViewTeam = user?.role === 'Admin' || user?.role === 'Manager';

    const [dateRange, setDateRange] = useState('This Month');
    const [ownerScope, setOwnerScope] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const dashboardParams = useMemo(() => {
        const params: Record<string, string | number | undefined> = {
            ownerScope,
            source: sourceFilter || undefined,
            status: statusFilter || undefined,
            priority: priorityFilter || undefined
        };

        const now = new Date();
        if (dateRange === 'Today') {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            const end = new Date(now);
            end.setHours(23, 59, 59, 999);
            params.startDate = start.toISOString();
            params.endDate = end.toISOString();
        } else if (dateRange === 'This Week') {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            params.startDate = start.toISOString();
            params.endDate = end.toISOString();
        } else if (dateRange === 'This Month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            params.startDate = start.toISOString();
            params.endDate = end.toISOString();
        } else if (dateRange === 'Custom') {
            if (customStart) params.startDate = customStart;
            if (customEnd) params.endDate = customEnd;
        }
        return params;
    }, [ownerScope, sourceFilter, statusFilter, priorityFilter, dateRange, customStart, customEnd]);

    useEffect(() => {
        dispatch(fetchDashboardAnalytics(dashboardParams));
    }, [dispatch, dashboardParams]);

    useEffect(() => {
        if (canViewTeam && teamUsers.length === 0) {
            dispatch(fetchUsers({ limit: 100 }));
        }
    }, [canViewTeam, teamUsers.length, dispatch]);


    const [actionModal, setActionModal] = useState<{
        type: 'done' | 'reschedule' | 'note' | 'stage' | null;
        lead: LeadFollowup | null;
    }>({ type: null, lead: null });
    const [actionForm, setActionForm] = useState({
        nextFollowUpAt: '',
        followUpType: '',
        note: '',
        stage: ''
    });
    const [actionSaving, setActionSaving] = useState(false);
    const [stuckLeads, setStuckLeads] = useState<StuckLead[]>([]);
    const [stuckLoading, setStuckLoading] = useState(false);
    const [stuckDays, setStuckDays] = useState('14');
    const [stuckOwnerId, setStuckOwnerId] = useState('');
    const wonCount = dashboardData?.kpis?.wonCount || 0;
    const lostCount = dashboardData?.kpis?.lostCount || 0;
    const wonRate = wonCount + lostCount ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;
    const avgResponseHours = dashboardData?.kpis?.avgFirstResponseMins
        ? (dashboardData.kpis.avgFirstResponseMins / 60).toFixed(1)
        : '0.0';
    const leadFollowups: LeadFollowupBuckets = dashboardData?.followups?.leads || { overdue: [], today: [], upcoming: [] };
    const overdueCount = leadFollowups.overdue.length;
    const pipelineRows: PipelineRow[] = dashboardData?.pipeline?.byStageCount || [];
    const maxStageCount = pipelineRows.length ? Math.max(...pipelineRows.map((row) => row.count)) : 0;
    const stuckLeadsCount = dashboardData?.pipeline?.stuckLeads?.length || 0;

    useEffect(() => {
        const loadStuckLeads = async () => {
            setStuckLoading(true);
            try {
                const params: Record<string, string | number> = { days: Number(stuckDays) || 14, limit: 10 };
                if (stuckOwnerId) {
                    params.ownerId = stuckOwnerId;
                }
                const response = await api.get('/leads/stuck', { params });
                setStuckLeads(response.data?.data || []);
            } catch (error) {
                showToast('Failed to load stuck leads.', 'error');
            } finally {
                setStuckLoading(false);
            }
        };
        loadStuckLeads();
    }, [stuckDays, stuckOwnerId]);

    const activeFilters = useMemo(() => {
        const filters: string[] = [];
        if (dateRange === 'Custom' && (customStart || customEnd)) {
            filters.push(`Custom: ${customStart || '...'} to ${customEnd || '...'}`);
        } else {
            filters.push(dateRange);
        }
        if (canViewTeam && ownerScope !== 'all') {
            filters.push(ownerScope === 'team' ? 'Team' : 'My Items');
        }
        if (sourceFilter) filters.push(`Source: ${sourceFilter}`);
        if (statusFilter) filters.push(`Stage: ${statusFilter}`);
        if (priorityFilter) filters.push(`Priority: ${priorityFilter}`);
        return filters;
    }, [dateRange, customStart, customEnd, canViewTeam, ownerScope, sourceFilter, statusFilter, priorityFilter]);

    const hasCustomFilters =
        dateRange !== 'This Month' ||
        ownerScope !== 'all' ||
        !!sourceFilter ||
        !!statusFilter ||
        !!priorityFilter ||
        !!customStart ||
        !!customEnd;

    const handleClearFilters = () => {
        setDateRange('This Month');
        setOwnerScope('all');
        setSourceFilter('');
        setStatusFilter('');
        setPriorityFilter('');
        setCustomStart('');
        setCustomEnd('');
    };

    const summaryCards = [
        { label: 'Total Leads', value: dashboardData?.kpis?.totalLeads || 0, link: '/leads' },
        { label: 'New Leads', value: dashboardData?.kpis?.newLeads || 0, link: '/leads?status=New' },
        { label: 'Won Deals', value: wonCount, link: '/leads?status=Won' },
        { label: 'Won Rate', value: `${wonRate}%`, link: '/leads?status=Won' },
        { label: 'Avg Response', value: `${avgResponseHours} hrs`, link: '/tasks' },
        { label: 'Overdue Follow-ups', value: overdueCount, link: '/tasks' }
    ];

    const openActionModal = (type: 'done' | 'reschedule' | 'note' | 'stage', lead: LeadFollowup) => {
        setActionModal({ type, lead });
        setActionForm({
            nextFollowUpAt: lead?.nextFollowUpDate
                ? new Date(lead.nextFollowUpDate).toISOString().slice(0, 16)
                : '',
            followUpType: lead?.followUpType || '',
            note: '',
            stage: lead?.status || ''
        });
    };

    const closeActionModal = () => {
        setActionModal({ type: null, lead: null });
        setActionForm({ nextFollowUpAt: '', followUpType: '', note: '', stage: '' });
    };

    const handleActionSubmit = async () => {
        if (!actionModal.lead) return;
        setActionSaving(true);
        try {
            if (actionModal.type === 'done') {
                await dispatch(updateLeadFollowUp({
                    id: actionModal.lead._id,
                    nextFollowUpAt: actionForm.nextFollowUpAt || undefined,
                    followUpType: actionForm.followUpType || undefined,
                    note: actionForm.note || undefined,
                    action: 'done'
                })).unwrap();
            } else if (actionModal.type === 'reschedule') {
                await dispatch(updateLeadFollowUp({
                    id: actionModal.lead._id,
                    nextFollowUpAt: actionForm.nextFollowUpAt || undefined,
                    followUpType: actionForm.followUpType || undefined,
                    note: actionForm.note || undefined,
                    action: 'reschedule'
                })).unwrap();
            } else if (actionModal.type === 'note') {
                await dispatch(addLeadNote({
                    id: actionModal.lead._id,
                    note: actionForm.note || ''
                })).unwrap();
            } else if (actionModal.type === 'stage') {
                if (actionForm.stage === 'Lost' && !actionForm.note.trim()) {
                    throw new Error('Lost reason is required');
                }
                await dispatch(updateLeadStatus({
                    id: actionModal.lead._id,
                    status: actionForm.stage,
                    lostReason: actionForm.stage === 'Lost' ? actionForm.note : undefined
                })).unwrap();
                await dispatch(addLeadNote({
                    id: actionModal.lead._id,
                    note: actionForm.note
                        ? `Stage changed to ${actionForm.stage}. Note: ${actionForm.note}`
                        : `Stage changed to ${actionForm.stage}`
                })).unwrap();
            }
            await dispatch(fetchDashboardAnalytics(dashboardParams));
            showToast('Action completed successfully.', 'success');
            closeActionModal();
        } catch (err: unknown) {
            showToast(getErrorMessage(err, 'Action failed. Please try again.'), 'error');
        } finally {
            setActionSaving(false);
        }
    };

return (
        <MainLayout>
            <div className="page-layout space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="animate-float">
                        <h1 className="page-title text-4xl sm:text-5xl">
                            Dashboard
                        </h1>
                        <p className="mt-3 text-lg text-secondary-200 font-medium">
                            ThinkTanker <span className="text-primary-500">Analytics Intelligence</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="glass-card flex items-center gap-2 px-4 py-2 text-sm font-semibold text-secondary-200">
                            <Calendar size={16} className="text-primary-500" />
                            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* Control Center Filters */}
                <div className="glass-card filter-bar mb-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 sticky top-6 z-10 backdrop-blur">
                    <select className="input text-sm" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                        <option>Today</option>
                        <option>This Week</option>
                        <option>This Month</option>
                        <option>Custom</option>
                    </select>
                    {dateRange === 'Custom' && (
                        <>
                            <input className="input text-sm" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                            <input className="input text-sm" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                        </>
                    )}
                    {canViewTeam && (
                        <select className="input text-sm" value={ownerScope} onChange={(e) => setOwnerScope(e.target.value)}>
                            <option value="me">My Items</option>
                            <option value="team">Team</option>
                            <option value="all">All</option>
                        </select>
                    )}
                    <input className="input text-sm" placeholder="Source" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} />
                    <input className="input text-sm" placeholder="Stage/Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
                    <input className="input text-sm" placeholder="Priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {activeFilters.map((filter) => (
                        <span key={filter} className="filter-chip">
                            {filter}
                        </span>
                    ))}
                    {hasCustomFilters && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="ml-auto text-xs text-primary-400 font-semibold uppercase tracking-widest hover:text-primary-300"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {dashboardLoading && <div className="text-secondary-400 mb-4">Loading analytics...</div>}

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
                    {summaryCards.map((card) => (
                        <div key={card.label} className="glass-card p-5 flex flex-col gap-2">
                            <p className="text-xs uppercase text-secondary-400">{card.label}</p>
                            <p className="text-2xl font-bold text-white">{card.value}</p>
                            <Link to={card.link} className="text-xs text-primary-400 font-semibold uppercase tracking-widest hover:text-primary-300">
                                View details -&gt;
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Pipeline + Follow-up Control Center */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">Pipeline Overview</h2>
                            <span className="text-xs text-secondary-400">Stuck leads: {stuckLeadsCount}</span>
                        </div>
                        <div className="space-y-4">
                            {pipelineRows.map((row) => {
                                const progress = maxStageCount ? Math.round((row.count / maxStageCount) * 100) : 0;
                                return (
                                    <Link
                                        key={row.stage}
                                        to={`/leads?status=${encodeURIComponent(row.stage)}`}
                                        className="block rounded-lg border border-white/5 p-3 hover:border-primary-500/40 transition-colors"
                                    >
                                        <div className="flex justify-between text-secondary-200 text-sm">
                                            <span>{row.stage}</span>
                                            <span className="text-white font-semibold">{row.count}</span>
                                        </div>
                                        <div className="mt-2 h-2 rounded-full bg-secondary-900">
                                            <div
                                                className="h-2 rounded-full bg-primary-500/80"
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Follow-up Control Center</h2>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="rounded-lg border border-white/5 p-3 text-center">
                                <p className="text-[10px] uppercase tracking-widest text-secondary-400">Today</p>
                                <p className="text-lg font-bold text-white">{leadFollowups.today.length}</p>
                            </div>
                            <div className="rounded-lg border border-red-500/20 p-3 text-center">
                                <p className="text-[10px] uppercase tracking-widest text-red-400">Overdue</p>
                                <p className="text-lg font-bold text-red-400">{leadFollowups.overdue.length}</p>
                            </div>
                            <div className="rounded-lg border border-white/5 p-3 text-center">
                                <p className="text-[10px] uppercase tracking-widest text-secondary-400">Upcoming</p>
                                <p className="text-lg font-bold text-white">{leadFollowups.upcoming.length}</p>
                            </div>
                        </div>

                        {(['overdue', 'today', 'upcoming'] as const).map((bucket) => (
                            <div key={bucket} className="mb-6">
                                <p className="text-xs uppercase text-secondary-400 mb-2">
                                    {bucket === 'overdue' ? 'Overdue' : bucket === 'today' ? 'Due Today' : 'Upcoming (7 days)'}
                                </p>
                                <div className="space-y-3">
                                    {leadFollowups[bucket].slice(0, 6).map((lead) => (
                                        <div key={lead._id} className="rounded-lg border border-white/5 p-3 text-sm text-secondary-200">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <div className="text-secondary-50 font-semibold">
                                                        {lead.name}{lead.company ? ` - ${lead.company}` : ''}
                                                    </div>
                                                    <div className="text-xs text-secondary-400 mt-1">
                                                        Owner: {lead.owner ? `${lead.owner.firstName} ${lead.owner.lastName}` : 'Unassigned'} | Stage: {lead.status}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-secondary-400 text-right">
                                                    <div>{lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleString() : 'No follow-up'}</div>
                                                    <div className="mt-1 inline-flex px-2 py-0.5 rounded-full border border-white/10 text-secondary-300">
                                                        {lead.followUpType || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <button className="btn btn-secondary text-xs" onClick={() => openActionModal('done', lead)}>Mark Done</button>
                                                <button className="btn btn-outline text-xs" onClick={() => openActionModal('reschedule', lead)}>Reschedule</button>
                                                <button className="btn btn-outline text-xs" onClick={() => openActionModal('note', lead)}>Add Note</button>
                                                <button className="btn btn-outline text-xs" onClick={() => openActionModal('stage', lead)}>Change Stage</button>
                                            </div>
                                        </div>
                                    ))}
                                    {leadFollowups[bucket].length === 0 && (
                                        <div className="text-xs text-secondary-500">No follow-ups in this bucket.</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Source + Team Performance */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Lead Source Performance</h2>
                        <div className="space-y-2 text-sm">
                            {(dashboardData?.sources || []).map((source) => (
                                <div key={source.source} className="flex justify-between text-secondary-200">
                                    <span>{source.source}</span>
                                    <span>{source.won}/{source.leads} ({(source.conversionRate * 100).toFixed(1)}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="glass-card p-6">
                        <div className="flex flex-col gap-3 mb-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white">Stuck Leads</h2>
                                <Link to="/leads" className="text-xs text-primary-400 uppercase tracking-widest hover:text-primary-300">View all</Link>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-secondary-400 uppercase tracking-widest">Days</span>
                                <SelectInput
                                    value={stuckDays}
                                    onChange={(e) => setStuckDays(e.target.value)}
                                    className="max-w-[120px]"
                                >
                                    <option value="7">7+</option>
                                    <option value="14">14+</option>
                                    <option value="21">21+</option>
                                    <option value="30">30+</option>
                                </SelectInput>
                                {canViewTeam && (
                                    <>
                                        <span className="text-xs text-secondary-400 uppercase tracking-widest ml-3">Owner</span>
                                        <SelectInput
                                            value={stuckOwnerId}
                                            onChange={(e) => setStuckOwnerId(e.target.value)}
                                            className="max-w-[200px]"
                                        >
                                            <option value="">All</option>
                                            {teamUsers.map((owner) => (
                                                <option key={owner._id} value={owner._id}>
                                                    {owner.firstName} {owner.lastName}
                                                </option>
                                            ))}
                                        </SelectInput>
                                    </>
                                )}
                            </div>
                        </div>
                        {stuckLoading ? (
                            <div className="text-sm text-secondary-400">Loading stuck leads...</div>
                        ) : stuckLeads.length === 0 ? (
                            <div className="text-sm text-secondary-500">No stuck leads detected.</div>
                        ) : (
                            <div className="space-y-3 text-sm">
                                {stuckLeads.map((lead) => (
                                    <Link
                                        key={lead.leadId}
                                        to={`/leads/${lead.leadId}`}
                                        className="block rounded-lg border border-white/5 p-3 hover:border-primary-500/40 transition-colors"
                                    >
                                        <div className="flex items-center justify-between text-secondary-100">
                                            <span className="font-semibold">{lead.name}</span>
                                            <span className="text-xs text-red-400">{lead.daysStuck} days</span>
                                        </div>
                                        <div className="text-xs text-secondary-400 mt-1">
                                            {lead.company ? `${lead.company} - ` : ''}{lead.stage}
                                        </div>
                                        <div className="text-xs text-secondary-500 mt-1">
                                            Owner: {lead.owner ? `${lead.owner.firstName} ${lead.owner.lastName}` : 'Unassigned'}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Forecast + Alerts + Quick Actions */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Performance Snapshot</h2>
                        <div className="space-y-2 text-secondary-200 text-sm">
                            <p>Open Leads: <span className="text-primary-400 font-semibold">{dashboardData?.kpis?.openLeads || 0}</span></p>
                            <p>Qualified Leads: <span className="text-primary-400 font-semibold">{dashboardData?.kpis?.qualifiedLeads || 0}</span></p>
                            <p>Follow-ups Due Today: <span className="text-primary-400 font-semibold">{dashboardData?.kpis?.followUpsDueToday || 0}</span></p>
                        </div>
                    </div>
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Alerts & Exceptions</h2>
                        <div className="space-y-2 text-secondary-200 text-sm">
                            <p>No First Response: {dashboardData?.alerts?.noFirstResponse?.length || 0}</p>
                            <p>Stuck Leads: {dashboardData?.alerts?.stuckLeads?.length || 0}</p>
                            <p>High Value w/ No Next Action: {dashboardData?.alerts?.highValueNoNext?.length || 0}</p>
                            <p>Hot Leads w/ No Meeting: {dashboardData?.alerts?.hotNoMeeting?.length || 0}</p>
                            <p>Duplicates: {dashboardData?.alerts?.duplicateLeads?.length || 0}</p>
                        </div>
                    </div>
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-widest">
                            <Link to="/leads/new" className="btn btn-primary">Add Lead</Link>
                            <Link to="/leads" className="btn btn-secondary">Import Leads</Link>
                            <Link to="/tasks" className="btn btn-primary">Create Task</Link>
                            <Link to="/proposals/new" className="btn btn-secondary">Create Proposal</Link>
                            <Link to="/leads" className="btn btn-primary">Assign Owner</Link>
                            <Link to="/leads" className="btn btn-secondary">Update Stage</Link>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="glass-card p-6 mt-8">
                    <h2 className="text-lg font-semibold text-white mb-4">Recent Activity Feed</h2>
                    {(dashboardData?.recentActivity || []).length === 0 ? (
                        <div className="text-sm text-secondary-500">No recent activity yet.</div>
                    ) : (
                        <div className="space-y-3 text-sm text-secondary-200">
                            {(dashboardData?.recentActivity || []).slice(0, 20).map((activity) => (
                                <div key={activity._id} className="flex justify-between border-b border-white/5 pb-2">
                                    <span>{activity.subject}</span>
                                    <span>{activity.activityDate ? new Date(activity.activityDate).toLocaleString() : ''}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {actionModal.type && actionModal.lead && (
                <Modal
                    title={
                        actionModal.type === 'done'
                            ? 'Mark Follow-up Done'
                            : actionModal.type === 'reschedule'
                                ? 'Reschedule Follow-up'
                                : actionModal.type === 'note'
                                    ? 'Add Note'
                                    : 'Change Stage'
                    }
                    onClose={closeActionModal}
                    footer={(
                        <>
                            <Button type="button" onClick={closeActionModal} variant="outline">
                                Cancel
                            </Button>
                            <Button type="button" onClick={handleActionSubmit} disabled={actionSaving} variant="primary">
                                {actionSaving ? 'Saving...' : 'Save'}
                            </Button>
                        </>
                    )}
                >
                    {actionModal.type !== 'note' && actionModal.type !== 'stage' && (
                        <div className="space-y-4">
                            <div>
                                <FormLabel>Next Follow-up</FormLabel>
                                <TextInput
                                    type="datetime-local"
                                    value={actionForm.nextFollowUpAt}
                                    onChange={(e) => setActionForm((prev) => ({ ...prev, nextFollowUpAt: e.target.value }))}
                                />
                            </div>
                            <div>
                                <FormLabel>Follow-up Type</FormLabel>
                                <SelectInput
                                    value={actionForm.followUpType}
                                    onChange={(e) => setActionForm((prev) => ({ ...prev, followUpType: e.target.value }))}
                                >
                                    <option value="">Select Type</option>
                                    <option value="CALL">Call</option>
                                    <option value="WHATSAPP">WhatsApp</option>
                                    <option value="EMAIL">Email</option>
                                    <option value="MEETING">Meeting</option>
                                </SelectInput>
                            </div>
                        </div>
                    )}
                    {actionModal.type === 'stage' && (
                        <div className="space-y-4">
                            <div>
                                <FormLabel>Stage</FormLabel>
                                <SelectInput
                                    value={actionForm.stage}
                                    onChange={(e) => setActionForm((prev) => ({ ...prev, stage: e.target.value }))}
                                >
                                    {['New', 'Contacted', 'Qualified', 'Needs Analysis', 'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Nurture'].map((stage) => (
                                        <option key={stage} value={stage}>
                                            {stage}
                                        </option>
                                    ))}
                                </SelectInput>
                            </div>
                            <div>
                                <FormLabel>{actionForm.stage === 'Lost' ? 'Lost Reason' : 'Note (optional)'}</FormLabel>
                                <TextareaInput
                                    value={actionForm.note}
                                    onChange={(e) => setActionForm((prev) => ({ ...prev, note: e.target.value }))}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    {actionModal.type === 'note' && (
                        <div className="space-y-4">
                            <FormLabel>Note</FormLabel>
                            <TextareaInput
                                value={actionForm.note}
                                onChange={(e) => setActionForm((prev) => ({ ...prev, note: e.target.value }))}
                                rows={4}
                            />
                        </div>
                    )}
                    {(actionModal.type === 'done' || actionModal.type === 'reschedule') && (
                        <div className="mt-4">
                            <FormLabel>Note (optional)</FormLabel>
                            <TextareaInput
                                value={actionForm.note}
                                onChange={(e) => setActionForm((prev) => ({ ...prev, note: e.target.value }))}
                                rows={3}
                            />
                        </div>
                    )}
                </Modal>
            )}
        </MainLayout>
    );
};
