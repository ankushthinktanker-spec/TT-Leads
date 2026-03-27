import { ReactNode } from 'react';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';

export type SortOrder = 'asc' | 'desc';

export type ColumnDef<T> = {
    id: string;
    header: string;
    accessor?: keyof T;
    cell?: (row: T) => ReactNode;
    className?: string;
    align?: 'left' | 'right' | 'center';
    sortable?: boolean;
};

interface DataTableProps<T> {
    rows: T[];
    columns: ColumnDef<T>[];
    rowKey: (row: T) => string;
    loading?: boolean;
    error?: string | null;
    emptyMessage?: string;
    onRetry?: () => void;
    page?: number;
    totalPages?: number;
    totalItems?: number;
    onPageChange?: (page: number) => void;
    sortBy?: string;
    sortOrder?: SortOrder;
    onSortChange?: (sortBy: string, order: SortOrder) => void;
    framed?: boolean;
}

const DataTable = <T,>({
    rows,
    columns,
    rowKey,
    loading,
    error,
    emptyMessage,
    onRetry,
    page = 1,
    totalPages = 1,
    totalItems = 0,
    onPageChange,
    sortBy,
    sortOrder = 'desc',
    onSortChange,
    framed = true
}: DataTableProps<T>) => {
    const handleSort = (column: ColumnDef<T>) => {
        if (!column.sortable || !onSortChange) return;
        const nextOrder: SortOrder = sortBy === column.id && sortOrder === 'asc' ? 'desc' : 'asc';
        onSortChange(column.id, nextOrder);
    };

    const renderCell = (row: T, column: ColumnDef<T>) => {
        if (column.cell) return column.cell(row);
        if (column.accessor) {
            const value = row[column.accessor];
            return typeof value === 'string' || typeof value === 'number' ? value : '-';
        }
        return '-';
    };

    const showFooter = totalPages > 1 || totalItems > rows.length;

    const content = (
        <>
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 md:px-5">
                <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[#335CFF] shadow-[0_0_10px_rgba(51,92,255,0.28)]" />
                    <p className="text-sm font-bold tracking-tight text-slate-950">
                        <span className="text-[#335CFF]">{totalItems}</span> records
                    </p>
                </div>
                <p className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    CRM data view
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-[1]">
                        <tr className="bg-[linear-gradient(180deg,#fcfdff_0%,#f8fafc_100%)]">
                            {columns.map((column) => (
                                <th
                                    key={column.id}
                                    className={`px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 md:px-4 ${column.align === 'right' ? 'text-right' : ''} ${column.className || ''}`}
                                >
                                    <button
                                        type="button"
                                        className={`inline-flex items-center gap-1 ${column.sortable ? 'cursor-pointer hover:text-[#335CFF]' : 'cursor-default'}`}
                                        onClick={() => handleSort(column)}
                                        disabled={!column.sortable}
                                    >
                                        {column.header}
                                        {column.sortable && sortBy === column.id && (
                                            <span className="text-xs text-[#335CFF]">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, idx) => (
                                <tr key={`skeleton-${idx}`}>
                                    {columns.map((column) => (
                                        <td key={column.id} className="px-3 py-3 md:px-4">
                                            <Skeleton className="h-4 w-3/4 rounded" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : error ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-16 text-center">
                                    <div className="space-y-4">
                                        <p className="text-sm font-semibold text-rose-600">{error}</p>
                                        {onRetry && (
                                            <button
                                                onClick={onRetry}
                                                className="rounded-xl bg-slate-900 px-6 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-all hover:bg-[#335CFF]"
                                            >
                                                Retry
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-16">
                                    <EmptyState
                                        title="No results found"
                                        description={emptyMessage || 'Try adjusting your filters.'}
                                    />
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={rowKey(row)} className="group transition-all duration-150 hover:bg-[#F8FAFF]">
                                    {columns.map((column) => (
                                        <td
                                            key={column.id}
                                            className={`px-3 py-3 text-sm font-medium text-slate-700 md:px-4 ${column.align === 'right' ? 'text-right' : ''} ${column.className || ''}`}
                                        >
                                            {renderCell(row, column)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showFooter && (
                <div className="flex items-center justify-between border-t border-slate-200 bg-[linear-gradient(180deg,#fcfdff_0%,#f8fafc_100%)] px-4 py-3 md:px-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Showing <span className="text-[#335CFF]">{rows.length}</span> of {totalItems} records
                    </div>
                    <div className="flex gap-2.5">
                        <button
                            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700 transition-all hover:border-[#BED0FF] hover:text-[#335CFF] disabled:cursor-not-allowed disabled:opacity-30"
                            disabled={page <= 1}
                            onClick={() => onPageChange?.(page - 1)}
                        >
                            Previous
                        </button>
                        <button
                            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700 transition-all hover:border-[#BED0FF] hover:text-[#335CFF] disabled:cursor-not-allowed disabled:opacity-30"
                            disabled={page >= totalPages}
                            onClick={() => onPageChange?.(page + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="relative">
            {framed ? (
                <div className="workspace-sheet overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] tt-animate-fade-up" style={{ animationDelay: '200ms' }}>
                    {content}
                </div>
            ) : (
                <div className="tt-animate-fade-up" style={{ animationDelay: '200ms' }}>
                    {content}
                </div>
            )}
        </div>
    );
};

export default DataTable;
