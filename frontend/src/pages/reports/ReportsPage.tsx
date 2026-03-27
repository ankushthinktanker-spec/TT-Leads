import { useEffect, useMemo, useState } from 'react';
import { Download, FileBarChart2, Sparkles, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchReport } from '../../store/slices/reportsSlice';
import {
    ModulePageShell,
    ModulePageHeader,
    ModuleToolbar,
    ModuleSummaryCards,
    ModuleDataTable,
    ModuleBadge,
    type ModuleColumnDef,
    type SummaryCardItem,
} from '../../components/module-system';

const REPORTS = [
    { label: 'Lead Register Report', endpoint: '/reports/leads/register' },
    { label: 'Lead Source Report', endpoint: '/reports/leads/source' },
    { label: 'Lead Status/Stage Report', endpoint: '/reports/leads/status' },
    { label: 'Lead Aging Report', endpoint: '/reports/leads/aging' },
    { label: 'Lead Response Time Report', endpoint: '/reports/leads/response-time' },
    { label: 'Duplicate Leads Report', endpoint: '/reports/leads/duplicates' },
    { label: 'Follow-up Due vs Completed', endpoint: '/reports/followups/due-vs-completed' },
    { label: 'Overdue Follow-ups', endpoint: '/reports/followups/overdue' },
    { label: 'Activity Report', endpoint: '/reports/activities' },
    { label: 'No-Activity Leads Report', endpoint: '/reports/leads/no-activity' },
    { label: 'Pipeline Value Report', endpoint: '/reports/pipeline/value' },
    { label: 'Weighted Pipeline Forecast', endpoint: '/reports/pipeline/weighted' },
    { label: 'Won Deals Report', endpoint: '/reports/deals/won' },
    { label: 'Lost Deals Report', endpoint: '/reports/deals/lost' },
    { label: 'Conversion Report', endpoint: '/reports/conversion' },
    { label: 'Deal Cycle Time Report', endpoint: '/reports/deal-cycle' },
    { label: 'Sales Rep Performance', endpoint: '/reports/team/performance' },
    { label: 'Workload Report', endpoint: '/reports/team/workload' },
    { label: 'Payment Collection Report (Optional)', endpoint: '/reports/finance/payments' },
    { label: 'Proposal-to-Payment Report (Optional)', endpoint: '/reports/finance/proposal-to-payment' }
];

