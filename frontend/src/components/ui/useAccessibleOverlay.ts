import { RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

type UseAccessibleOverlayOptions = {
    open: boolean;
    onClose: () => void;
    containerRef: RefObject<HTMLElement | null>;
};

export const useAccessibleOverlay = ({
    open,
    onClose,
    containerRef,
}: UseAccessibleOverlayOptions) => {
    const previousActiveElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        previousActiveElementRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        const { body } = document;
        const previousOverflow = body.style.overflow;
        body.style.overflow = 'hidden';

        const focusables = Array.from(
            containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
        ).filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true');

        if (focusables.length > 0) {
            focusables[0].focus();
        } else {
            containerRef.current?.focus();
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            const nodes = Array.from(
                containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
            ).filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true');

            if (nodes.length === 0) {
                event.preventDefault();
                containerRef.current?.focus();
                return;
            }

            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            const activeElement = document.activeElement;

            if (event.shiftKey && activeElement === first) {
                event.preventDefault();
                last.focus();
                return;
            }

            if (!event.shiftKey && activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            body.style.overflow = previousOverflow;
            previousActiveElementRef.current?.focus();
        };
    }, [containerRef, onClose, open]);
};
