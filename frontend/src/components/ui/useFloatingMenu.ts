import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

type Placement = 'top' | 'bottom';

type UseFloatingMenuOptions = {
    open: boolean;
    triggerRef: RefObject<HTMLElement | null>;
    menuRef: RefObject<HTMLElement | null>;
    gap?: number;
    minWidth?: number;
    preferredWidth?: number;
    padding?: number;
    maxHeight?: number;
};

type FloatingMenuState = {
    style: CSSProperties;
    placement: Placement;
};

const DEFAULT_STATE: FloatingMenuState = {
    style: {
        position: 'fixed',
        top: -9999,
        left: -9999,
        opacity: 0,
    },
    placement: 'bottom',
};

export const useFloatingMenu = ({
    open,
    triggerRef,
    menuRef,
    gap = 6,
    minWidth,
    preferredWidth,
    padding = 8,
    maxHeight = 320,
}: UseFloatingMenuOptions) => {
    const [state, setState] = useState<FloatingMenuState>(DEFAULT_STATE);

    const updatePosition = useCallback(() => {
        if (!open) {
            return;
        }

        const trigger = triggerRef.current;
        const menu = menuRef.current;

        if (!trigger || !menu) {
            return;
        }

        const triggerRect = trigger.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const measuredWidth = preferredWidth ?? Math.max(triggerRect.width, minWidth ?? 0);
        const width = Math.min(measuredWidth, Math.max(120, viewportWidth - padding * 2));

        const previousMaxHeight = menu.style.maxHeight;
        menu.style.maxHeight = `${maxHeight}px`;
        const menuRect = menu.getBoundingClientRect();
        const menuHeight = Math.min(menuRect.height || maxHeight, maxHeight);
        menu.style.maxHeight = previousMaxHeight;

        let left = triggerRect.left;
        if (left + width > viewportWidth - padding) {
            left = viewportWidth - width - padding;
        }
        if (left < padding) {
            left = padding;
        }

        const availableBelow = viewportHeight - triggerRect.bottom - padding;
        const availableAbove = triggerRect.top - padding;
        const shouldOpenAbove = availableBelow < Math.min(menuHeight, maxHeight) && availableAbove > availableBelow;
        const placement: Placement = shouldOpenAbove ? 'top' : 'bottom';

        let top = placement === 'bottom'
            ? triggerRect.bottom + gap
            : triggerRect.top - Math.min(menuHeight, maxHeight) - gap;

        const computedMaxHeight = placement === 'bottom'
            ? Math.max(120, availableBelow - gap)
            : Math.max(120, availableAbove - gap);

        if (placement === 'bottom' && top + Math.min(menuHeight, computedMaxHeight) > viewportHeight - padding) {
            top = Math.max(padding, viewportHeight - Math.min(menuHeight, computedMaxHeight) - padding);
        }

        if (placement === 'top' && top < padding) {
            top = padding;
        }

        setState({
            placement,
            style: {
                position: 'fixed',
                top,
                left,
                width,
                minWidth: width,
                maxHeight: Math.min(maxHeight, computedMaxHeight),
                zIndex: 9999,
            },
        });
    }, [gap, maxHeight, minWidth, open, preferredWidth, triggerRef, menuRef, padding]);

    useLayoutEffect(() => {
        updatePosition();
    }, [updatePosition]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleReposition = () => updatePosition();

        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);

        return () => {
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
        };
    }, [open, updatePosition]);

    return {
        floatingStyle: state.style,
        placement: state.placement,
        updatePosition,
    };
};
