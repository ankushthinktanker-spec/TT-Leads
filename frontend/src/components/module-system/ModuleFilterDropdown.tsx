import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFloatingMenu } from '../ui/useFloatingMenu';

export interface ModuleFilterOption {
    label: string;
    value: string;
}

interface ModuleFilterDropdownProps {
    value: string;
    options: ModuleFilterOption[];
    onChange: (value: string) => void;
    ariaLabel?: string;
    fullWidth?: boolean;
    className?: string;
    triggerClassName?: string;
    disabled?: boolean;
}

const ModuleFilterDropdown = ({
    value,
    options,
    onChange,
    ariaLabel,
    fullWidth = false,
    className,
    triggerClassName,
    disabled = false,
}: ModuleFilterDropdownProps) => {
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const listboxId = useId();
    const { floatingStyle, placement, updatePosition } = useFloatingMenu({
        open,
        triggerRef,
        menuRef,
        gap: 6,
        padding: 8,
        maxHeight: 320,
    });

    const selectedIndex = useMemo(() => {
        const matchIndex = options.findIndex((option) => option.value === value);
        return matchIndex >= 0 ? matchIndex : 0;
    }, [options, value]);

    const selectedOption = options[selectedIndex] ?? options[0];

    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedTrigger = triggerRef.current?.contains(target);
            const clickedMenu = menuRef.current?.contains(target);
            if (!clickedTrigger && !clickedMenu) {
                setOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                triggerRef.current?.focus();
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }, [open, selectedIndex]);

    useEffect(() => {
        if (!open) {
            return;
        }

        optionRefs.current[highlightedIndex]?.focus();
    }, [highlightedIndex, open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            updatePosition();
            optionRefs.current[highlightedIndex]?.focus();
        });

        return () => window.cancelAnimationFrame(frame);
    }, [highlightedIndex, open, updatePosition]);

    const selectValue = (nextValue: string) => {
        onChange(nextValue);
        setOpen(false);
        triggerRef.current?.focus();
    };

    const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (disabled) {
            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : options.length - 1);
        }
    };

    const handleOptionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((index + 1) % options.length);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((index - 1 + options.length) % options.length);
            return;
        }

        if (event.key === 'Home') {
            event.preventDefault();
            setHighlightedIndex(0);
            return;
        }

        if (event.key === 'End') {
            event.preventDefault();
            setHighlightedIndex(options.length - 1);
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectValue(options[index].value);
            return;
        }

        if (event.key === 'Tab') {
            setOpen(false);
        }
    };

    return (
        <div
            ref={containerRef}
            className={cn('mod-dropdown', fullWidth && 'mod-dropdown--full', className)}
        >
            <button
                ref={triggerRef}
                type="button"
                    aria-label={ariaLabel ?? 'Filter options'}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listboxId : undefined}
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
                onKeyDown={handleTriggerKeyDown}
                className={cn(
                    'mod-toolbar__select mod-dropdown__trigger',
                    open && 'is-open',
                    triggerClassName
                )}
            >
                <span className="mod-dropdown__trigger-label">{selectedOption?.label ?? ''}</span>
                <ChevronDown size={16} className={cn('mod-dropdown__chevron', open && 'is-open')} />
            </button>

            {open && typeof document !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    className="mod-dropdown__menu"
                    data-placement={placement}
                    style={floatingStyle}
                    role="presentation"
                >
                    <div
                        id={listboxId}
                        role="listbox"
                        aria-label={ariaLabel ?? 'Filter options'}
                        className="mod-dropdown__list"
                    >
                        {options.map((option, index) => {
                            const selected = option.value === value;
                            return (
                                <button
                                    key={`${option.value}-${option.label}`}
                                    ref={(node) => {
                                        optionRefs.current[index] = node;
                                    }}
                                    id={`${listboxId}-${index}`}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    tabIndex={index === highlightedIndex ? 0 : -1}
                                    className={cn(
                                        'mod-dropdown__option',
                                        selected && 'is-selected',
                                        highlightedIndex === index && 'is-highlighted'
                                    )}
                                    onClick={() => selectValue(option.value)}
                                    onKeyDown={(event) => handleOptionKeyDown(event, index)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    <span className="mod-dropdown__option-label">{option.label}</span>
                                    {selected && <Check size={15} className="mod-dropdown__option-check" />}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ModuleFilterDropdown;
