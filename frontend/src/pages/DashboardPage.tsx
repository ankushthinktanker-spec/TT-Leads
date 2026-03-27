import { useEffect, useMemo } from 'react';
import { Download, Filter, Plus, Target, Users, Zap, BriefcaseBusiness, AlertCircle } from 'lucide-react';
import { parseISO, isPast, format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchDashboardAnalytics } from '../store/slices/analyticsSlice';
import type { DashboardActivity, DashboardData, DashboardSourceRow, PipelineRow } from '../types/dashboard';
import {
    ModulePageShell,
    ModulePageHeader,
    ModuleSummaryCards,
    ModuleDataTable,
    ModuleBadge,
    type ModuleColumnDef,
    type SummaryCardItem,
} from '../components/module-system';

const fallbackPipeline: PipelineRow[] = [
    { stage: 'New Leads', count: 46 },
    { stage: 'Qualified', count: 31 },
    { stage: 'Proposal Sent', count: 18 },
    { stage: 'Negotiation', count: 11 },
    { stage: 'Won', count: 7 }
];

const fallbackSources: DashboardSourceRow[] = [
    { source: 'Website', leads: 42, won: 10, conversionRate: 23.8 },
    { source: 'Referral', leads: 28, won: 12, conversionRate: 42.9 },
    { source: 'LinkedIn', leads: 33, won: 8, conversionRate: 24.2 },
    { source: 'Campaigns', leads: 19, won: 4, conversionRate: 21.1 }
];

const fallbackActivity: DashboardActivity[] = [
    { _id: '1', subject: 'Proposal sent to Northstar Labs', type: 'proposal', activityDate: '2026-03-26T08:15:00.000Z' },
    { _id: '2', subject: 'Follow-up completed for Apex Holdings', type: 'task', activityDate: '2026-03-26T07:40:00.000Z' },
    { _id: '3', subject: 'Subscription renewal flagged for ThinkRetail', type: 'subscription', activityDate: '2026-03-26T06:55:00.000Z' },
    { _id: '4', subject: 'Qualified lead assigned to Priya Sharma', type: 'lead', activityDate: '2026-03-25T15:10:00.000Z' }
];

const fallbackLeads = [
    { id: 'ld-1', name: 'Aman Verma', company: 'Northstar Labs', status: 'Qualified', priority: 'High', updatedAt: '2026-03-26T08:05:00.000Z' },
    { id: 'ld-2', name: 'Riya Sen', company: 'ThinkRetail', status: 'Proposal Sent', priority: 'Medium', updatedAt: '2026-03-26T06:50:00.000Z' },
    { id: 'ld-3', name: 'Nitin Rao', company: 'Apex Holdings', status: 'Negotiation', priority: 'High', updatedAt: '2026-03-25T17:20:00.000Z' },
    { id: 'ld-4', name: 'Megha Bhat', company: 'BluePeak Systems', status: 'Contacted', priority: 'Low', updatedAt: '2026-03-25T12:15:00.000Z' }
];

