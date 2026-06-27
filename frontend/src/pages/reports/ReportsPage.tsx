import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, FileBarChart2, Sparkles } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchReport } from '../../store/slices/reportsSlice';
import type { ReportRow } from '../../store/slices/reportsSlice';
import {
    ModuleDataTable,
    ModuleFilterDropdown,
    ModulePageHeader,
    ModulePageShell,
    ModuleSummaryCards,
    ModuleToolbar,
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
    { label: 'Proposal-to-Payment Report (Optional)', endpoint: '/reports/finance/proposal-to-payment' },
];

const REPORT_ROW_LIMIT = 100;

const HIDDEN_REPORT_KEYS = new Set([
    '_id',
    '__v',
    'tenantId',
    'updatedAt',
    'createdBy',
    'updatedBy',
    'deletedAt',
]);

const LEAD_REGISTER_COLUMNS = [
    'leadNumber',
    'name',
    'company',
    'status',
    'source',
    'priority',
    'dealValue',
    'location',
    'assignedTo',
    'createdAt',
];

const FIELD_LABELS: Record<string, string> = {
    leadNumber: 'Lead #',
    dealValue: 'Deal Value',
    assignedTo: 'Owner',
    createdAt: 'Created',
    closedAt: 'Closed',
    responseHours: 'Response Time',
    slaBreached: 'SLA Breached',
    avgDays: 'Average Days',
    leadIds: 'Lead IDs',
};

const toTitleCase = (input: string) =>
    input
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^./, (char) => char.toUpperCase());

const isIsoDateString = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);

const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);

const formatLocation = (value: Record<string, unknown>) => {
    const parts = [value.city, value.state, value.country]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
    return parts.join(', ') || '-';
};

const formatBudget = (value: Record<string, unknown>) => {
    const currency = typeof value.currency === 'string' && value.currency.trim() ? value.currency : 'INR';
    const min = typeof value.min === 'number' ? value.min : null;
    const max = typeof value.max === 'number' ? value.max : null;
    const amount = typeof value.amount === 'number' ? value.amount : null;

    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    });

    if (amount !== null) return formatter.format(amount);
    if (min !== null || max !== null) {
        const minLabel = min !== null ? formatter.format(min) : '-';
        const maxLabel = max !== null ? formatter.format(max) : '-';
        return `${minLabel} - ${maxLabel}`;
    }

    return '-';
};

const formatObjectValue = (key: string, value: Record<string, unknown>) => {
    if (key === 'location') return formatLocation(value);
    if (key === 'budget') return formatBudget(value);
    if (typeof value.name === 'string' && value.name.trim()) return value.name;

    const firstName = typeof value.firstName === 'string' ? value.firstName : '';
    const lastName = typeof value.lastName === 'string' ? value.lastName : '';
    const combinedName = `${firstName} ${lastName}`.trim();
    if (combinedName) return combinedName;

    const summary = Object.entries(value)
        .filter(([, nested]) => ['string', 'number', 'boolean'].includes(typeof nested))
        .slice(0, 3)
        .map(([nestedKey, nestedValue]) => `${toTitleCase(nestedKey)}: ${String(nestedValue)}`)
        .join(' · ');

    return summary || '-';
};

const formatReportValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
        if (/(value|amount|budget|revenue|deal)/i.test(key)) return formatCurrency(value);
        if (/(rate|probability)/i.test(key)) return `${value}%`;
        if (/(hours|days)/i.test(key)) return Number.isInteger(value) ? String(value) : value.toFixed(2);
        return String(value);
    }
    if (typeof value === 'string') {
        if (isIsoDateString(value)) return formatDateTime(value);
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => formatReportValue(key, item)).join(', ');
    }
    if (typeof value === 'object') {
        return formatObjectValue(key, value as Record<string, unknown>);
    }
    return String(value);
};

const buildLeadRegisterRow = (row: ReportRow): ReportRow => ({
    leadNumber: row.leadNumber ?? '-',
    name: [row.firstName, row.lastName].filter((part) => typeof part === 'string' && part.trim()).join(' ') || '-',
    company:
        (typeof row.company === 'string' && row.company) ||
        (typeof row.companyName === 'string' && row.companyName) ||
        (typeof row.companyId === 'object' && row.companyId !== null
            ? formatObjectValue('companyId', row.companyId as Record<string, unknown>)
            : '-') ||
        '-',
    status: row.status ?? '-',
    source: row.source ?? '-',
    priority: row.priority ?? '-',
    dealValue: row.dealValue ?? 0,
    location: row.location ?? null,
    assignedTo: row.assignedTo ?? '-',
    createdAt: row.createdAt ?? '-',
});

const buildReportRowKey = (row: ReportRow) => {
    const directKeyCandidates = [row._id, row.leadNumber, row.email, row.name];
    const directKey = directKeyCandidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
    if (typeof directKey === 'string') return directKey;

    return Object.entries(row)
        .slice(0, 4)
        .map(([key, value]) => `${key}:${formatReportValue(key, value)}`)
        .join('|');
};

