import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFloatingMenu } from './useFloatingMenu';

interface StatusSelectProps {
    value: string;
    options: readonly string[] | string[];
    onChange: (value: string) => void;
    getBadgeClasses: (status: string) => string;
    disabled?: boolean;
    className?: string;
}

const StatusSelect = ({
    value,
    options,
    onChange,
    getBadgeClasses,
    disabled,
    className
}: StatusSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { floatingStyle, placement, updatePosition } = useFloatingMenu({
        open: isOpen,
        triggerRef,
        menuRef,
        gap: 6,
        minWidth: 192,
        maxHeight: 240,
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedTrigger = triggerRef.current?.contains(target);
            const clickedMenu = menuRef.current?.contains(target);
            if (!clickedTrigger && !clickedMenu) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const frame = window.requestAnimationFrame(() => updatePosition());
        return () => window.cancelAnimationFrame(frame);
    }, [isOpen, updatePosition]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click if any
        if (!disabled) setIsOpen(!isOpen);
    };

    const handleSelect = (option: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div className={cn("relative inline-block text-left", className)} ref={containerRef}>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={handleToggle}
                className={cn(
                    "inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border border-transparent",
                    getBadgeClasses(value),
                    !disabled && "hover:ring-2 hover:ring-slate-200 hover:shadow-md active:scale-95 cursor-pointer min-w-[100px]",
                    disabled && "opacity-60 cursor-not-allowed min-w-[100px]"
                )}
            >
                <span className="truncate">{value}</span>
                {!disabled && <ChevronDown size={14} className={cn("transition-transform duration-200 text-current/60 flex-shrink-0", isOpen && "rotate-180")} />}
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    className="rounded-xl bg-[#fffaf4] border border-slate-200 shadow-[0_12px_30px_rgba(120,74,24,0.12)] overflow-hidden z-[9999] animate-in fade-in zoom-in duration-200"
                    data-placement={placement}
                    style={floatingStyle}
                >
                    <div className="py-1 max-h-60 overflow-y-auto">
                        {options.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={(e) => handleSelect(option, e)}
                                className={cn(
                                    "w-full text-left px-4 py-2.5 text-xs font-medium transition-colors flex items-center justify-between",
                                    value === option
                                        ? "bg-[#fbf2e7] text-slate-900"
                                        : "text-slate-600 hover:bg-[#fbf2e7] hover:text-slate-900"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", (getBadgeClasses(option).includes('bg-') ? getBadgeClasses(option).split(' ').find(c => c.startsWith('bg-')) : 'bg-slate-400'))} />
                                    {option}
                                </div>
                                {value === option && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default StatusSelect;

