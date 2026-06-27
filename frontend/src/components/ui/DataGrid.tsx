import { ReactNode, useState, useCallback, useRef, useId } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableHeadCell,
    TableCell,
} from './Table';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Column<T> {
    /** Unique key — used for sort state and React key */
    key: string;
    /** Header cell content */
    header: ReactNode;
    /** Render cell content for a row */
    cell: (row: T, index: number) => ReactNode;
    /** Enable sort arrows on this column */
    sortable?: boolean;
    /** CSS width for the column (e.g. '120px', '20%') */
    width?: string;
    /** Text alignment in both header and data cells */
    align?: 'left' | 'center' | 'right';
    /** Extra className applied to both th and td */
    className?: string;
}

export interface SortState {
    key: string;
    dir: 'asc' | 'desc';
}

export interface DataGridProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    /** Number of skeleton rows shown while loading */
    skeletonRows?: number;
    // ---- Empty state ----
    emptyIcon?: ReactNode;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyAction?: ReactNode;
    // ---- Row identity ----
    getRowKey: (row: T, index: number) => string | number;
    // ---- Row interaction ----
    onRowClick?: (row: T) => void;
    // ---- Selection ----
    selectable?: boolean;
    selectedKeys?: Set<string | number>;
    onSelectionChange?: (keys: Set<string | number>) => void;
    // ---- Sort (controlled or uncontrolled) ----
    /** Pass to control sort externally (server-side sort) */
    sort?: SortState;
    /** Called when a sortable header is clicked */
    onSortChange?: (sort: SortState) => void;
    /** Footer content rendered below the table (e.g. Pagination) */
    footer?: ReactNode;
    className?: string;
    tableClassName?: string;
}

// ---------------------------------------------------------------------------
// Internal: skeleton row
// ---------------------------------------------------------------------------

function SkeletonRow({
    colCount,
    hasCheckbox,
}: {
    colCount: number;
    hasCheckbox: boolean;
}) {
    return (
        <TableRow>
            {hasCheckbox && (
                <TableCell className="w-10">
                    <Skeleton className="h-4 w-4 rounded" />
                </TableCell>
            )}
            {Array.from({ length: colCount }).map((_, i) => (
                <TableCell key={i}>
                    <Skeleton
                        className={cn(
                            'h-4 rounded-md',
                            // Vary widths so the skeleton looks natural
                            i % 3 === 0 ? 'w-24' : i % 3 === 1 ? 'w-36' : 'w-20'
                        )}
                    />
                </TableCell>
            ))}
        </TableRow>
    );
}

// ---------------------------------------------------------------------------
// Internal: sort icon
// ---------------------------------------------------------------------------

function SortIcon({ active, dir }: { active: boolean; dir?: 'asc' | 'desc' }) {
    if (!active) return <ArrowUpDown size={13} className="opacity-35" />;
    return dir === 'asc'
        ? <ArrowUp size={13} className="text-brand-600" />
        : <ArrowDown size={13} className="text-brand-600" />;
}

// ---------------------------------------------------------------------------
// DataGrid
// ---------------------------------------------------------------------------

/**
 * Production-grade data table with built-in:
 * - Column sorting (controlled + uncontrolled)
 * - Row selection (single / multi via checkbox)
 * - Skeleton loading state
 * - Empty state with icon, title, description, and action
 * - Accessible ARIA roles (grid, columnheader, aria-sort, aria-selected)
 * - Optional footer slot for Pagination
 *
 * @example
 * // Minimal
 * <DataGrid
 *   columns={columns}
 *   data={leads}
 *   getRowKey={(r) => r._id}
 *   onRowClick={(r) => navigate(`/leads/${r._id}`)}
 *   loading={isLoading}
 *   emptyTitle="No leads found"
 *   emptyDescription="Try adjusting your filters."
 * />
 *
 * @example
 * // With selection + server-side sort
 * <DataGrid
 *   columns={columns}
 *   data={leads}
 *   getRowKey={(r) => r._id}
 *   selectable
 *   selectedKeys={selectedIds}
 *   onSelectionChange={setSelectedIds}
 *   sort={sort}
 *   onSortChange={setSort}
 *   footer={<Pagination page={page} totalPages={totalPages} onChange={setPage} />}
 * />
 */
