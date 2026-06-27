import { cn } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProgressVariant = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
export type ProgressSize   = 'xs' | 'sm' | 'md';

export interface ProgressBarProps {
    /** Current value (0 – max) */
    value: number;
    /** Maximum value (default 100) */
    max?: number;
    variant?: ProgressVariant;
    size?: ProgressSize;
    /** Accessible label — shown above the bar when provided */
    label?: string;
    /** Show percentage text to the right of the label */
    showValue?: boolean;
    /** Animate the fill on mount */
    animate?: boolean;
    className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRACK_HEIGHT: Record<ProgressSize, string> = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
};

const FILL_COLOR: Record<ProgressVariant, string> = {
    brand:   'bg-brand-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-400',
    danger:  'bg-rose-500',
    neutral: 'bg-slate-400',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Accessible progress bar with variant colours and optional label.
 * Use `variant` to convey semantic meaning (pipeline stage health, etc.).
 *
 * @example
 * // Simple percentage
 * <ProgressBar value={72} showValue label="Deal probability" />
 *
 * @example
 * // Danger state for overdue items
 * <ProgressBar value={overdue} max={total} variant="danger" size="xs" />
 */
const ProgressBar = ({
    value,
    max = 100,
    variant = 'brand',
    size = 'sm',
    label,
    showValue,
    animate = true,
    className,
}: ProgressBarProps) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className={cn('w-full', className)}>
            {(label || showValue) && (
                <div className="mb-1.5 flex items-center justify-between gap-2">
                    {label && (
                        <span className="text-xs font-medium text-slate-600">{label}</span>
                    )}
                    {showValue && (
                        <span className="text-xs font-semibold tabular-nums text-slate-700">
                            {Math.round(pct)}%
                        </span>
                    )}
                </div>
            )}

            <div
                role="progressbar"
                aria-valuenow={Math.round(value)}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-label={label}
                className={cn(
                    'w-full overflow-hidden rounded-full bg-slate-200',
                    TRACK_HEIGHT[size]
                )}
            >
                <div
                    className={cn(
                        'h-full rounded-full',
                        animate && 'transition-all duration-500 ease-out',
                        FILL_COLOR[variant]
                    )}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

export default ProgressBar;
