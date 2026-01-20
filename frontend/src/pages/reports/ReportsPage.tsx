import { useEffect, useMemo, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchReport } from '../../store/slices/reportsSlice';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import EmptyState from '../../components/ui/EmptyState';
import { Table, TableHead, TableRow, TableHeadCell, TableBody, TableCell } from '../../components/ui/Table';

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

    const columns = rows.length ? Object.keys(rows[0]) : [];
    const selectedReportLabel = REPORTS.find((report) => report.endpoint === selectedReport)?.label || 'Report';

    return (
        <MainLayout>
            <PageLayout>
                <PageHeader
                    title="Reports Library"
                    subtitle="Filter, export, and drill into lead performance reports."
                    actions={(
                        <div className="flex items-center gap-3">
                            <button onClick={() => handleExport('csv')} className="btn btn-secondary text-xs uppercase tracking-widest">Export CSV</button>
                            <button onClick={() => handleExport('xlsx')} className="btn btn-primary text-xs uppercase tracking-widest">Export Excel</button>
                        </div>
                    )}
                />

                <FilterBar className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                        <select
                            value={selectedReport}
                            onChange={(e) => setSelectedReport(e.target.value)}
                            className="lg:col-span-2 input"
                        >
                            {REPORTS.map((report) => (
                                <option key={report.endpoint} value={report.endpoint}>
                                    {report.label}
                                </option>
                            ))}
                        </select>

                        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="input">
                            <option>Today</option>
                            <option>This Week</option>
                            <option>This Month</option>
                            <option>Custom</option>
                        </select>

                        {dateRange === 'Custom' && (
                            <>
                                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input" />
                                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input" />
                            </>
                        )}

                        {canViewTeam && (
                            <select value={ownerScope} onChange={(e) => setOwnerScope(e.target.value)} className="input">
                                <option value="me">My Items</option>
                                <option value="team">Team</option>
                                <option value="all">All</option>
                            </select>
                        )}
                    </div>
                </FilterBar>

                <SurfaceCard className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input className="input" placeholder="Source (optional)" value={source} onChange={(e) => setSource(e.target.value)} />
                        <input className="input" placeholder="Status/Stage (optional)" value={status} onChange={(e) => setStatus(e.target.value)} />
                        <input className="input" placeholder="Priority (optional)" value={priority} onChange={(e) => setPriority(e.target.value)} />
                    </div>
                </SurfaceCard>

                <SurfaceCard className="mt-6 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex flex-wrap items-center gap-2">
                        <span className="text-xs uppercase text-secondary-400 tracking-widest">Active Report</span>
                        <span className="text-sm text-secondary-100 font-semibold">{selectedReportLabel}</span>
                    </div>
                    {loading && <p className="text-secondary-400 p-4">Loading report...</p>}
                    {error && <p className="text-red-400 p-4">{error}</p>}
                    {!loading && rows.length === 0 && (
                        <div className="p-4">
                            <EmptyState title="No data available" description="Try changing filters or date range." />
                        </div>
                    )}
                    {!loading && rows.length > 0 && (
                        <div className="overflow-auto">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        {columns.map((col) => (
                                            <TableHeadCell key={col}>{col}</TableHeadCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row, idx) => (
                                        <TableRow key={idx}>
                                            {columns.map((col) => (
                                                <TableCell key={col}>
                                                    {String(row[col])}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </SurfaceCard>
            </PageLayout>
        </MainLayout>
    );
};

export default ReportsPage;
