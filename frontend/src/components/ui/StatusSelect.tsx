import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

            {isOpen && (
                <div className="absolute left-0 mt-2 w-48 rounded-xl bg-white border border-slate-200 shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="py-1 max-h-60 overflow-y-auto">
                        {options.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={(e) => handleSelect(option, e)}
                                className={cn(
                                    "w-full text-left px-4 py-2.5 text-xs font-medium transition-colors flex items-center justify-between",
                                    value === option
                                        ? "bg-slate-50 text-slate-900"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
                </div>
            )}
        </div>
    );
};

export default StatusSelect;
