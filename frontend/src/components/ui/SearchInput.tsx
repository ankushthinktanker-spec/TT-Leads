import { forwardRef, useEffect, useRef, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Show spinner instead of search icon while loading */
    loading?: boolean;
    /** Debounce onChange by N ms (useful for API calls) */
    debounceMs?: number;
    className?: string;
    inputClassName?: string;
    autoFocus?: boolean;
    disabled?: boolean;
    /** Accessible label — defaults to placeholder */
    'aria-label'?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Controlled search input with optional debounce, loading indicator, and
 * accessible clear button. Maintains a local display value so the UI stays
 * responsive while the debounce timer runs.
 *
 * @example
 * // Instant (no debounce)
 * <SearchInput value={search} onChange={setSearch} placeholder="Search leads…" />
 *
 * @example
 * // Debounced API search
 * <SearchInput
 *   value={query}
 *   onChange={fetchResults}
 *   debounceMs={300}
 *   loading={isFetching}
 * />
 */
const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
    (
        {
            value,
            onChange,
            placeholder = 'Search…',
            loading,
            debounceMs,
            className,
            inputClassName,
            autoFocus,
            disabled,
            'aria-label': ariaLabel,
        },
        ref
    ) => {
        // Local state so the input stays responsive during debounce
        const [local, setLocal] = useState(value);
        const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

        // Keep local in sync when parent resets value (e.g. clearing filters)
        useEffect(() => {
            setLocal(value);
        }, [value]);

        const emit = (raw: string) => {
            if (!debounceMs) {
                onChange(raw);
                return;
            }
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => onChange(raw), debounceMs);
        };

        const handleChange = (raw: string) => {
            setLocal(raw);
            emit(raw);
        };

        const handleClear = () => {
            clearTimeout(timerRef.current);
            setLocal('');
            onChange('');
        };

        useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

        return (
            <div className={cn('relative flex items-center', className)}>
                {/* Left icon — spinner during loading */}
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 text-slate-400"
                >
                    {loading ? (
                        <Loader2 size={15} className="animate-spin" />
                    ) : (
                        <Search size={15} />
                    )}
                </span>

                <input
                    ref={ref}
                    type="search"
                    value={local}
                    autoFocus={autoFocus}
                    disabled={disabled}
                    placeholder={placeholder}
                    aria-label={ariaLabel ?? placeholder}
                    onChange={(e) => handleChange(e.target.value)}
                    // Remove browser's native clear button — we provide our own
                    className={cn(
                        'h-10 w-full rounded-xl border border-slate-200 bg-[#fffdf9] pl-9 pr-8',
                        'text-sm font-medium text-slate-800 shadow-[0_4px_12px_rgba(120,74,24,0.03)]',
                        'outline-none transition placeholder:text-slate-400',
                        'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        '[&::-webkit-search-cancel-button]:appearance-none',
                        inputClassName
                    )}
                />

                {/* Clear button — only visible when there's a value */}
                {local && !disabled && (
                    <button
                        type="button"
                        aria-label="Clear search"
                        onClick={handleClear}
                        className={cn(
                            'absolute right-2.5 flex h-5 w-5 items-center justify-center rounded-full',
                            'bg-slate-200/80 text-slate-500 transition',
                            'hover:bg-slate-300 hover:text-slate-700',
                            'focus:outline-none focus:ring-2 focus:ring-brand-500/30'
                        )}
                    >
                        <X size={11} />
                    </button>
                )}
            </div>
        );
    }
);

SearchInput.displayName = 'SearchInput';
export default SearchInput;
