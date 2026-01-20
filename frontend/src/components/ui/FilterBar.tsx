import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface FilterBarProps {
    children: ReactNode;
    className?: string;
}

const FilterBar = ({ children, className }: FilterBarProps) => {
    return <div className={cn('filter-bar', className)}>{children}</div>;
};

export default FilterBar;
