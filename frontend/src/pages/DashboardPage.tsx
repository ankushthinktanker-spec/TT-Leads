import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Target, Users, Zap, BriefcaseBusiness, AlertCircle } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchDashboardAnalytics } from '../store/slices/analyticsSlice';
import type { DashboardData, PipelineRow } from '../types/dashboard';
import InlineAlert from '../components/ui/InlineAlert';
import {
    ModulePageShell,
    ModulePageHeader,
    ModuleSummaryCards,
    ModuleDataTable,
    type ModuleColumnDef,
    type SummaryCardItem,
} from '../components/module-system';

const formatCompactNumber = (value: number) =>
    new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const formatCompactCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value);

const DashboardPage = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { data, loading, error } = useAppSelector((state) => state.analytics);
    const { user } = useAppSelector((state) => state.auth);

    useEffect(() => {
        void dispatch(fetchDashboardAnalytics({}));
    }, [dispatch]);

    const dashboardData = (data as DashboardData | null) ?? null;
    const pipeline = dashboardData?.pipeline?.byStageCount ?? [];
    const activities = dashboardData?.recentActivity ?? [];

    const totalLeads = dashboardData?.kpis?.totalLeads ?? 0;
    const qualifiedLeads = dashboardData?.kpis?.qualifiedLeads ?? 0;
    const pendingProposals = pipeline.find((row) => row.stage === 'Proposal Sent')?.count ?? 0;
    const totalPipelineCount = Math.max(1, pipeline.reduce((sum, row) => sum + row.count, 0));
    const totalPipelineValue = dashboardData?.kpis?.totalPipelineValue ?? 0;
    const weightedPipelineValue = dashboardData?.kpis?.weightedPipelineValue ?? 0;
    const followUpCount = dashboardData?.kpis?.followUpsDueToday ?? 0;
    const expectedThisMonth = dashboardData?.forecast?.expectedThisMonth ?? 0;

    const summaryCards: SummaryCardItem[] = [
        { label: 'Active Leads', value: loading ? '...' : formatCompactNumber(totalLeads), icon: <Users size={18} />, variant: 'primary' },
        { label: 'Qualified Flow', value: loading ? '...' : formatCompactNumber(qualifiedLeads), icon: <Zap size={18} />, variant: 'success' },
        { label: 'Pending Proposals', value: loading ? '...' : pendingProposals.toString(), icon: <Target size={18} />, variant: 'warning' },
        { label: 'Pipeline Value', value: loading ? '...' : formatCompactCurrency(totalPipelineValue), icon: <BriefcaseBusiness size={18} />, variant: 'purple' },
    ];

    const pipelineColumns: ModuleColumnDef<PipelineRow>[] = [
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
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#f3e7d8]">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
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

    const activityColumns: ModuleColumnDef<(typeof activities)[number]>[] = [
        {
            id: 'details',
            header: 'Recent Movement',
            width: '75%',
            cell: (act) => (
                <div style={{ minWidth: 0 }}>
                    <div className="mod-table__primary-text truncate">{act.subject}</div>
                    <div className="mod-table__secondary-text mt-0.5 text-[10px] uppercase tracking-wider">{act.type}</div>
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
                    {act.activityDate ? format(parseISO(act.activityDate), 'MMM d, h:mm a') : '--'}
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
                actions={(
                    <button
                        className="mod-btn mod-btn--primary"
                        onClick={() => navigate('/leads/new')}
                    >
                        <Plus size={14} /> Add Lead
                    </button>
                )}
            />

            {error && (
                <InlineAlert
                    tone="danger"
                    title="Dashboard unavailable"
                    className="mb-4"
                    action={(
                        <button
                            type="button"
                            className="mod-btn mod-btn--ghost mod-btn--sm"
                            onClick={() => void dispatch(fetchDashboardAnalytics({}))}
                        >
                            Retry
                        </button>
                    )}
                >
                    Failed to load dashboard data. Please try again. If the problem persists, contact support.
                </InlineAlert>
            )}

            <ModuleSummaryCards cards={summaryCards} />

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <ModuleDataTable
                    rows={pipeline}
                    columns={pipelineColumns}
                    rowKey={(r) => r.stage}
                    loading={loading}
                    error={null}
                    tableTitle="Pipeline Performance"
                    tableBadge={pipeline.length > 0 ? `${totalPipelineCount} active deals` : undefined}
                />

                <ModuleDataTable
                    rows={activities.slice(0, 5)}
                    columns={activityColumns}
                    rowKey={(r) => r._id}
                    loading={loading}
                    error={null}
                    tableTitle="System Activity Stream"
                />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-1">
                <div className="mod-card flex flex-col items-center justify-center bg-gradient-to-br from-[#fffaf4] to-[#fbf2e7] p-8 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <AlertCircle size={28} />
                    </div>
                    <div className="mb-3 inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                        Today&apos;s operating focus
                    </div>
                    {loading ? (
                        <h3 className="text-lg font-bold text-slate-400">Loading follow-ups...</h3>
                    ) : followUpCount > 0 ? (
                        <h3 className="text-lg font-bold text-slate-900">{followUpCount} Follow-up{followUpCount !== 1 ? 's' : ''} Due Today</h3>
                    ) : (
                        <h3 className="text-lg font-bold text-slate-900">No Follow-ups Due Today</h3>
                    )}
                    <p className="mt-2 mb-6 max-w-sm text-[13px] text-slate-500">
                        {followUpCount > 0
                            ? 'You have pending items that require immediate attention. Keep your conversion rates high by addressing these directly.'
                            : 'You are all caught up. Check back later for new tasks.'}
                    </p>
                    {!loading && (
                        <div className="mb-6 grid w-full max-w-xl gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-[#fffdf9] px-4 py-3 text-left shadow-[0_8px_18px_rgba(120,74,24,0.05)]">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Weighted forecast</div>
                                <div className="mt-1 text-lg font-bold text-slate-900">{formatCompactCurrency(weightedPipelineValue)}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-[#fffdf9] px-4 py-3 text-left shadow-[0_8px_18px_rgba(120,74,24,0.05)]">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Expected this month</div>
                                <div className="mt-1 text-lg font-bold text-slate-900">{formatCompactCurrency(expectedThisMonth)}</div>
                            </div>
                        </div>
                    )}
                    <button
                        className="mod-btn mod-btn--primary px-6"
                        onClick={() => navigate('/tasks')}
                    >
                        View Worklist
                    </button>
                </div>
            </div>
        </ModulePageShell>
    );
};

export { DashboardPage };
export default DashboardPage;
