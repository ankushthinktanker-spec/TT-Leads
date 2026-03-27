import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FilterDrawerProps {
    title?: string;
    open: boolean;
    onClose: () => void;
    onReset?: () => void;
    onApply?: () => void;
    children: ReactNode;
    className?: string;
}

const FilterDrawer = ({ title = 'Filters', open, onClose, onReset, onApply, children, className }: FilterDrawerProps) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className={cn('absolute right-0 top-0 h-full w-full max-w-md drawer-panel flex flex-col', className)}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                    <button type="button" className="icon-button" onClick={onClose} aria-label="Close filter drawer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {children}
                </div>
                <div className="border-t border-slate-200 px-5 py-4 flex items-center justify-between">
                    <button type="button" className="btn btn-outline" onClick={onReset}>
                        Reset
                    </button>
                    <button type="button" className="btn btn-primary" onClick={onApply}>
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FilterDrawer;

