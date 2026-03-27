import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface RowActionsProps {
    children: ReactNode;
    className?: string;
}

const RowActions = ({ children, className }: RowActionsProps) => {
    return (
        <div
            className={cn(
                "flex items-center justify-end gap-2 opacity-100 transition-opacity",
                // We handle the 'always visible' part by NOT having opacity-0
                // We keep justify-end as default for table row actions
                className
            )}
            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking actions
        >
            {children}
        </div>
    );
};

export default RowActions;
