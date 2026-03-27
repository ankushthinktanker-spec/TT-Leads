import Card from '../ui/Card';
import { SelectInput, TextInput } from '../ui/Form';
import { Filter, XCircle, Search, SlidersHorizontal, CalendarDays, Globe } from 'lucide-react';
import PanelHeader from '../ui/PanelHeader';

interface DashboardFiltersProps {
    dateRange: string;
    setDateRange: (val: string) => void;
    customStart: string;
    setCustomStart: (val: string) => void;
    customEnd: string;
    setCustomEnd: (val: string) => void;
    ownerScope: string;
    setOwnerScope: (val: string) => void;
    sourceFilter: string;
    setSourceFilter: (val: string) => void;
    statusFilter: string;
    setStatusFilter: (val: string) => void;
    priorityFilter: string;
    setPriorityFilter: (val: string) => void;
    canViewTeam: boolean;
    activeFilters: string[];
    onClearFilters: () => void;
    hasCustomFilters: boolean;
}

const DashboardFilters = ({
    dateRange,
    setDateRange,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    ownerScope,
    setOwnerScope,
    sourceFilter,
    setSourceFilter,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    canViewTeam,
    activeFilters,
    onClearFilters,
    hasCustomFilters
}: DashboardFiltersProps) => {
    return (
        <Card variant="panel" className="filter-bar p-6">
            <div className="flex flex-col gap-6">
                <div className="border-b border-slate-200/70 pb-5">
                    <div className="flex items-start justify-between gap-4">
                        <PanelHeader
                            icon={SlidersHorizontal}
                            eyebrow="Data controls"
                            title="Dashboard Filters"
                            description="Refine the overview by timeframe, ownership, source, and operational priority."
                        />
                    {hasCustomFilters && (
                        <button
                            type="button"
                            onClick={onClearFilters}
                            className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                        >
                            <XCircle size={14} />
                            Clear Filters
                        </button>
                    )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <CalendarDays size={14} className="text-brand-500" />
                            Date Range
                        </label>
                        <SelectInput
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="bg-white"
                        >
                            <option>Today</option>
                            <option>This Week</option>
                            <option>This Month</option>
                            <option>Custom</option>
                        </SelectInput>
                    </div>

                    {dateRange === 'Custom' && (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Start Date</label>
                                <TextInput
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">End Date</label>
                                <TextInput
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                        </>
                    )}

                    {canViewTeam && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                <Globe size={14} className="text-brand-500" />
                                View Scope
                            </label>
                            <SelectInput
                                value={ownerScope}
                                onChange={(e) => setOwnerScope(e.target.value)}
                                className="bg-white"
                            >
                                <option value="me">My Leads</option>
                                <option value="team">My Team</option>
                                <option value="all">Everyone</option>
                            </SelectInput>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Search size={14} className="text-brand-500" />
                            Source
                        </label>
                        <TextInput
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            placeholder="e.g. Website"
                            className="bg-white"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Filter size={14} className="text-brand-500" />
                            Status
                        </label>
                        <TextInput
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            placeholder="e.g. Qualified"
                            className="bg-white"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Priority</label>
                        <TextInput
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            placeholder="e.g. High"
                            className="bg-white"
                        />
                    </div>
                </div>

                {activeFilters.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-slate-200/70 pt-5">
                        <span className="text-xs font-semibold text-slate-500">Active Filters:</span>
                        <div className="flex flex-wrap items-center gap-2">
                            {activeFilters.map((filter) => (
                                <span
                                    key={filter}
                                    className="inline-flex items-center rounded-lg bg-brand-50 border border-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700"
                                >
                                    {filter}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default DashboardFilters;
