import { ReactNode, useState } from 'react';
import { cn } from '../../lib/utils';
import { ExportType } from './ExportDropdown';
import { DateRangeValue } from './DateRangePicker';
import FilterDrawer from './FilterDrawer';
import { ColumnOption } from './ManageColumns';
import PageHeaderToolbar from './PageHeaderToolbar';

type SortOption = 'newest' | 'oldest';

interface ListPageShellProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    searchValue?: string;
    searchPlaceholder?: string;
    onSearchChange?: (value: string) => void;
    onExport?: (type: ExportType) => void;
    sortValue?: SortOption;
    onSortChange?: (value: SortOption) => void;
    dateRange?: DateRangeValue;
    onDateRangeChange?: (value: DateRangeValue) => void;
    onAdd?: () => void;
    addLabel?: string;
    filterContent?: ReactNode;
    onApplyFilters?: () => void;
    onResetFilters?: () => void;
    manageColumns?: {
        storageKey: string;
        columns: ColumnOption[];
        onChange?: (visibleIds: string[]) => void;
    };
    children: ReactNode;
    className?: string;
}

const ListPageShell = ({
    title,
    subtitle,
    actions,
    searchValue,
    searchPlaceholder,
    onSearchChange,
    onExport,
    sortValue,
    onSortChange,
    dateRange,
    onDateRangeChange,
    onAdd,
    addLabel,
    filterContent,
    onApplyFilters,
    onResetFilters,
    manageColumns,
    children,
    className
}: ListPageShellProps) => {
    const [filtersOpen, setFiltersOpen] = useState(false);

    return (
        <div className={cn('space-y-4', className)}>
            <PageHeaderToolbar
                title={title}
                subtitle={subtitle}
                actions={actions}
                searchValue={searchValue}
                searchPlaceholder={searchPlaceholder}
                onSearchChange={onSearchChange}
                onExport={onExport}
                sortValue={sortValue}
                onSortChange={onSortChange}
                dateRange={dateRange}
                onDateRangeChange={onDateRangeChange}
                onAdd={onAdd}
                addLabel={addLabel}
                filterContent={filterContent}
                onFilterClick={() => setFiltersOpen(true)}
                manageColumns={manageColumns}
            />

            <div className="space-y-4">
                {children}
            </div>

            {filterContent && (
                <FilterDrawer
                    open={filtersOpen}
                    onClose={() => setFiltersOpen(false)}
                    onReset={() => {
                        onResetFilters?.();
                        setFiltersOpen(false);
                    }}
                    onApply={() => {
                        onApplyFilters?.();
                        setFiltersOpen(false);
                    }}
                >
                    {filterContent}
                </FilterDrawer>
            )}
        </div>
    );
};

export default ListPageShell;