const ReportsPage = () => {
    const dispatch = useAppDispatch();
    const { rows, loading, error } = useAppSelector((state) => state.reports);
    const { user } = useAppSelector((state) => state.auth);

    const [selectedReport, setSelectedReport] = useState(REPORTS[0].endpoint);
    const [dateRange, setDateRange] = useState('This Month');
    const [ownerScope, setOwnerScope] = useState('me');
    const [source, setSource] = useState('');
    const [status, setStatus] = useState('');
    const [priority, _setPriority] = useState('');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const reportOptions = REPORTS.map((report) => ({
        value: report.endpoint,
        label: report.label,
    }));

    const dateRangeOptions = [
        { value: 'Today', label: 'Today' },
        { value: 'This Week', label: 'This Week' },
        { value: 'This Month', label: 'This Month' },
        { value: 'Custom', label: 'Custom' },
    ];

    const ownerScopeOptions = [
        { value: 'me', label: 'My Items' },
        { value: 'team', label: 'Team' },
        { value: 'all', label: 'All' },
    ];

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

    const displayRows = useMemo(() => {
        if (selectedReport === '/reports/leads/register') {
            return rows.map(buildLeadRegisterRow);
        }

        return rows;
    }, [rows, selectedReport]);

    const visibleKeys = useMemo(() => {
        if (!displayRows.length) return [];
        if (selectedReport === '/reports/leads/register') {
            return LEAD_REGISTER_COLUMNS.filter((key) => key in displayRows[0]);
        }

        return Object.keys(displayRows[0]).filter((key) => !HIDDEN_REPORT_KEYS.has(key));
    }, [displayRows, selectedReport]);

    const columns: ModuleColumnDef<ReportRow>[] = useMemo(() => (
        visibleKeys.map((key) => ({
            id: key,
            header: FIELD_LABELS[key] || toTitleCase(key),
            cell: (row) => {
                const formattedValue = formatReportValue(key, row[key]);
                const isPrimary = key === visibleKeys[0];
                return (
                    <div
                        className={isPrimary ? 'mod-table__primary-text' : 'mod-table__secondary-text'}
                        style={{
                            fontSize: isPrimary ? 13.5 : 13,
                            fontWeight: isPrimary ? 600 : 500,
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            lineHeight: 1.45,
                            maxWidth: key === 'email' ? 260 : undefined,
                        }}
                    >
                        {formattedValue}
                    </div>
                );
            },
            width: key === 'email' ? '260px' : key === 'location' ? '180px' : undefined,
        }))
    ), [visibleKeys]);

    const summaryCards: SummaryCardItem[] = [
        { label: 'Active Report', value: selectedReportLabel, icon: <Sparkles size={18} />, variant: 'primary' },
        { label: 'Visible Rows', value: displayRows.length, icon: <FileBarChart2 size={18} />, variant: 'info' },
        { label: 'Date Scope', value: dateRange, icon: <AlertCircle size={18} />, variant: 'purple' },
    ];

    const tableBadge = rows.length > REPORT_ROW_LIMIT ? `Showing first ${REPORT_ROW_LIMIT} of ${rows.length}` : undefined;

    return (
        <ModulePageShell>
            <ModulePageHeader
                eyebrow="Intelligence · Data"
                title="Reports"
                description="Filter, compare, and export CRM performance data with one consistent reporting surface."
                actions={
                    <>
                        <button type="button" onClick={() => handleExport('csv')} className="mod-btn mod-btn--secondary">
                            <Download size={14} /> Export CSV
                        </button>
                        <button type="button" onClick={() => handleExport('xlsx')} className="mod-btn mod-btn--primary">
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
                <ModuleFilterDropdown
                    ariaLabel="Select report"
                    value={selectedReport}
                    options={reportOptions}
                    onChange={setSelectedReport}
                    triggerClassName="!min-w-[220px]"
                />

                <ModuleFilterDropdown
                    ariaLabel="Select date range"
                    value={dateRange}
                    options={dateRangeOptions}
                    onChange={setDateRange}
                />

                {canViewTeam && (
                    <ModuleFilterDropdown
                        ariaLabel="Select owner scope"
                        value={ownerScope}
                        options={ownerScopeOptions}
                        onChange={setOwnerScope}
                    />
                )}
            </ModuleToolbar>

            <ModuleDataTable
                rows={displayRows.slice(0, REPORT_ROW_LIMIT)}
                columns={columns}
                rowKey={buildReportRowKey}
                loading={loading}
                error={error}
                tableTitle="Report Data"
                tableBadge={tableBadge}
                emptyTitle="No data available"
                emptyDescription="Try changing report type, date range, or operational filters."
                page={1}
                totalPages={1}
                totalItems={displayRows.length}
            />
        </ModulePageShell>
    );
};

export default ReportsPage;
