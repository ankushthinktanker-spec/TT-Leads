import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface FilterBarProps {
    children: ReactNode;
    className?: string;
}

const FilterBar = ({ children, className }: FilterBarProps) => {
    return (
        <div className={cn('rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]', className)}>
            {children}
        </div>
    );
};

export default FilterBar;
