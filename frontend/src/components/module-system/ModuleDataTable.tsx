import { ReactNode } from 'react';
import ModuleEmptyState from './ModuleEmptyState';

export type SortOrder = 'asc' | 'desc';

export type ModuleColumnDef<T> = {
    id: string;
    header: string;
    accessor?: keyof T;
    cell?: (row: T) => ReactNode;
    className?: string;
    align?: 'left' | 'right' | 'center';
    sortable?: boolean;
    width?: string;
};

interface ModuleDataTableProps<T> {
    rows: T[];
    columns: ModuleColumnDef<T>[];
    rowKey: (row: T) => string;
    loading?: boolean;
    error?: string | null;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyIcon?: ReactNode;
    emptyAction?: ReactNode;
    onRetry?: () => void;
    tableTitle?: string;
    tableBadge?: string;
    page?: number;
    totalPages?: number;
    totalItems?: number;
    onPageChange?: (page: number) => void;
    sortBy?: string;
    sortOrder?: SortOrder;
    onSortChange?: (sortBy: string, order: SortOrder) => void;
    onRowClick?: (row: T) => void;
    selectable?: boolean;
    selectedKeys?: Set<string>;
    onSelectChange?: (keys: Set<string>) => void;
}

const ModuleDataTable = <T,>({
    rows,
    columns,
    rowKey,
    loading,
    error,
    emptyTitle = 'No results found',
    emptyDescription = 'Try adjusting your filters or search.',
    emptyIcon,
    emptyAction,
    onRetry,
    tableTitle,
    tableBadge,
    page = 1,
    totalPages = 1,
    totalItems = 0,
    onPageChange,
    sortBy,
    sortOrder = 'desc',
    onSortChange,
    onRowClick,
    selectable = false,
    selectedKeys,
    onSelectChange,
}: ModuleDataTableProps<T>) => {
    const handleSort = (column: ModuleColumnDef<T>) => {
        if (!column.sortable || !onSortChange) return;
        const nextOrder: SortOrder = sortBy === column.id && sortOrder === 'asc' ? 'desc' : 'asc';
        onSortChange(column.id, nextOrder);
    };

    const renderCell = (row: T, column: ModuleColumnDef<T>) => {
        if (column.cell) return column.cell(row);
        if (column.accessor) {
            const value = row[column.accessor];
            return typeof value === 'string' || typeof value === 'number' ? value : '-';
        }
        return '-';
    };

    const allSelected = rows.length > 0 && selectedKeys?.size === rows.length;

    const toggleSelectAll = () => {
        if (!onSelectChange) return;
        if (allSelected) {
            onSelectChange(new Set());
        } else {
            onSelectChange(new Set(rows.map(rowKey)));
        }
    };

    const toggleSelect = (key: string) => {
        if (!onSelectChange || !selectedKeys) return;
        const next = new Set(selectedKeys);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        onSelectChange(next);
    };

    const showPagination = totalPages > 1 || totalItems > rows.length;
    const contentColSpan = columns.length + (selectable ? 1 : 0);
    const mobilePrimaryColumn = columns.find((column) => column.id !== 'actions') ?? columns[0];
    const mobileActionColumn = columns.find((column) => column.id === 'actions' || column.header === '');
    const mobileDetailColumns = columns.filter(
        (column) => column !== mobilePrimaryColumn && column !== mobileActionColumn
    );

    const pageNumbers = (): (number | '...')[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | '...')[] = [1];
        if (page > 3) pages.push('...');
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
            pages.push(i);
        }
        if (page < totalPages - 2) pages.push('...');
        pages.push(totalPages);
        return pages;
    };

    const renderEmptyOrErrorState = () => {
        if (error) {
            return (
                <ModuleEmptyState
                    title="Unable to load records"
                    description={error}
                    action={onRetry ? (
                        <button className="mod-btn mod-btn--primary mod-btn--sm" onClick={onRetry}>
                            Retry
                        </button>
                    ) : undefined}
                />
            );
        }

        return (
            <ModuleEmptyState
                icon={emptyIcon}
                title={emptyTitle}
                description={emptyDescription}
                action={emptyAction}
            />
        );
    };

    return (
        <div className="mod-table-container mod-animate-in" style={{ animationDelay: '180ms' }}>
            {(tableTitle || tableBadge) && (
                <div className="mod-table-container__header">
                    <div className="mod-table-container__title">
                        <span className="mod-table-container__title-dot" />
                        {tableTitle || 'Records'}
                    </div>
                    {tableBadge && (
                        <div className="mod-table-container__badge">{tableBadge}</div>
                    )}
                </div>
            )}

            <div className="mod-table-scroll" style={{ minHeight: rows.length > 0 ? '300px' : 'auto', paddingBottom: '20px' }}>
                <table className="mod-table">
                    <thead>
                        <tr>
                            {selectable && (
                                <th style={{ width: 44, paddingLeft: 16 }}>
                                    <input
                                        type="checkbox"
                                        className="mod-table__checkbox"
                                        checked={allSelected}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                            )}
                            {columns.map((col) => (
                                <th
                                    key={col.id}
                                    className={col.align === 'right' ? 'mod-table--right' : undefined}
                                    style={col.width ? { width: col.width } : undefined}
                                >
                                    {col.sortable ? (
                                        <button
                                            type="button"
                                            className="mod-table__sort-btn"
                                            onClick={() => handleSort(col)}
                                        >
                                            {col.header}
                                            {sortBy === col.id && (
                                                <span style={{ color: 'var(--mod-primary)', fontSize: 11 }}>
                                                    {sortOrder === 'asc' ? '^' : 'v'}
                                                </span>
                                            )}
                                        </button>
                                    ) : (
                                        col.header
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, idx) => (
                                <tr key={`skeleton-${idx}`}>
                                    {selectable && (
                                        <td style={{ paddingLeft: 16 }}>
                                            <div className="mod-table__skeleton" style={{ width: 16, height: 16, borderRadius: 4 }} />
                                        </td>
                                    )}
                                    {columns.map((col) => (
                                        <td key={col.id}>
                                            <div className="mod-table__skeleton" style={{ width: `${55 + Math.random() * 30}%` }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : error ? (
                            <tr>
                                <td colSpan={contentColSpan} style={{ textAlign: 'center', padding: '48px 24px' }}>
                                    {renderEmptyOrErrorState()}
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={contentColSpan}>
                                    {renderEmptyOrErrorState()}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => {
                                const key = rowKey(row);
                                return (
                                    <tr
                                        key={key}
                                        onClick={() => onRowClick?.(row)}
                                        style={onRowClick ? { cursor: 'pointer' } : undefined}
                                    >
                                        {selectable && (
                                            <td style={{ paddingLeft: 16 }} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="mod-table__checkbox"
                                                    checked={selectedKeys?.has(key) ?? false}
                                                    onChange={() => toggleSelect(key)}
                                                />
                                            </td>
                                        )}
                                        {columns.map((col) => (
                                            <td
                                                key={col.id}
                                                className={col.align === 'right' ? 'mod-table--right' : undefined}
                                            >
                                                {renderCell(row, col)}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mod-table-cards">
                {loading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                        <div key={`card-skeleton-${idx}`} className="mod-table-card mod-table-card--skeleton">
                            <div className="mod-table-card__header">
                                <div className="mod-table__skeleton" style={{ width: '52%', height: 18 }} />
                                <div className="mod-table__skeleton" style={{ width: 72, height: 28 }} />
                            </div>
                            <div className="mod-table-card__grid">
                                {Array.from({ length: Math.min(3, Math.max(1, mobileDetailColumns.length || 2)) }).map((__, detailIdx) => (
                                    <div key={`card-skeleton-detail-${detailIdx}`} className="mod-table-card__field">
                                        <div className="mod-table__skeleton" style={{ width: '38%', height: 10 }} />
                                        <div className="mod-table__skeleton" style={{ width: `${58 + Math.random() * 22}%`, height: 14 }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : error || rows.length === 0 ? (
                    <div className="mod-table-cards__state">
                        {renderEmptyOrErrorState()}
                    </div>
                ) : (
                    rows.map((row) => {
                        const key = rowKey(row);
                        return (
                            <article
                                key={`card-${key}`}
                                className={`mod-table-card${onRowClick ? ' mod-table-card--interactive' : ''}`}
                                onClick={() => onRowClick?.(row)}
                            >
                                <div className="mod-table-card__header">
                                    <div className="mod-table-card__title-group">
                                        {selectable && (
                                            <div className="mod-table-card__check" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="mod-table__checkbox"
                                                    checked={selectedKeys?.has(key) ?? false}
                                                    onChange={() => toggleSelect(key)}
                                                />
                                            </div>
                                        )}
                                        <div className="mod-table-card__title-content">
                                            <div className="mod-table-card__label">
                                                {mobilePrimaryColumn?.header || 'Record'}
                                            </div>
                                            <div className="mod-table-card__title">
                                                {mobilePrimaryColumn ? renderCell(row, mobilePrimaryColumn) : '-'}
                                            </div>
                                        </div>
                                    </div>
                                    {mobileActionColumn && (
                                        <div className="mod-table-card__actions" onClick={(e) => e.stopPropagation()}>
                                            {renderCell(row, mobileActionColumn)}
                                        </div>
                                    )}
                                </div>

                                {mobileDetailColumns.length > 0 && (
                                    <div className="mod-table-card__grid">
                                        {mobileDetailColumns.map((column) => (
                                            <div key={`${key}-${column.id}`} className="mod-table-card__field">
                                                <div className="mod-table-card__label">
                                                    {column.header || column.id}
                                                </div>
                                                <div className={`mod-table-card__value${column.align === 'right' ? ' mod-table-card__value--right' : ''}`}>
                                                    {renderCell(row, column)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>
                        );
                    })
                )}
            </div>

            {showPagination && !loading && (
                <div className="mod-pagination">
                    <div className="mod-pagination__info">
                        Showing <strong>{(page - 1) * Math.ceil(totalItems / totalPages || 20) + 1}</strong>
                        {' '}to{' '}
                        <strong>{Math.min(page * Math.ceil(totalItems / totalPages || 20), totalItems)}</strong>
                        {' '}of{' '}
                        <strong>{totalItems}</strong> results
                    </div>
                    <div className="mod-pagination__controls">
                        <button
                            className="mod-pagination__btn"
                            disabled={page <= 1}
                            onClick={() => onPageChange?.(page - 1)}
                        >
                            {'<'} Prev
                        </button>
                        {pageNumbers().map((p, i) =>
                            p === '...' ? (
                                <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--mod-text-subtle)' }}>...</span>
                            ) : (
                                <button
                                    key={p}
                                    className={`mod-pagination__btn ${page === p ? 'is-active' : ''}`}
                                    onClick={() => onPageChange?.(p)}
                                >
                                    {p}
                                </button>
                            )
                        )}
                        <button
                            className="mod-pagination__btn"
                            disabled={page >= totalPages}
                            onClick={() => onPageChange?.(page + 1)}
                        >
                            Next {'>'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModuleDataTable;