const ReportsPage = () => {
    const dispatch = useAppDispatch();
    const { rows, loading, error } = useAppSelector((state) => state.reports);
    const { user } = useAppSelector((state) => state.auth);

    const [selectedReport, setSelectedReport] = useState(REPORTS[0].endpoint);
    const [dateRange, setDateRange] = useState('This Month');
    const [ownerScope, setOwnerScope] = useState('me');
    const [source, setSource] = useState('');
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const params = useMemo(() => {
        const filters: Record<string, string | number | boolean> = { ownerScope };
        if (source) filters.source = source;
        if (status) filters.status = status;
        if (priority) filters.priority = priority;

        const now = new Date();
        if (dateRange === 'Today') {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            const end = new Date(now);
            end.setHours(23, 59, 59, 999);
            filters.startDate = start.toISOString();
            filters.endDate = end.toISOString();
        } else if (dateRange === 'This Week') {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            filters.startDate = start.toISOString();
            filters.endDate = end.toISOString();
        } else if (dateRange === 'This Month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            filters.startDate = start.toISOString();
            filters.endDate = end.toISOString();
        } else if (dateRange === 'Custom') {
            if (customStart) filters.startDate = customStart;
            if (customEnd) filters.endDate = customEnd;
        }
        return filters;
    }, [ownerScope, source, status, priority, dateRange, customStart, customEnd]);

    useEffect(() => {
        dispatch(fetchReport({ endpoint: selectedReport, params }));
    }, [dispatch, selectedReport, params]);

    const canViewTeam = user?.role === 'Admin' || user?.role === 'Manager';

    const handleExport = (format: 'csv' | 'xlsx') => {
        const query = new URLSearchParams({ ...params, format });
        window.open(`/api${selectedReport}?${query.toString()}`, '_blank');
    };

    const selectedReportLabel = REPORTS.find((report) => report.endpoint === selectedReport)?.label || 'Report';

    // Dynamite columns based on report rows
    const columns: ModuleColumnDef<any>[] = rows.length ? Object.keys(rows[0]).map((colKey) => ({
        id: colKey,
        header: colKey.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()), // camelCase to Title Case
        cell: (row) => (
            <div className="mod-table__primary-text" style={{ fontSize: 13, fontWeight: 500 }}>
                {row[colKey] !== null && row[colKey] !== undefined ? String(row[colKey]) : '-'}
            </div>
        )
    })) : [];

    const summaryCards: SummaryCardItem[] = [
        { label: 'Active Report', value: selectedReportLabel, icon: <Sparkles size={18} />, variant: 'primary' },
        { label: 'Visible Rows', value: rows.length, icon: <FileBarChart2 size={18} />, variant: 'info' },
        { label: 'Date Scope', value: dateRange, icon: <AlertCircle size={18} />, variant: 'purple' },
    ];

    return (
        <ModulePageShell>
            <ModulePageHeader
                eyebrow="Intelligence · Data"
                title="Reports"
                description="Filter, compare, and export CRM performance data with one consistent reporting surface."
                actions={
                    <>
                        <button onClick={() => handleExport('csv')} className="mod-btn mod-btn--secondary">
                            <Download size={14} /> Export CSV
                        </button>
                        <button onClick={() => handleExport('xlsx')} className="mod-btn mod-btn--primary">
                            <FileBarChart2 size={14} /> Export Excel
                        </button>
                    </>
                }
            />

            <ModuleSummaryCards cards={summaryCards} />

            <ModuleToolbar
                filterContent={
                    <>
                        {dateRange === 'Custom' && (
                            <>
                                <div>
                                    <label className="mod-filter-panel__field-label">Start Date</label>
                                    <input 
                                        type="date" 
                                        className="mod-toolbar__search-input w-full" 
                                        value={customStart} 
                                        onChange={(e) => setCustomStart(e.target.value)} 
                                    />
                                </div>
                                <div>
                                    <label className="mod-filter-panel__field-label">End Date</label>
                                    <input 
                                        type="date" 
                                        className="mod-toolbar__search-input w-full" 
                                        value={customEnd} 
                                        onChange={(e) => setCustomEnd(e.target.value)} 
                                    />
                                </div>
                            </>
                        )}
                        <div>
                            <label className="mod-filter-panel__field-label">Source Context</label>
                            <input 
                                className="mod-toolbar__search-input w-full" 
                                placeholder="E.g., Website" 
                                value={source} 
                                onChange={(e) => setSource(e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="mod-filter-panel__field-label">Status Context</label>
                            <input 
                                className="mod-toolbar__search-input w-full" 
                                placeholder="E.g., Hot" 
                                value={status} 
                                onChange={(e) => setStatus(e.target.value)} 
                            />
                        </div>
                    </>
                }
            >
                <select
                    value={selectedReport}
                    onChange={(e) => setSelectedReport(e.target.value)}
                    className="mod-toolbar__select"
                    style={{ minWidth: 220 }}
                >
                    {REPORTS.map((report) => (
                        <option key={report.endpoint} value={report.endpoint}>
                            {report.label}
                        </option>
                    ))}
                </select>

                <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="mod-toolbar__select">
                    <option>Today</option>
                    <option>This Week</option>
                    <option>This Month</option>
                    <option>Custom</option>
                </select>

                {canViewTeam && (
                    <select value={ownerScope} onChange={(e) => setOwnerScope(e.target.value)} className="mod-toolbar__select">
                        <option value="me">My Items</option>
                        <option value="team">Team</option>
                        <option value="all">All</option>
                    </select>
                )}
            </ModuleToolbar>

            <ModuleDataTable
                rows={rows}
                columns={columns}
                rowKey={(_, idx) => `row-${idx}`}
                loading={loading}
                error={error}
                tableTitle="Report Data"
                emptyTitle="No data available"
                emptyDescription="Try changing report type, date range, or operational filters."
                page={1}
                totalPages={1}
                totalItems={rows.length}
            />

        </ModulePageShell>
    );
};

export default ReportsPage;
