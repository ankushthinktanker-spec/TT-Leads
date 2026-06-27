import { type ReactNode } from 'react';
import { Filter, Plus, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import ExportDropdown, { type ExportType } from './ExportDropdown';
import DateRangePicker, { type DateRangeValue } from './DateRangePicker';
import ManageColumns, { type ColumnOption } from './ManageColumns';

type SortOption = 'newest' | 'oldest';

export interface PageHeaderToolbarProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    searchValue?: string;
    searchPlaceholder?: string;
    onSearchChange?: (value: string) => void;
    onAdd?: () => void;
    addLabel?: string;
    onExport?: (type: ExportType) => void;
    sortValue?: SortOption;
    onSortChange?: (value: SortOption) => void;
    dateRange?: DateRangeValue;
    onDateRangeChange?: (value: DateRangeValue) => void;
    filterContent?: ReactNode;
    onFilterClick?: () => void;
    manageColumns?: {
        storageKey: string;
        columns: ColumnOption[];
        onChange?: (visibleIds: string[]) => void;
    };
    children?: ReactNode;
    className?: string;
}

const PageHeaderToolbar = ({
    title,
    subtitle,
    actions,
    searchValue,
    searchPlaceholder = 'Search...',
    onSearchChange,
    onAdd,
    addLabel = 'Add New',
    onExport,
    sortValue = 'newest',
    onSortChange,
    dateRange,
    onDateRangeChange,
    filterContent,
    onFilterClick,
    manageColumns,
    children,
    className,
}: PageHeaderToolbarProps) => {
    const hasToolbar = Boolean(
        onSearchChange || onExport || onSortChange ||
        (dateRange && onDateRangeChange) || filterContent || manageColumns || children
    );

    return (
        <div className={cn('space-y-4', className)}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">Operational view</div>
                    <div>
                        <h1 className="text-[30px] font-extrabold leading-none tracking-[-0.03em] text-slate-950">{title}</h1>
                        {subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>}
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {actions}
                    {onAdd && (
                        <button
                            type="button"
                            onClick={onAdd}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-slate-950 shadow-[0_10px_22px_rgba(255,188,0,0.26)] transition hover:bg-brand-600 hover:text-white"
                        >
                            <Plus size={14} />
                            {addLabel}
                        </button>
                    )}
                </div>
            </div>

            {hasToolbar && (
                <div className="rounded-[20px] border border-slate-200 bg-[#fffaf4] px-4 py-3.5 shadow-[0_8px_24px_rgba(120,74,24,0.06)]">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        {onSearchChange && (
                            <div className="relative w-full xl:max-w-[360px]">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchValue || ''}
                                    onChange={(event) => onSearchChange(event.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-[#fffdf9] pl-9 pr-3 text-sm font-medium text-slate-700 shadow-[0_4px_12px_rgba(120,74,24,0.03)] transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                                />
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                            {onSortChange && (
                                <select
                                    value={sortValue}
                                    onChange={(event) => onSortChange(event.target.value as SortOption)}
                                    className="h-10 min-w-[148px] cursor-pointer rounded-xl border border-slate-200 bg-[#fffdf9] px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700 shadow-[0_4px_12px_rgba(120,74,24,0.03)] focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                                >
                                    <option value="newest">Sort: Newest</option>
                                    <option value="oldest">Sort: Oldest</option>
                                </select>
                            )}

                            {dateRange && onDateRangeChange && (
                                <div className="h-10">
                                    <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
                                </div>
                            )}

                            {filterContent && (
                                <button
                                    type="button"
                                    onClick={onFilterClick}
                                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-[#fffdf9] px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700 transition hover:border-brand-200 hover:bg-[#fff5dd] hover:text-brand-700"
                                >
                                    <Filter className="h-4 w-4 text-brand-600" />
                                    Filters
                                </button>
                            )}

                            {manageColumns && (
                                <div className="h-10">
                                    <ManageColumns
                                        storageKey={manageColumns.storageKey}
                                        columns={manageColumns.columns}
                                        onChange={manageColumns.onChange}
                                    />
                                </div>
                            )}

                            {onExport && (
                                <div className="h-10">
                                    <ExportDropdown onExport={onExport} />
                                </div>
                            )}

                            {children}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PageHeaderToolbar;
