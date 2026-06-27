import { ReactNode, useId, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
    /** Tooltip text or rich content */
    content: ReactNode;
    children: ReactNode;
    placement?: TooltipPlacement;
    /** Milliseconds before tooltip appears (default 200) */
    delay?: number;
    className?: string;
    /** Render nothing when true */
    disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Placement geometry
// ---------------------------------------------------------------------------

const GAP = 8; // px between trigger edge and tooltip

function getPosition(
    rect: DOMRect,
    placement: TooltipPlacement
): { top: number; left: number } {
    switch (placement) {
        case 'top':    return { top: rect.top - GAP,              left: rect.left + rect.width / 2 };
        case 'bottom': return { top: rect.bottom + GAP,           left: rect.left + rect.width / 2 };
        case 'left':   return { top: rect.top + rect.height / 2,  left: rect.left - GAP };
        case 'right':  return { top: rect.top + rect.height / 2,  left: rect.right + GAP };
    }
}

const TRANSFORM_CLASSES: Record<TooltipPlacement, string> = {
    top:    '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left:   '-translate-x-full -translate-y-1/2',
    right:  '-translate-y-1/2',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Lightweight portal-based tooltip. Keyboard and mouse accessible.
 * Renders via a portal to avoid z-index / overflow clipping issues.
 *
 * @example
 * <Tooltip content="Delete lead" placement="top">
 *   <IconButton icon={<Trash2 size={16} />} aria-label="Delete" />
 * </Tooltip>
 */
const Tooltip = ({
    content,
    children,
    placement = 'top',
    delay = 200,
    className,
    disabled,
}: TooltipProps) => {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLSpanElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const tooltipId = useId();

    const show = useCallback(() => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            if (!triggerRef.current) return;
            setPos(getPosition(triggerRef.current.getBoundingClientRect(), placement));
            setVisible(true);
        }, delay);
    }, [delay, placement]);

    const hide = useCallback(() => {
        clearTimeout(timerRef.current);
        setVisible(false);
    }, []);

    // Dismiss on Escape
    useEffect(() => {
        if (!visible) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [visible, hide]);

    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    // Nothing to render if disabled or no content
    if (disabled || !content) return <>{children}</>;

    return (
        <>
            <span
                ref={triggerRef}
                aria-describedby={visible ? tooltipId : undefined}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
                className="inline-flex"
            >
                {children}
            </span>

            {visible &&
                createPortal(
                    <div
                        id={tooltipId}
                        role="tooltip"
                        style={{
                            position: 'fixed',
                            top: pos.top,
                            left: pos.left,
                            zIndex: 9999,
                        }}
                        className={cn(
                            'pointer-events-none max-w-[240px] rounded-lg border border-slate-800/20 bg-slate-900 px-2.5 py-1.5 text-xs font-medium leading-5 text-white shadow-lg',
                            TRANSFORM_CLASSES[placement],
                            className
                        )}
                    >
                        {content}
                    </div>,
                    document.body
                )}
        </>
    );
};

export default Tooltip;