const formatCompactNumber = (value: number) =>
    new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const DashboardPage = () => {
    const dispatch = useAppDispatch();
    const { data, loading, error } = useAppSelector((state) => state.analytics);
    const { user } = useAppSelector((state) => state.auth);

    useEffect(() => {
        void dispatch(fetchDashboardAnalytics({}));
    }, [dispatch]);

    const dashboardData = (data as DashboardData | null) ?? null;
    const pipeline = dashboardData?.pipeline?.byStageCount?.length ? dashboardData.pipeline.byStageCount : fallbackPipeline;
    const activities = dashboardData?.recentActivity?.length ? dashboardData.recentActivity : fallbackActivity;
    const sources = dashboardData?.sources?.length ? dashboardData.sources : fallbackSources;
    
    // KPI Data
    const totalLeads = dashboardData?.kpis?.totalLeads ?? 184;
    const qualifiedLeads = dashboardData?.kpis?.qualifiedLeads ?? 62;
    const pendingProposals = pipeline.find((row) => row.stage === 'Proposal Sent')?.count ?? 18;
    const totalPipelineCount = Math.max(1, pipeline.reduce((sum, row) => sum + row.count, 0));
    const revenue = (dashboardData?.kpis?.wonCount ?? 24) * 185000;

    const summaryCards: SummaryCardItem[] = [
        { label: 'Active Leads', value: formatCompactNumber(totalLeads), icon: <Users size={18} />, variant: 'primary' },
        { label: 'Qualified Flow', value: formatCompactNumber(qualifiedLeads), icon: <Zap size={18} />, variant: 'success' },
        { label: 'Pending Proposals', value: pendingProposals.toString(), icon: <Target size={18} />, variant: 'warning' },
        { label: 'Pipeline Value', value: `₹${formatCompactNumber(revenue)}`, icon: <BriefcaseBusiness size={18} />, variant: 'purple' },
    ];

    const pipelineColumns: ModuleColumnDef<(typeof pipeline)[number]>[] = [
        {
            id: 'stage',
            header: 'Pipeline Stage',
            width: '40%',
            cell: (row) => <div className="mod-table__primary-text">{row.stage}</div>
        },
        {
            id: 'progress',
            header: 'Volume',
            width: '40%',
            cell: (row) => {
                const pct = Math.max(5, Math.round((row.count / totalPipelineCount) * 100));
                return (
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                );
            }
        },
        {
            id: 'count',
            header: 'Count',
            width: '20%',
            align: 'right',
            cell: (row) => <div className="mod-table__primary-text font-bold">{row.count}</div>
        }
    ];

    const leadsColumns: ModuleColumnDef<(typeof fallbackLeads)[number]>[] = [
        {
            id: 'lead',
            header: 'Recent Lead',
            width: '50%',
            cell: (lead) => (
                <div style={{ minWidth: 0 }}>
                    <div className="mod-table__primary-text">{lead.name}</div>
                    <div className="mod-table__secondary-text truncate">{lead.company}</div>
                </div>
            )
        },
        {
            id: 'status',
            header: 'Status',
            width: '25%',
            cell: (lead) => (
                <ModuleBadge variant="neutral">{lead.status}</ModuleBadge>
            )
        },
        {
            id: 'priority',
            header: 'Priority',
            width: '25%',
            align: 'right',
            cell: (lead) => {
                let v: 'danger'|'warning'|'success' = 'success';
                if(lead.priority==='High') v='danger';
                if(lead.priority==='Medium') v='warning';
                return <ModuleBadge variant={v}>{lead.priority}</ModuleBadge>;
            }
        }
    ];

    const activityColumns: ModuleColumnDef<(typeof activities)[number]>[] = [
        {
            id: 'details',
            header: 'Recent Movement',
            width: '75%',
            cell: (act) => (
                <div style={{ minWidth: 0 }}>
                    <div className="mod-table__primary-text truncate">{act.subject}</div>
                    <div className="mod-table__secondary-text uppercase tracking-wider text-[10px] mt-0.5">{act.type}</div>
                </div>
            )
        },
        {
            id: 'date',
            header: 'Time',
            width: '25%',
            align: 'right',
            cell: (act) => (
                <div className="mod-table__secondary-text text-[11px]">
                    {format(parseISO(act.activityDate), 'MMM d, h:mm a')}
                </div>
            )
        }
    ];

    return (
        <ModulePageShell>
            <ModulePageHeader
                eyebrow="Command Center"
                title={`Good morning, ${user?.firstName || 'Team'}.`}
                description="Track the business pulse, move urgent follow-ups faster, and keep high-value accounts progressing."
                actions={
                    <>
                        <button className="mod-btn mod-btn--secondary">
                            <Download size={14} /> Export
                        </button>
                        <button className="mod-btn mod-btn--primary">
                            <Plus size={14} /> Add Lead
                        </button>
                    </>
                }
            />

            {error && (
                <div style={{
                    padding: '12px 16px', background: 'var(--mod-danger-light)', border: '1px solid #fecaca',
                    borderRadius: 'var(--mod-radius-lg)', color: 'var(--mod-danger-text)', fontSize: 13, fontWeight: 600, marginBottom: 16
                }}>
                    Dashboard data loaded with errors. Displaying partial fallback information.
                </div>
            )}

            <ModuleSummaryCards cards={summaryCards} />

            <div className="grid lg:grid-cols-2 gap-6 mt-6">
                <ModuleDataTable
                    rows={pipeline}
                    columns={pipelineColumns}
                    rowKey={(r) => r.stage}
                    loading={loading}
                    error={null}
                    tableTitle="Pipeline Performance"
                    tableBadge={`${totalPipelineCount} active deals`}
                />

                <ModuleDataTable
                    rows={fallbackLeads}
                    columns={leadsColumns}
                    rowKey={(r) => r.id}
                    loading={false}
                    error={null}
                    tableTitle="Urgent Leads Tracker"
                    tableBadge="Needs attention"
                />
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mt-6">
                <ModuleDataTable
                    rows={activities.slice(0, 5)}
                    columns={activityColumns}
                    rowKey={(r) => r._id}
                    loading={loading}
                    error={null}
                    tableTitle="System Activity Stream"
                />

                <div className="mod-card flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-50 to-white">
                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                        <AlertCircle size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">14 Follow-ups Due Today</h3>
                    <p className="text-[13px] text-slate-500 mt-2 mb-6 max-w-sm">
                        You have pending items that require immediate attention. Keep your conversion rates high by addressing these directly.
                    </p>
                    <button className="mod-btn mod-btn--primary px-6">
                        View Worklist
                    </button>
                </div>
            </div>

        </ModulePageShell>
    );
};

export { DashboardPage };
export default DashboardPage;