function DataGrid<T>({
    columns,
    data,
    loading,
    skeletonRows = 6,
    emptyIcon,
    emptyTitle = 'No results found',
    emptyDescription,
    emptyAction,
    getRowKey,
    onRowClick,
    selectable,
    selectedKeys,
    onSelectionChange,
    sort: controlledSort,
    onSortChange,
    footer,
    className,
    tableClassName,
}: DataGridProps<T>) {
    // Uncontrolled internal sort (used when onSortChange is not provided)
    const [internalSort, setInternalSort] = useState<SortState | null>(null);
    const activeSort = controlledSort ?? internalSort;

    const gridId = useId();

    // ---- Sort ----
    const handleSort = useCallback(
        (key: string) => {
            const next: SortState =
                activeSort?.key === key && activeSort.dir === 'asc'
                    ? { key, dir: 'desc' }
                    : { key, dir: 'asc' };
            if (onSortChange) {
                onSortChange(next);
            } else {
                setInternalSort(next);
            }
        },
        [activeSort, onSortChange]
    );

    // ---- Selection ----
    const allKeys = data.map((row, i) => getRowKey(row, i));
    const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys?.has(k));
    const someSelected = !allSelected && allKeys.some((k) => selectedKeys?.has(k));

    // Indeterminate checkbox ref
    const selectAllRef = useRef<HTMLInputElement>(null);
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;

    const toggleAll = () => {
        if (!onSelectionChange) return;
        onSelectionChange(allSelected ? new Set() : new Set(allKeys));
    };

    const toggleRow = (key: string | number) => {
        if (!onSelectionChange || !selectedKeys) return;
        const next = new Set(selectedKeys);
        if (next.has(key)) next.delete(key); else next.add(key);
        onSelectionChange(next);
    };

    const colSpan = columns.length + (selectable ? 1 : 0);

    return (
        <div
            className={cn(
                'overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
                className
            )}
        >
            <div className="overflow-x-auto">
                <Table
                    className={tableClassName}
                    role="grid"
                    aria-label="Data grid"
                    aria-rowcount={loading ? undefined : data.length}
                    aria-busy={loading}
                >
                    {/* ---- Head ---- */}
                    <TableHead>
                        <TableRow>
                            {selectable && (
                                <TableHeadCell className="w-10" role="columnheader">
                                    <input
                                        ref={selectAllRef}
                                        type="checkbox"
                                        id={`${gridId}-select-all`}
                                        checked={allSelected}
                                        onChange={toggleAll}
                                        aria-label="Select all rows"
                                        disabled={loading || data.length === 0}
                                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
                                    />
                                </TableHeadCell>
                            )}

                            {columns.map((col) => {
                                const isActiveSort = activeSort?.key === col.key;
                                return (
                                    <TableHeadCell
                                        key={col.key}
                                        role="columnheader"
                                        style={{ width: col.width }}
                                        aria-sort={
                                            col.sortable
                                                ? isActiveSort
                                                    ? activeSort!.dir === 'asc'
                                                        ? 'ascending'
                                                        : 'descending'
                                                    : 'none'
                                                : undefined
                                        }
                                        onClick={col.sortable ? () => handleSort(col.key) : undefined}
                                        className={cn(
                                            col.align === 'right' && 'text-right',
                                            col.align === 'center' && 'text-center',
                                            col.sortable &&
                                                'cursor-pointer select-none hover:bg-slate-100/70 active:bg-slate-100',
                                            col.className
                                        )}
                                    >
                                        {col.sortable ? (
                                            <span className="inline-flex items-center gap-1.5">
                                                {col.header}
                                                <SortIcon
                                                    active={isActiveSort}
                                                    dir={activeSort?.dir}
                                                />
                                            </span>
                                        ) : (
                                            col.header
                                        )}
                                    </TableHeadCell>
                                );
                            })}
                        </TableRow>
                    </TableHead>

                    {/* ---- Body ---- */}
                    <TableBody>
                        {/* Loading state */}
                        {loading &&
                            Array.from({ length: skeletonRows }).map((_, i) => (
                                <SkeletonRow
                                    key={i}
                                    colCount={columns.length}
                                    hasCheckbox={!!selectable}
                                />
                            ))}

                        {/* Empty state */}
                        {!loading && data.length === 0 && (
                            <tr role="row">
                                <td
                                    colSpan={colSpan}
                                    role="gridcell"
                                    className="p-0"
                                >
                                    <EmptyState
                                        icon={emptyIcon}
                                        title={emptyTitle}
                                        description={emptyDescription}
                                        action={emptyAction}
                                        className="rounded-none border-0 shadow-none"
                                    />
                                </td>
                            </tr>
                        )}

                        {/* Data rows */}
                        {!loading &&
                            data.map((row, index) => {
                                const key = getRowKey(row, index);
                                const isSelected = selectedKeys?.has(key) ?? false;
                                return (
                                    <TableRow
                                        key={key}
                                        role="row"
                                        tabIndex={onRowClick ? 0 : undefined}
                                        aria-selected={selectable ? isSelected : undefined}
                                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                                        onKeyDown={
                                            onRowClick
                                                ? (e) => {
                                                      if (e.key === 'Enter' || e.key === ' ') {
                                                          e.preventDefault();
                                                          onRowClick(row);
                                                      }
                                                  }
                                                : undefined
                                        }
                                        className={cn(
                                            onRowClick &&
                                                'cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none',
                                            isSelected && 'bg-brand-50/60 hover:bg-brand-50/80'
                                        )}
                                    >
                                        {selectable && (
                                            <TableCell
                                                role="gridcell"
                                                className="w-10"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleRow(key)}
                                                    aria-label={`Select row ${index + 1}`}
                                                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-500"
                                                />
                                            </TableCell>
                                        )}

                                        {columns.map((col) => (
                                            <TableCell
                                                key={col.key}
                                                role="gridcell"
                                                className={cn(
                                                    col.align === 'right' && 'text-right',
                                                    col.align === 'center' && 'text-center',
                                                    col.className
                                                )}
                                            >
                                                {col.cell(row, index)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })}
                    </TableBody>
                </Table>
            </div>

            {/* Footer slot — Pagination, bulk action bar, etc. */}
            {footer && (
                <div className="border-t border-slate-200 bg-white">
                    {footer}
                </div>
            )}
        </div>
    );
}

export default DataGrid;
