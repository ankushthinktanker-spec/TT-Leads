import { ReactNode, useState } from 'react';
import { Search, Filter, X, RotateCcw } from 'lucide-react';

export interface ActiveFilter {
    key: string;
    label: string;
    onRemove: () => void;
}

interface ModuleToolbarProps {
    searchValue?: string;
    searchPlaceholder?: string;
    onSearchChange?: (value: string) => void;
    /** Quick filter controls rendered inline */
    children?: ReactNode;
    /** Filter drawer content */
    filterContent?: ReactNode;
    /** Currently active filters as removable chips */
    activeFilters?: ActiveFilter[];
    onClearAllFilters?: () => void;
    /** Record count display */
    totalCount?: number;
    countLabel?: string;
}

const ModuleToolbar = ({
    searchValue,
    searchPlaceholder = 'Search...',
    onSearchChange,
    children,
    filterContent,
    activeFilters = [],
    onClearAllFilters,
    totalCount,
    countLabel = 'records',
}: ModuleToolbarProps) => {
    const [filterOpen, setFilterOpen] = useState(false);

    return (
        <>
            <div className="mod-toolbar mod-animate-in" style={{ animationDelay: '60ms' }}>
                {onSearchChange && (
                    <div className="mod-toolbar__search">
                        <Search size={15} className="mod-toolbar__search-icon" />
                        <input
                            type="text"
                            value={searchValue || ''}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="mod-toolbar__search-input"
                        />
                    </div>
                )}

                {(children || filterContent) && (
                    <div className="mod-toolbar__divider" />
                )}

                <div className="mod-toolbar__group">
                    {children}

                    {filterContent && (
                        <button
                            type="button"
                            onClick={() => setFilterOpen(true)}
                            className={`mod-toolbar__btn ${activeFilters.length > 0 ? 'is-active' : ''}`}
                        >
                            <Filter size={14} />
                            Filters
                            {activeFilters.length > 0 && (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: 'var(--mod-primary)',
                                    color: 'white',
                                    fontSize: 10,
                                    fontWeight: 700,
                                }}>{activeFilters.length}</span>
                            )}
                        </button>
                    )}
                </div>

                <div className="mod-toolbar__spacer" />

                {totalCount !== undefined && (
                    <div className="mod-toolbar__count">
                        <strong>{totalCount}</strong> {countLabel}
                    </div>
                )}

                {/* Active filter chips */}
                {activeFilters.length > 0 && (
                    <div className="mod-toolbar__chips">
                        {activeFilters.map((filter) => (
                            <span key={filter.key} className="mod-filter-chip">
                                {filter.label}
                                <button
                                    className="mod-filter-chip__remove"
                                    onClick={filter.onRemove}
                                    aria-label={`Remove filter: ${filter.label}`}
                                >
                                    <X size={11} />
                                </button>
                            </span>
                        ))}
                        {onClearAllFilters && (
                            <button
                                className="mod-toolbar__clear-btn"
                                onClick={onClearAllFilters}
                            >
                                <RotateCcw size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                Clear all
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Filter Panel */}
            {filterOpen && filterContent && (
                <div className="mod-filter-panel">
                    <div
                        className="mod-filter-panel__backdrop"
                        onClick={() => setFilterOpen(false)}
                    />
                    <div className="mod-filter-panel__body">
                        <div className="mod-filter-panel__header">
                            <h3 className="mod-filter-panel__title">Filters</h3>
                            <button
                                className="mod-filter-panel__close"
                                onClick={() => setFilterOpen(false)}
                                aria-label="Close filters"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="mod-filter-panel__content">
                            {filterContent}
                        </div>
                        <div className="mod-filter-panel__footer">
                            <button
                                className="mod-btn mod-btn--ghost"
                                onClick={() => {
                                    onClearAllFilters?.();
                                    setFilterOpen(false);
                                }}
                            >
                                <RotateCcw size={14} />
                                Reset
                            </button>
                            <button
                                className="mod-btn mod-btn--primary"
                                onClick={() => setFilterOpen(false)}
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ModuleToolbar;
